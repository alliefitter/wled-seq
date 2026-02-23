from asyncio import run, sleep
from logging import getLogger
from random import shuffle
from threading import Event, Thread
from time import time
from typing import Any, Callable
from uuid import UUID

from httpx import AsyncClient, HTTPError

from lib.model.sequence import LedSequence, WledSequenceElement
from lib.model.wled import SegItem, WledState

logger = getLogger(__name__)


class SequenceThread(Thread):
    def __init__(self, event: Event, target: Callable):
        super().__init__()
        self.event = event
        self.target = target

    def run(self):
        while not self.event.is_set():
            self.target()


class Wled:
    thread: SequenceThread | None
    event: Event

    def __init__(self, host: str):
        self.host = host[:-1]
        self.thread = None
        self.previous_segment_set: UUID | None = None
        self.event = Event()

    async def execute(self, sequence: LedSequence, segment_set_id: UUID | None):
        await self.clear_thread_if_alive()
        if segment_set_id is None or segment_set_id != self.previous_segment_set:
            await self.clear_segments()

        self.previous_segment_set = segment_set_id
        if sequence.repeat:
            self.thread = SequenceThread(self.event, lambda: run(self.run_sequence(sequence)))
            self.thread.start()
        else:
            await self.run_sequence(sequence)

    async def clear_thread_if_alive(self):
        thread = self.thread
        self.kill()
        if thread and thread.is_alive():
            thread.join()
        else:
            await sleep(0.06)
        self.event.clear()

    async def clear_segments(self):
        async with AsyncClient(base_url=self.host) as client:
            response = await self._send_request("/json/state", "GET")
            body = WledState.model_validate_json(response.text)
            new_segments = WledState(
                seg=[
                    SegItem(id=0, start=0, stop=max(body.seg, key=lambda s: s.stop).stop),
                    *[SegItem(id=s.id, start=0, stop=0) for s in body.seg[1:]],
                ],
            )
            await self._send_request(
                "/json/state", "POST", new_segments.model_dump(mode="json", exclude_unset=True)
            )

    def kill(self):
        self.event.set()

    async def run_sequence(self, sequence: LedSequence):
        if sequence.random:
            shuffle(sequence.elements)

        for element in sequence.elements:
            if self.should_kill():
                break

            await self.set_leds(element)
            if element.sleep_time:
                await self.sleep(element.sleep_time)

    async def set_leds(self, element: WledSequenceElement) -> None:
        if not element.state:
            return
        await self._send_request(
            "/json/state",
            "POST",
            element.state.model_dump(mode="json", exclude_unset=True),
        )

    def should_kill(self) -> bool:
        return self.event.is_set()

    async def sleep(self, seconds: float):
        start = time()
        while time() - start < seconds:
            if self.should_kill():
                break

            await sleep(0.05)

    async def _send_request(self, path: str, method: str, json_data: dict[str, Any] | None = None):
        async with AsyncClient(base_url=self.host) as client:
            retry = True
            retries = 0
            while retry and retries < 5:
                try:
                    response = await client.request(
                        method,
                        f"{self.host}{path}",
                        json=json_data,
                        headers={"Content-Type": "application/json"},
                    )
                except HTTPError:
                    retry = True
                    retries += 1
                    logger.error(
                        "Retryable WLED Error",
                        extra={
                            "response_text": response.text,
                            "status_code": response.status_code,
                        },
                    )

                else:
                    retry = False

        if response.is_error:
            logger.error(
                "WLED Error",
                extra={
                    "response_text": response.text,
                    "status_code": response.status_code,
                },
            )

        return response
