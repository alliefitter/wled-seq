import signal
from asyncio import (
    CancelledError,
    all_tasks,
    create_task,
    current_task,
    gather,
    new_event_loop,
    set_event_loop,
)
from logging import getLogger
from logging.config import dictConfig

import yaml
from aiomqtt import Client

from led_daemon.service import Service
from lib.model.sequence import (
    PlaylistMessage,
    RandomSequenceMessage,
    SequenceMessage,
    StopOrPowerOffMessage,
)
from lib.settings import get_settings

logger = getLogger(__name__)
settings = get_settings()


async def receive_messages():
    service = Service()
    async with Client(settings.mqtt_url) as client:
        await client.subscribe("wled-seq/#")
        async for message in client.messages:
            logger.info(f"Received message: {message.topic}")
            match str(message.topic):
                case "wled-seq/execute":
                    create_task(
                        service.execute_sequence(
                            SequenceMessage.model_validate_json(message.payload)
                        )
                    )

                case "wled-seq/random":
                    create_task(
                        service.execute_random(
                            RandomSequenceMessage.model_validate_json(message.payload)
                        )
                    )

                case "wled-seq/playlist":
                    create_task(
                        service.execute_playlist(
                            PlaylistMessage.model_validate_json(message.payload)
                        )
                    )

                case "wled-seq/stop":
                    create_task(
                        service.stop(
                            StopOrPowerOffMessage.model_validate_json(message.payload).host
                        )
                    )

                case _:
                    raise ValueError(f"Unknown topic: {message.topic}")


async def listen():
    try:
        await receive_messages()

    except CancelledError:
        pass


async def shutdown():
    tasks = [t for t in all_tasks() if t is not current_task()]
    for task in tasks:
        task.cancel()
    await gather(*tasks, return_exceptions=True)


def main():
    with open("./logging.yaml", "rt") as f:
        dictConfig(yaml.safe_load(f))

    loop = new_event_loop()
    set_event_loop(loop)

    stop = loop.create_future()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set_result, None)

    loop.create_task(listen())

    try:
        loop.run_until_complete(stop)
    finally:
        loop.run_until_complete(shutdown())
        loop.close()

    logger.info("Exiting...")


if __name__ == "__main__":
    main()
