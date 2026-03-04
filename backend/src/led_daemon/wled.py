from asyncio import Event, Task, create_task, sleep
from logging import getLogger
from random import shuffle
from time import time
from typing import Any
from uuid import UUID

from httpx import AsyncClient, HTTPError

from lib.model.sequence import LedSequence, WledSequenceElement
from lib.model.wled import SegItem, WledState

logger = getLogger(__name__)


class Wled:
    event: Event

    def __init__(self, host: str):
        self.host = host[:-1]
        self.task: Task | None = None
        self.previous_segment_set: UUID | None = None
        self.event = Event()

    async def execute(self, sequence: LedSequence, segment_set_id: UUID | None):
        await self.clear_task_if_alive()
        if segment_set_id is None or segment_set_id != self.previous_segment_set:
            await self.clear_segments()

        self.previous_segment_set = segment_set_id
        if sequence.repeat:
            self.task = create_task(self.repeat_sequence(sequence))
        else:
            await self.run_sequence(sequence)

    async def clear_task_if_alive(self):
        if self.task and not self.task.done():
            self.event.set()

            self.task.cancel()

            try:
                await self.task
            except:
                pass

            self.task = None
            self.event.clear()

    async def clear_segments(self):
        response = await self._send_request("/json/state", "GET")
        body = WledState.model_validate_json(response.text)
        new_segments = WledState(
            tt=0,
            seg=[
                SegItem(
                    id=0,
                    start=0,
                    stop=max(body.seg, key=lambda s: s.stop).stop,
                    col=[[0, 0, 0]],
                ),
                *[SegItem(id=s.id, start=0, stop=0) for s in body.seg[1:]],
            ],
        )
        await self._send_request(
            "/json/state", "POST", new_segments.model_dump(mode="json", exclude_unset=True)
        )

    def kill(self):
        self.event.set()

    async def repeat_sequence(self, sequence: LedSequence):
        try:
            while not self.event.is_set():
                await self.run_sequence(sequence)

        except:
            pass

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

            await sleep(0.005)

    async def shutdown(self):
        await self.client.aclose()

    async def _send_request(self, path: str, method: str, json_data: dict[str, Any] | None = None):
        response = None
        retry = True
        retries = 0
        async with AsyncClient(base_url=self.host) as client:
            while retry and retries < 5:
                try:
                    response = await client.request(
                        method,
                        f"{self.host}{path}",
                        json=json_data,
                        headers={"Content-Type": "application/json"},
                    )
                except HTTPError as e:
                    retry = True
                    retries += 1
                    logger.error(
                        "Retryable WLED Error",
                        exc_info=e,
                        extra={
                            "response_text": response.text if response else None,
                            "status_code": response.status_code if response else None,
                        },
                    )

                else:
                    retry = False

        if response and response.is_error:
            logger.error(
                "WLED Error",
                extra={
                    "response_text": response.text,
                    "status_code": response.status_code,
                },
            )

        return response
