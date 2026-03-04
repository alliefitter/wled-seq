from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi_pagination.api import set_items_transformer
from fastapi_pagination.cursor import CursorPage
from fastapi_pagination.ext.sqlalchemy import paginate
from pydantic import AnyUrl
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.led_daemon_client import LedDaemonClient
from api.orm import SequenceOrm, WledHostOrm, get_db
from lib.model.api import SequenceListItem, SequenceRequest


class SequenceService:
    def __init__(
        self,
        db: Annotated[Session, Depends(get_db)],
        led_daemon: Annotated[LedDaemonClient, Depends()],
    ):
        self.db = db
        self.led_daemon = led_daemon

    def create_sequence(self, body: SequenceRequest) -> UUID:
        host = self.db.query(WledHostOrm).filter_by(id=body.host_id).one_or_none()
        if not host:
            raise HTTPException(404, f"Host {body.host_id} does not exist")

        existing_sequence = (
            self.db.query(SequenceOrm).filter_by(host_id=body.host_id, name=body.name).one_or_none()
        )
        if existing_sequence:
            raise HTTPException(409, f"Sequence with name {body.name} already exists for host")

        sequence = SequenceOrm(
            name=body.name,
            host_id=body.host_id,
            segment_set_id=body.segment_set_id,
            sequence=body.sequence,
        )
        self.db.add(sequence)
        self.db.commit()

        return sequence.id

    def delete_sequence(self, sequence_id: UUID) -> None:
        sequence = self.db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
        if not sequence:
            raise HTTPException(404, f"Sequence {sequence_id} does not exist")

        self.db.delete(sequence)
        self.db.commit()

    async def execute_sequence_by_id(self, sequence_id: UUID) -> None:
        sequence = self.get_sequence(sequence_id)
        await self.led_daemon.publish_execute(
            sequence.name, AnyUrl(sequence.host.url), sequence.sequence, sequence.segment_set_id
        )

    def get_sequence(self, sequence_id: UUID) -> SequenceOrm:
        sequence = self.db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
        if not sequence:
            raise HTTPException(404, "sequence not found")

        return sequence

    def list_sequences(
        self, host_ids: list[UUID] | None, name: str | None = None
    ) -> CursorPage[SequenceListItem]:
        set_items_transformer(
            lambda data: [
                SequenceListItem(
                    id=s.id,
                    host_id=s.host_id,
                    host=s.host.url,
                    segment_set_id=s.segment_set_id,
                    name=str(s.name),
                )
                for s in data
            ]
        )

        query = select(SequenceOrm).join(WledHostOrm)
        if host_ids:
            query = query.filter(SequenceOrm.host_id.in_(host_ids))

        if name:
            query = query.filter(SequenceOrm.name.ilike(f"%{name}%"))

        query = query.order_by(WledHostOrm.url, SequenceOrm.name)

        return paginate(self.db, query)

    def update_sequence(self, sequence_id: UUID, body: SequenceRequest) -> None:
        sequence = self.db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
        if not sequence:
            raise HTTPException(404, f"Sequence {sequence_id} does not exist")

        sequence.name = body.name
        sequence.host_id = body.host_id
        sequence.sequence = body.sequence
        sequence.segment_set_id = body.segment_set_id
        self.db.commit()
