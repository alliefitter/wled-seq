from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi_pagination.api import set_items_transformer
from fastapi_pagination.cursor import CursorPage
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.orm import SegmentSetOrm, get_db
from lib.model.api import SegmentSetRequest, SegmentSetResponse


class SegmentSetService:
    def __init__(
        self,
        db: Annotated[Session, Depends(get_db)],
    ):
        self.db = db

    def create_segment_set(self, body: SegmentSetRequest) -> UUID:
        existing_segment_set = (
            self.db.query(SegmentSetOrm)
            .filter_by(name=body.name, host_id=body.host_id)
            .one_or_none()
        )
        if existing_segment_set:
            raise HTTPException(409, f"Segment set with name {body.name} already exists")

        segment_set = SegmentSetOrm(host_id=body.host_id, name=body.name, segments=body.segments)
        self.db.add(segment_set)
        self.db.flush()
        self.db.commit()

        return segment_set.id

    def delete_segment_set(self, segment_set_id: UUID) -> None:
        segment_set = self.db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
        if not segment_set:
            raise HTTPException(404, f"Segment set {segment_set_id}not found")

        self.db.delete(segment_set)
        self.db.commit()

    def get_segment_set(self, segment_set_id: UUID) -> SegmentSetOrm:
        segment_set = self.db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
        if not segment_set:
            raise HTTPException(404, "segment_set not found")

        return segment_set

    def list_segment_sets(
        self, host_ids: list[UUID] | None, name: str | None = None
    ) -> CursorPage[SegmentSetResponse]:
        set_items_transformer(
            lambda data: [
                SegmentSetResponse(
                    id=s.id,
                    name=s.name,
                    host_id=s.host_id,
                    host=s.host.url,
                    segments=s.segments,
                )
                for s in data
            ]
        )

        query = select(SegmentSetOrm)
        if host_ids:
            query = query.filter(SegmentSetOrm.host_id.in_(host_ids))

        if name:
            query = query.filter(SegmentSetOrm.name.ilike(f"%{name}%"))

        query = query.order_by(SegmentSetOrm.name)

        return paginate(self.db, query)

    def update_segment_set(self, segment_set_id: UUID, body: SegmentSetRequest) -> None:
        segment_set = self.db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
        if not segment_set:
            raise HTTPException(409, f"Segment set {segment_set_id} does not exist.")

        segment_set.host_id = body.host_id
        segment_set.name = body.name
        segment_set.segments = body.segments
        self.db.add(segment_set)
        self.db.flush()
        self.db.commit()
