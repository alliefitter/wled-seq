from logging import getLogger
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from httpx import AsyncClient
from pydantic import AnyUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.led_daemon_client import LedDaemonClient
from api.orm import SegmentSetOrm, SequenceOrm, WledHostOrm, get_db
from lib.model.api import EffectField, EffectsItem, ExecuteRandomRequest, WledHostRequest
from lib.model.sequence import LedSequence, WledSequenceElement
from lib.model.wled import On, WledState

logger = getLogger()


class WledHostService:
    def __init__(
        self,
        db: Annotated[Session, Depends(get_db)],
        led_daemon: Annotated[LedDaemonClient, Depends()],
    ):
        self.db = db
        self.led_daemon = led_daemon

    def create_host(self, body: WledHostRequest) -> UUID:
        host = WledHostOrm(url=str(body.url))
        self.db.add(host)
        self.db.flush()
        self.db.commit()

        return host.id

    def delete_host(self, host_id: UUID):
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        self.db.delete(host)
        self.db.commit()

    async def execute_random(self, host_id: UUID, body: ExecuteRandomRequest):
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        await self.led_daemon.publish_random(host.id, body.sleep_time, AnyUrl(host.url))

    def get_host(
        self, host_id: UUID | None = None, url: AnyUrl | None = None
    ) -> WledHostOrm | None:
        query = select(WledHostOrm)
        if host_id:
            query = query.filter_by(id=host_id)

        if url:
            query = query.filter_by(url=str(url))

        return self.db.execute(query).scalar_one_or_none()

    async def get_host_effects(self, host_id: UUID) -> list[EffectsItem]:
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        async with AsyncClient(base_url=host.url) as client:
            response = await client.get("/json/effects")
            if response.is_error:
                logger.error(
                    f"Error retrieving effects list for {host.id}",
                    extra={"status_code": response.status_code, "text": response.text},
                )

            effects = response.json()
            response = await client.get("/json/fxdata")
            if response.is_error:
                logger.error(
                    f"Error retrieving effects list for {host.id}",
                    extra={"status_code": response.status_code, "text": response.text},
                )

            fx_data = response.json()
            processed_effects = []
            for i, effect in enumerate(effects):
                if effect.lower() == "rainbow":
                    print("foo")
                processed_effect = EffectsItem(
                    id=i, value=effect, fields=[], uses_palette=True, colors=["Primary"]
                )
                fx_iter = iter(fx_data[i].split(";"))
                try:
                    fields = next(fx_iter).split(",")
                    keys = ["sx", "ix", "c1", "c2", "c3", "o1", "o2", "o3"]
                    for n, field in enumerate(fields):
                        if len(field) == 0:
                            continue

                        processed_effect.fields.append(
                            EffectField(
                                key=keys[n],
                                label=field,
                            )
                        )

                    colors = next(fx_iter).split(",")
                    default_labels = ["Primary", "Secondary", "Tertiary"]
                    if len(colors) > 0 and colors[0] != "":
                        processed_effect.colors = []
                        for n, color in enumerate(colors):
                            if len(color) == 0:
                                break
                            processed_effect.colors.append(
                                default_labels[n] if color == "!" else color
                            )

                    palette = next(fx_iter)
                    processed_effect.uses_palette = palette == "!"

                except StopIteration:
                    pass

                finally:
                    processed_effects.append(processed_effect)

        return processed_effects

    async def get_host_palettes(self, host_id: UUID) -> list[str]:
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        async with AsyncClient(base_url=host.url) as client:
            response = await client.get("/json/palettes")
            if response.is_error:
                logger.error(
                    f"Error retrieving palettes list for {host.id}",
                    extra={"status_code": response.status_code, "text": response.text},
                )

            return response.json()

    def list_hosts(self) -> list[WledHostOrm]:
        return self.db.query(WledHostOrm).all()

    def list_segment_sets_for_host(self, host_id: UUID) -> list[SegmentSetOrm]:
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        return host.segment_sets

    def list_sequences_for_host(self, host_id: UUID) -> list[SequenceOrm]:
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        return host.sequences

    async def power_off(self, host_id: UUID):
        host = self.get_host(host_id)
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        await self.led_daemon.execute(
            "Power Off",
            AnyUrl(host.url),
            LedSequence(
                repeat=False,
                random=False,
                elements=[WledSequenceElement(state=WledState(on=On(False)))],
            ),
        )

    async def stop(self, host_id: UUID):
        host = self.get_host(host_id)
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        await self.led_daemon.publish_stop(AnyUrl(host.url))

    def update_host(self, host_id: UUID, body: WledHostRequest) -> None:
        host = self.db.query(WledHostOrm).filter_by(id=host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {host_id} does not exist")

        host.url = str(body.url)
        self.db.commit()
