from logging import getLogger
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi_pagination.cursor import CursorPage

from api.service.segment_set_service import SegmentSetService
from lib.model.api import CreateResponse, SegmentSetRequest, SegmentSetResponse
from lib.settings import get_settings

router = APIRouter(prefix="/segment-set")
settings = get_settings()
logger = getLogger()


@router.post("", status_code=201)
async def create_segment_set(
    body: SegmentSetRequest, service: Annotated[SegmentSetService, Depends()]
) -> CreateResponse:
    return CreateResponse(id=service.create_segment_set(body))


@router.put("/{segment_set_id}", status_code=204)
async def update_segment_set(
    segment_set_id: UUID,
    body: SegmentSetRequest,
    service: Annotated[SegmentSetService, Depends()],
) -> None:
    service.update_segment_set(segment_set_id, body)


@router.delete("/{segment_set_id}", status_code=204)
async def delete_segment_set(
    segment_set_id: UUID, service: Annotated[SegmentSetService, Depends()]
) -> None:
    service.delete_segment_set(segment_set_id)


@router.get(
    "/{segment_set_id}",
)
async def get_segment_set(
    segment_set_id: UUID, service: Annotated[SegmentSetService, Depends()]
) -> SegmentSetResponse:
    segment_set = service.get_segment_set(segment_set_id)
    return SegmentSetResponse(
        id=segment_set.id,
        name=segment_set.name,
        host_id=segment_set.host_id,
        host=segment_set.host.url,
        segments=segment_set.segments,
    )


@router.get("")
async def list_segment_sets(
    service: Annotated[SegmentSetService, Depends()],
    host_ids: Annotated[list[UUID] | None, Query(alias="hostId")] = None,
    name: Annotated[str | None, Query()] = None,
) -> CursorPage[SegmentSetResponse]:
    return service.list_segment_sets(host_ids, name)
