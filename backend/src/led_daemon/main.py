import signal
from pathlib import Path
from asyncio import (
    TaskGroup,
    all_tasks,
    current_task,
    gather,
    new_event_loop,
    set_event_loop,
)
from logging import WARNING, getLogger
from logging.config import dictConfig
from typing import Any, Coroutine

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

getLogger("httpx").setLevel(WARNING)
logger = getLogger(__name__)
settings = get_settings()


def create_task(task_group: TaskGroup, coro: Coroutine[Any, Any, None]):
    try:
        task_group.create_task(coro)

    except Exception as e:
        logger.error("Task failed", exc_info=e)


async def receive_messages(service: Service):
    async with Client(settings.mqtt_url) as client, TaskGroup() as task_group:
        await client.subscribe("wled-seq/#")
        async for message in client.messages:
            logger.info(f"Received message: {message.topic}")
            match str(message.topic):
                case "wled-seq/execute":
                    create_task(
                        task_group,
                        service.execute_sequence(
                            SequenceMessage.model_validate_json(message.payload)
                        ),
                    )

                case "wled-seq/random":
                    create_task(
                        task_group,
                        service.execute_random(
                            RandomSequenceMessage.model_validate_json(message.payload)
                        ),
                    )

                case "wled-seq/playlist":
                    create_task(
                        task_group,
                        service.execute_playlist(
                            PlaylistMessage.model_validate_json(message.payload)
                        ),
                    )

                case "wled-seq/stop":
                    create_task(
                        task_group,
                        service.stop(
                            StopOrPowerOffMessage.model_validate_json(message.payload).host
                        ),
                    )

                case _:
                    logger.warning(f"Unknown topic: {message.topic}")


async def shutdown():
    tasks = [t for t in all_tasks() if t is not current_task()]
    for task in tasks:
        task.cancel()
    await gather(*tasks, return_exceptions=True)


def main():
    logging_config = Path(__file__).parent.parent.parent / "logging.yaml"
    with open(logging_config, "rt") as f:
        dictConfig(yaml.safe_load(f))

    service = Service()
    loop = new_event_loop()
    set_event_loop(loop)

    stop = loop.create_future()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set_result, None)

    loop.create_task(receive_messages(service))

    try:
        loop.run_until_complete(stop)
    finally:
        loop.run_until_complete(service.shutdown())
        loop.run_until_complete(shutdown())
        loop.close()

    logger.info("Exiting...")


if __name__ == "__main__":
    main()
