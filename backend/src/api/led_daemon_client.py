from uuid import UUID

from aiomqtt import Client
from pydantic import AnyUrl

from lib.model.sequence import (
    LedSequence,
    PlaylistMessage,
    RandomSequenceMessage,
    SequenceMessage,
    StopOrPowerOffMessage,
    Track,
)
from lib.prepare import prepare
from lib.settings import get_settings

settings = get_settings()


class LedDaemonClient:
    async def publish_random(self, host_id: UUID, sleep_time: float, host_url: AnyUrl) -> None:
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/random",
                payload=RandomSequenceMessage(
                    base_url=settings.api_url,
                    sleep_time=sleep_time,
                    host=host_url,
                    host_id=host_id,
                ).model_dump_json(exclude_unset=True),
            )

    async def publish_stop(self, host_url: AnyUrl) -> None:
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/stop",
                payload=StopOrPowerOffMessage(
                    host=host_url,
                ).model_dump_json(exclude_unset=True),
            )

    async def publish_execute(
        self, name: str, host_url: AnyUrl, sequence: LedSequence, segment_set_id: UUID | None
    ) -> None:
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/execute",
                payload=SequenceMessage(
                    name=name,
                    sequence=await prepare(sequence, settings.api_url),
                    host=host_url,
                    segment_set_id=segment_set_id,
                ).model_dump_json(exclude_unset=True),
            )

    async def publish_execute_playlist(
        self,
        name: str,
        repeat: bool,
        shuffle: bool,
        track_time: float | None,
        tracks: list[Track],
    ) -> None:
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/playlist",
                payload=PlaylistMessage(
                    base_url=settings.api_url,
                    name=name,
                    repeat=repeat,
                    shuffle=shuffle,
                    track_time=track_time,
                    tracks=tracks,
                ).model_dump_json(exclude_unset=True),
            )
