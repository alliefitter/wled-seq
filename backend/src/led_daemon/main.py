import asyncio
import signal
from asyncio import create_task
from logging import getLogger
from logging.config import dictConfig

import yaml
from aiomqtt import Client

from led_daemon.wled import Wled
from lib.model.sequence import RandomSequenceMessage, SequenceMessage
from lib.settings import get_settings

logger = getLogger(__name__)
settings = get_settings()


async def listen(stop_event):
    wled = {}
    async with Client(settings.mqtt_url) as client:
        await client.subscribe("wled-seq/#")
        async for message in client.messages:
            if stop_event.is_set():
                break

            logger.info(f"Received message: {message.topic}")
            match str(message.topic):
                case "wled-seq/execute":
                    sequence_message = SequenceMessage.model_validate_json(
                        message.payload
                    )
                    if sequence_message.host not in wled:
                        wled[sequence_message.host] = Wled(str(sequence_message.host))
                    create_task(
                        wled[sequence_message.host].execute(sequence_message.sequence)
                    )
                case "wled-seq/random":
                    sequence_message = RandomSequenceMessage.model_validate_json(
                        message.payload
                    )
                    if sequence_message.host not in wled:
                        wled[sequence_message.host] = Wled(str(sequence_message.host))

                    create_task(
                        wled[sequence_message.host].execute_random(sequence_message)
                    )
                case _:
                    raise ValueError(f"Unknown topic: {message.topic}")


def main():
    with open("./logging.yaml", "rt") as f:
        config = yaml.safe_load(f)
    dictConfig(config)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    stop_event = asyncio.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, stop_event.set)

    try:
        loop.run_until_complete(listen(stop_event))
    finally:
        loop.close()


if __name__ == "__main__":
    main()
