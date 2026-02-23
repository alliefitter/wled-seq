from uuid import UUID

from aiomqtt import Client
from pydantic import AnyUrl

from lib.model.sequence import (
    LedSequence,
    RandomSequenceMessage,
    SequenceMessage,
    StopOrPowerOffMessage,
)
from lib.prepare import prepare
from lib.settings import get_settings

settings = get_settings()


class LedDaemonClient:
    async def publish_random(self, host_id: UUID, sleep_time: float, host_url: AnyUrl):
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

    async def publish_stop(self, host_url: AnyUrl):
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/stop",
                payload=StopOrPowerOffMessage(
                    host=host_url,
                ).model_dump_json(exclude_unset=True),
            )

    async def execute(self, name: str, host_url: AnyUrl, sequence: LedSequence):
        async with Client(settings.mqtt_url) as client:
            await client.publish(
                "wled-seq/execute",
                payload=SequenceMessage(
                    name=name,
                    sequence=await prepare(sequence, settings.api_url),
                    host=host_url,
                ).model_dump_json(exclude_unset=True),
            )
