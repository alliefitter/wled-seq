from abc import ABC
from enum import Enum
from functools import cached_property
from random import randint, shuffle
from threading import Event, Thread
from time import sleep, time
from typing import Any, Callable, Iterator

import httpx
from pydantic import BaseModel


class Segment(Enum):
    HEAD = 0
    CHEST = 1
    SHOULDERS = 2
    SKIRT = 3


class Effect(Enum):
    BREATHE = "Breathe"
    CANDLE = "Candle"
    TRI_FADE = "Tri Fade"
    GLITTER = "Glitter"
    HEARTBEAT = "Heartbeat"
    FADE = "Fade"
    SOLID = "Solid"
    NOISEMOVE = "Noisemove"
    STROBE = "Strobe"
    STROBE_MEGA = "Strobe Mega"
    CANDLE_MULTI = "Candle Multi"
    CHASE_FLASH = "Chase Flash"
    PLASMOID = "Plasmoid"
    COLORWAVES = "Colorwaves"
    LIGHTNING = "Lightning"
    COLORLOOP = "Colorloop"


class Palette(Enum):
    DEFAULT = "Default"
    AUTUMN = "Autumn"
    BEACH = "Beach"
    LAVA = "Lava"
    OCEAN = "Ocean"
    PARTY = "Party"
    PINK_CANDY = "Pink Candy"
    RED_REAF = "Red Reaf"
    TERTIARY = "Tertiary"
    YELBLU = "Yelblu"


class SegmentEffect(BaseModel):
    id: Segment
    col: list[list[int]]
    fx: Effect
    bri: int = 255
    sx: int = 128
    ix: int = 128
    pal: Palette = Palette.DEFAULT


class SequenceElement(BaseModel):
    segment_effects: list[SegmentEffect]
    sleep_time: float = 0.0
    on: bool = True
    transition: int = 7


class SequenceThread(Thread):
    def __init__(self, event: Event, target: Callable):
        super().__init__()
        self.event = event
        self.target = target

    def run(self):
        while not self.event.is_set():
            self.target()


class Sequence(ABC):
    sequence: list[SequenceElement]
    repeat: bool = False
    random: bool = False
    thread: SequenceThread | None = None
    event: Event = Event()

    @property
    def name(self) -> str:
        return self.__class__.__name__[:-8].lower()

    @cached_property
    def effects(self) -> dict[Effect, int]:
        response = httpx.get("http://gramps.home/json")
        effects = response.json()["effects"]
        return {e: effects.index(e.value) for e in Effect}

    @cached_property
    def palettes(self) -> dict[Palette, int]:
        response = httpx.get("http://gramps.home/json")
        palettes = response.json()["palettes"]
        return {p: palettes.index(p.value) for p in Palette}

    def __call__(
        self,
        *args,
        sequence: list[SequenceElement] | None = None,
        repeat: bool | None = None,
        **kwargs,
    ):
        self.clear_thread_if_alive()
        if repeat or repeat is not False and self.repeat:
            Sequence.thread = SequenceThread(
                self.event, lambda: self.run_sequence(sequence)
            )
            Sequence.thread.start()
        else:
            self.run_sequence(sequence)

    def clear_thread_if_alive(self):
        thread = Sequence.thread
        if thread and thread.is_alive():
            self.event.set()
            thread.join()
            self.event.clear()

    def run_sequence(self, sequence: list[SequenceElement] | None = None):
        sequence = sequence or self.sequence
        if self.random:
            shuffle(sequence)

        for element in sequence:
            if self.event.is_set():
                break

            self.set_leds(element)
            if element.sleep_time:
                self.sleep(element.sleep_time)

    def set_leds(self, element: SequenceElement):
        response = httpx.post(
            "http://gramps.home/json/state",
            json={
                "on": element.on,
                "bri": 255,
                "tt": element.transition,
                "seg": [
                    self.normalize_segment(s.model_dump(by_alias=True))
                    for s in element.segment_effects
                ],
            },
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

    def normalize_segment(self, segment: dict[str, Any]) -> dict[str, Any]:
        segment["fx"] = self.effects[segment["fx"]]
        segment["pal"] = self.palettes[segment["pal"]]
        segment["id"] = segment["id"].value

        return segment

    def sleep(self, seconds: float):
        start = time()
        while time() - start < seconds:
            if self.event.is_set():
                break

            sleep(0.1)


class BootSequence(Sequence):
    off_sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(id=Segment.HEAD, col=[[0, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.CHEST, col=[[0, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SHOULDERS, col=[[0, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SKIRT, col=[[0, 0, 0]], fx=Effect.SOLID),
            ],
            sleep_time=0,
            on=False,
        )
    ]
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD, col=[[255, 255, 255, 0]], fx=Effect.SOLID
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 0]],
                    fx=Effect.SOLID,
                ),
                SegmentEffect(id=Segment.SHOULDERS, col=[[0, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SKIRT, col=[[0, 0, 0]], fx=Effect.SOLID),
            ],
            sleep_time=3,
            transition=30,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD, col=[[255, 255, 255, 0]], fx=Effect.SOLID
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[255, 0, 0]],
                    fx=Effect.COLORWAVES,
                    bri=255,
                    sx=18,
                ),
                SegmentEffect(id=Segment.SHOULDERS, col=[[0, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SKIRT, col=[[0, 0, 0]], fx=Effect.SOLID),
            ],
            sleep_time=2,
            transition=20,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD, col=[[255, 255, 255, 0]], fx=Effect.SOLID
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[255, 0, 0]],
                    fx=Effect.COLORWAVES,
                    bri=255,
                    sx=18,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 180], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 180], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                ),
            ],
            sleep_time=60,
            transition=50,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD, col=[[0, 0, 0]], fx=Effect.SOLID, bri=200
                ),
                SegmentEffect(
                    id=Segment.CHEST, col=[[0, 0, 0]], fx=Effect.SOLID, bri=200
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS, col=[[0, 0, 0]], fx=Effect.SOLID, bri=200
                ),
                SegmentEffect(
                    id=Segment.SKIRT, col=[[0, 0, 0]], fx=Effect.SOLID, bri=200
                ),
            ],
            sleep_time=10,
            transition=30,
        ),
        # SequenceElement(
        #     segment_effects=[
        #         SegmentEffect(
        #             id=Segment.HEAD, col=[[255, 0, 0], [255, 255, 255, 0]], fx=Effect.CANDLE
        #         ),
        #         SegmentEffect(
        #             id=Segment.CHEST,
        #             col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
        #             fx=Effect.TRI_FADE,
        #         ),
        #         SegmentEffect(id=Segment.SHOULDERS, col=[[0, 0, 255], [255, 0, 0]], fx=Effect.FADE),
        #         SegmentEffect(id=Segment.SKIRT, col=[[255, 0, 0], [0, 0, 255]], fx=Effect.FADE),
        #     ],
        #     sleep_time=3,
        # ),
        # SequenceElement(
        #     segment_effects=[
        #         SegmentEffect(
        #             id=Segment.HEAD, col=[[255, 0, 0], [255, 255, 255, 0]], fx=Effect.CANDLE
        #         ),
        #         SegmentEffect(id=Segment.CHEST, col=[[0, 0, 255, 255], [0, 0, 0]], fx=Effect.FADE),
        #         SegmentEffect(
        #             id=Segment.SHOULDERS, col=[[0, 0, 255, 255], [0, 0, 0]], fx=Effect.FADE
        #         ),
        #         SegmentEffect(id=Segment.SKIRT, col=[[0, 0, 255, 255], [0, 0, 0]], fx=Effect.FADE),
        #     ],
        #     sleep_time=3,
        # ),
        # SequenceElement(
        #     segment_effects=[
        #         SegmentEffect(
        #             id=Segment.HEAD,
        #             col=[[255, 255, 255, 255]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.CHEST,
        #             col=[[255, 255, 255, 255]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.SHOULDERS,
        #             col=[[255, 255, 255, 255]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.SKIRT,
        #             col=[[255, 255, 255, 255]],
        #             fx=Effect.SOLID
        #         ),
        #     ],
        #     sleep_time=1.5
        # ),
        # # SequenceElement(
        #     segment_effects=[
        #         SegmentEffect(
        #             id=Segment.HEAD,
        #             col=[[255, 0, 0]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.CHEST,
        #             col=[[255, 0, 0]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.SHOULDERS,
        #             col=[[0, 0, 255]],
        #             fx=Effect.SOLID
        #         ),
        #         SegmentEffect(
        #             id=Segment.SKIRT,
        #             col=[[0, 0, 255]],
        #             fx=Effect.SOLID
        #         ),
        #     ],
        #     sleep_time=1
        # ),
        # SequenceElement(
        #     segment_effects=[
        #         SegmentEffect(
        #             id=Segment.HEAD, col=[[255, 0, 0], [255, 255, 255, 0]], fx=Effect.CANDLE
        #         ),
        #         SegmentEffect(
        #             id=Segment.CHEST,
        #             col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
        #             fx=Effect.TRI_FADE,
        #         ),
        #         SegmentEffect(id=Segment.SHOULDERS, col=[[0, 0, 255], [255, 0, 0]], fx=Effect.FADE),
        #         SegmentEffect(id=Segment.SKIRT, col=[[255, 0, 0], [0, 0, 255]], fx=Effect.FADE),
        #     ],
        #     sleep_time=5,
        # ),
    ]
    repeat = True

    def __call__(self, *args, **kwargs):
        response = httpx.get("http://gramps.home/json/state")
        if response.json()["on"]:
            super().__call__(*args, sequence=self.off_sequence, repeat=False, **kwargs)

        else:
            super().__call__(*args, sequence=self.on_sequence, **kwargs)


class GlitterSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
                    fx=Effect.GLITTER,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
                    fx=Effect.GLITTER,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
                    fx=Effect.GLITTER,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[255, 0, 0], [0, 0, 255], [255, 255, 255]],
                    fx=Effect.GLITTER,
                ),
            ]
        )
    ]


class HeartSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0, 128]],
                    fx=Effect.STROBE,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[255, 0, 0], [0, 0, 255]],
                    fx=Effect.HEARTBEAT,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[255, 0, 0], [0, 0, 255, 255]],
                    fx=Effect.CANDLE,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255], [0, 0, 255, 255]],
                    fx=Effect.CANDLE,
                ),
            ]
        )
    ]


class ShineSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(id=Segment.HEAD, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.CHEST, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SHOULDERS, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SKIRT, col=[[255, 0, 0]], fx=Effect.SOLID),
            ],
            sleep_time=1,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD, col=[[255, 255, 255, 255]], fx=Effect.SOLID
                ),
                SegmentEffect(
                    id=Segment.CHEST, col=[[255, 255, 255, 255]], fx=Effect.SOLID
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[255, 255, 255, 255]],
                    fx=Effect.SOLID,
                ),
                SegmentEffect(
                    id=Segment.SKIRT, col=[[255, 255, 255, 255]], fx=Effect.SOLID
                ),
            ],
            sleep_time=1.5,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(id=Segment.HEAD, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.CHEST, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SHOULDERS, col=[[255, 0, 0]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.SKIRT, col=[[255, 0, 0]], fx=Effect.SOLID),
            ]
        ),
    ]


class BrightSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(id=Segment.HEAD, col=[[255, 255, 255]], fx=Effect.SOLID),
                SegmentEffect(id=Segment.CHEST, col=[[255, 255, 255]], fx=Effect.SOLID),
                SegmentEffect(
                    id=Segment.SHOULDERS, col=[[255, 255, 255]], fx=Effect.SOLID
                ),
                SegmentEffect(id=Segment.SKIRT, col=[[255, 255, 255]], fx=Effect.SOLID),
            ]
        )
    ]


class BreatheSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 0, 0], [255, 255, 255]],
                    fx=Effect.NOISEMOVE,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255], [255, 0, 0, 255]],
                    fx=Effect.BREATHE,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[255, 0, 0], [0, 0, 255]],
                    fx=Effect.BREATHE,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[255, 0, 0], [0, 0, 255]],
                    fx=Effect.BREATHE,
                ),
            ]
        )
    ]


class FlashSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.PLASMOID,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CHASE_FLASH,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CHASE_FLASH,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CHASE_FLASH,
                ),
            ]
        )
    ]


class CandleSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=200,
                    sx=180,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=200,
                    sx=180,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=200,
                    sx=180,
                ),
            ],
            sleep_time=10,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
            ],
            sleep_time=5,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
            ],
            sleep_time=5,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=255,
                    sx=240,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=255,
                    sx=240,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=255,
                    sx=240,
                ),
            ],
            sleep_time=10,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
            ],
            sleep_time=5,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=200,
                ),
            ],
            sleep_time=5,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                    # sx=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=180,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=180,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=220,
                    sx=180,
                ),
            ],
            sleep_time=5,
        ),
    ]
    repeat = True


class LightningSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[0, 0, 255], [255, 0, 0]],
                    fx=Effect.FADE,
                    bri=255,
                    sx=255,
                    ix=255,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 0], [0, 0, 255, 64]],
                    fx=Effect.LIGHTNING,
                    bri=255,
                    sx=255,
                    ix=255,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 0], [0, 0, 255, 64]],
                    fx=Effect.LIGHTNING,
                    bri=200,
                    sx=255,
                    ix=255,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 0], [0, 0, 255, 64]],
                    fx=Effect.LIGHTNING,
                    bri=80,
                    sx=255,
                    ix=255,
                ),
            ]
        )
    ]


class WaveSequence(Sequence):
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 0, 0, 64]],
                    fx=Effect.COLORWAVES,
                    bri=255,
                    sx=64,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[255, 0, 0, 64]],
                    fx=Effect.COLORWAVES,
                    bri=255,
                    sx=64,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[255, 0, 0, 64]],
                    fx=Effect.COLORWAVES,
                    bri=200,
                    sx=64,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[255, 0, 0, 64]],
                    fx=Effect.COLORWAVES,
                    bri=80,
                    sx=64,
                ),
            ]
        )
    ]


class ColorloopSequence(Sequence):
    repeat = True
    random = True
    sequence = [
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255]],
                    fx=Effect.SOLID,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.BEACH,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.BEACH,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.BEACH,
                ),
            ],
            sleep_time=2,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255]],
                    fx=Effect.SOLID,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.OCEAN,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.OCEAN,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.OCEAN,
                ),
            ],
            sleep_time=2,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255]],
                    fx=Effect.SOLID,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.PINK_CANDY,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.PINK_CANDY,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[],
                    fx=Effect.COLORLOOP,
                    pal=Palette.PINK_CANDY,
                ),
            ],
            sleep_time=2,
        ),
        SequenceElement(
            segment_effects=[
                SegmentEffect(
                    id=Segment.HEAD,
                    col=[[255, 255, 255], [255, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=180,
                ),
                SegmentEffect(
                    id=Segment.CHEST,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SHOULDERS,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
                SegmentEffect(
                    id=Segment.SKIRT,
                    col=[[0, 0, 255, 255], [0, 0, 0]],
                    fx=Effect.CANDLE_MULTI,
                    ix=240,
                    sx=220,
                ),
            ],
            sleep_time=2,
        ),
    ]


class RandomSequence(Sequence):
    sleep_time = 60

    def __call__(self, *args, **kwargs):
        sequences = [s() for s in Sequence.__subclasses__() if s != RandomSequence]
        previous_sequence = None
        while not self.event.is_set():
            self.clear_thread_if_alive()
            sequence = sequences[randint(0, len(sequences) - 1)]
            while sequence == previous_sequence:
                sequence = sequences[randint(0, len(sequences) - 1)]

            previous_sequence = sequence
            print(f"starting sequence {sequence.__class__.__name__}")
            sequence()
            self.sleep(self.sleep_time)


def get_sequences() -> Iterator[Sequence]:
    for subclass in Sequence.__subclasses__():
        yield subclass()


"""
class SequenceElement(BaseModel):
    segment_effects: list[SegmentEffect]
    sleep_time: float = 0.0
    on: bool = True
    transition: int = 7"""


def dumps(sequence: Sequence):
    sequence_list = []
    for s in sequence.sequence:
        data = s.model_dump(mode="json", exclude_unset=True)
        segments = []
        for seg in data["segment_effects"]:
            if "bri" in seg:
                del seg["bri"]
            if "fx" in seg:
                seg["fx"] = sequence.effects[Effect(seg["fx"])]
            if "pal" in seg:
                seg["pal"] = sequence.palettes[Palette(seg["pal"])]
            if len(seg["col"]) == 0:
                del seg["col"]

            segments.append(seg)
        list_item = {"state": {"on": True, "seg": segments}}
        if "sleep_time" in data:
            list_item["sleep_time"] = data["sleep_time"]
        if "transition" in data:
            list_item["state"]["transition"] = data["transition"]

        sequence_list.append(list_item)

    response = httpx.post(
        "http://localhost:8080/sequence",
        json={
            "name": sequence.__class__.__name__[:-8],
            "host_id": "383088bd-eeac-4703-abae-3bf6418bd74d",
            "sequence": {
                "repeat": sequence.repeat,
                "random": sequence.random,
                "sequence": sequence_list,
            },
        },
    )
    if not response.is_success:
        print(response.text)


for sequence in [
    BootSequence,
    GlitterSequence,
    HeartSequence,
    ShineSequence,
    BrightSequence,
    BreatheSequence,
    FlashSequence,
    CandleSequence,
    LightningSequence,
    WaveSequence,
    ColorloopSequence,
]:
    dumps(sequence())
