from asyncio import run, sleep
from functools import cached_property
from logging import getLogger
from random import choice, shuffle
from threading import Event, Thread
from time import time
from typing import Callable

import httpx
from httpx import AsyncClient

from lib.model.api import SequenceListItem, SequenceResponse
from lib.model.sequence import LedSequence, RandomSequenceMessage, WledSequenceElement

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
        self.event = Event()

    @cached_property
    def effects(self) -> dict[str, int]:
        response = httpx.get(f"{self.host}/json")
        effects = response.json()["effects"]
        return {e: i for i, e in enumerate(effects)}

    @cached_property
    def palettes(self) -> dict[str, int]:
        response = httpx.get(f"{self.host}/json")
        palettes = response.json()["palettes"]
        return {p: i for i, p in enumerate(palettes)}

    async def execute_random(self, message: RandomSequenceMessage):
        logger.info(f"Retrieving sequences from WLED Seq at {message.base_url}")
        async with AsyncClient(base_url=str(message.base_url)) as client:
            response = await client.get(f"wled-host/{message.host_id}/sequence")
            if response.is_error:
                logger.error(
                    "WLED Seq API Error",
                    extra={
                        "url": response.url,
                        "response_text": response.text,
                        "status_code": response.status_code,
                    },
                )
                return
            sequence_ids = []
            previous_sequence_id = None
            for item in response.json():
                sequence_ids.append(SequenceListItem.model_validate(item).id)

            while not self.event.is_set():
                await self.clear_thread_if_alive()
                sequence_id = choice(sequence_ids)
                while previous_sequence_id == sequence_id:
                    sequence_id = choice(sequence_ids)

                response = await client.get(f"sequence/{sequence_id}")
                if response.is_error:
                    logger.error(
                        "WLED Seq API Error",
                        extra={
                            "response_text": response.text,
                            "status_code": response.status_code,
                        },
                    )
                    return

                await self.execute(
                    SequenceResponse.model_validate(response.json()).sequence
                )
                await self.sleep(message.sleep_time)

    async def execute(self, sequence: LedSequence):
        await self.clear_thread_if_alive()

        if sequence.repeat:
            self.thread = SequenceThread(
                self.event, lambda: run(self.run_sequence(sequence))
            )
            self.thread.start()
        else:
            await self.run_sequence(sequence)

    async def clear_thread_if_alive(self):
        thread = self.thread
        self.event.set()
        if thread and thread.is_alive():
            thread.join()
        else:
            await sleep(0.06)
        self.event.clear()

    async def run_sequence(self, sequence: LedSequence):
        if sequence.random:
            shuffle(sequence.elements)

        for element in sequence.elements:
            if self.event.is_set():
                break

            await self.set_leds(element)
            if element.sleep_time:
                await self.sleep(element.sleep_time)

    async def set_leds(self, element: WledSequenceElement):
        async with AsyncClient(base_url=self.host) as client:
            response = await client.post(
                f"{self.host}/json/state",
                json=element.state.model_dump(mode="json", exclude_unset=True),
                headers={"Content-Type": "application/json"},
            )
        if response.is_error:
            logger.error(
                "WLED Error",
                extra={
                    "response_text": response.text,
                    "status_code": response.status_code,
                },
            )

    async def sleep(self, seconds: float):
        start = time()
        while time() - start < seconds:
            if self.event.is_set():
                break

            await sleep(0.05)
