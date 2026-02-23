from logging import getLogger
from random import choice
from uuid import UUID

from httpx import AsyncClient
from pydantic import AnyUrl

from led_daemon.wled import Wled
from lib.model.api import SequenceListItem, SequenceResponse
from lib.model.sequence import (
    PlaylistMessage,
    RandomSequenceMessage,
    SequenceMessage,
)
from lib.prepare import prepare
from lib.random import shuffle

logger = getLogger(__name__)


class Service:
    wled_clients: dict[AnyUrl, Wled]

    def __init__(self):
        self.wled_clients = {}

    def get_client(self, host_url: AnyUrl) -> Wled:
        if host_url not in self.wled_clients:
            self.wled_clients[host_url] = Wled(str(host_url))

        return self.wled_clients[host_url]

    async def execute_playlist(self, message: PlaylistMessage):
        logger.info(
            f"Executing playlist {message.name}",
            extra={
                "base_url": message.base_url,
                "num_tracks": len(message.tracks),
                "shuffle": message.shuffle,
                "track_time": message.track_time,
            },
        )
        was_killed = False
        tracks = iter(shuffle(message.tracks) if message.shuffle else message.tracks)
        async with AsyncClient(base_url=str(message.base_url)) as client:
            for track in tracks:
                sequence = await self._get_sequence(client, track.sequence_id, message.base_url)
                sleep_time = track.overrides.track_time or message.track_time
                if track.overrides.repeat is not None:
                    sequence.sequence.repeat = track.overrides.repeat

                if sequence.sequence.repeat and not sleep_time:
                    sleep_time = 300

                sequence = await self._get_sequence(client, track.sequence_id, message.base_url)
                wled = self.get_client(sequence.host)
                if wled.should_kill():
                    was_killed = True
                    break
                await wled.clear_thread_if_alive()

                logger.info(
                    f"Executing sequence {sequence.name}",
                    extra={
                        "host": sequence.host,
                        "len": len(sequence.sequence.elements),
                        "random": sequence.sequence.random,
                        "repeat": sequence.sequence.repeat,
                    },
                )
                await wled.execute(sequence.sequence, sequence.segment_set_id)
                if sleep_time:
                    logger.info("Sleeping...", extra={"sleep_time": sleep_time})
                    await wled.sleep(sleep_time)

                if wled.should_kill():
                    was_killed = True
                    break

        if message.repeat and not was_killed:
            await self.execute_playlist(message)

    async def execute_sequence(self, message: SequenceMessage):
        logger.info(
            f"Executing sequence {message.name}",
            extra={
                "host": message.host,
                "len": len(message.sequence.elements),
                "random": message.sequence.random,
                "repeat": message.sequence.repeat,
            },
        )
        await self.get_client(message.host).execute(message.sequence, message.segment_set_id)

    async def execute_random(self, message: RandomSequenceMessage):
        logger.info(f"Retrieving random sequences from WLED Seq at {message.base_url}")
        wled = self.get_client(message.host)
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

            while not wled.should_kill():
                await wled.clear_thread_if_alive()
                sequence_id = choice(sequence_ids)
                while previous_sequence_id == sequence_id:
                    sequence_id = choice(sequence_ids)

                logger.info(f"Executing sequence {sequence_id} randomly")
                sequence = await self._get_sequence(client, sequence_id, message.base_url)
                await wled.execute(sequence.sequence, sequence.segment_set_id)
                await wled.sleep(message.sleep_time)

    async def stop(self, host: AnyUrl):
        logger.info(f"Stopping host {host}")
        self.get_client(host).kill()

    async def _get_sequence(
        self, client: AsyncClient, sequence_id: UUID, base_url: AnyUrl
    ) -> SequenceResponse:
        response = await client.get(f"sequence/{sequence_id}")
        if response.is_error:
            logger.error(
                "WLED Seq API Error",
                extra={
                    "response_text": response.text,
                    "status_code": response.status_code,
                },
            )
            raise Exception

        sequence = SequenceResponse.model_validate(response.json())
        sequence.sequence = await prepare(sequence.sequence, base_url)

        return sequence
