from logging import getLogger
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi_pagination.cursor import CursorPage

from api.service.sequence_service import SequenceService
from lib.model.api import (
    CreateResponse,
    SequenceListItem,
    SequenceRequest,
    SequenceResponse,
)
from lib.settings import get_settings

router = APIRouter(prefix="/sequence")
settings = get_settings()
logger = getLogger()


@router.post("", status_code=201)
async def create_sequence(
    body: SequenceRequest, service: Annotated[SequenceService, Depends()]
) -> CreateResponse:
    return CreateResponse(id=service.create_sequence(body))


@router.get("")
async def list_sequences(
    service: Annotated[SequenceService, Depends()],
    host_ids: Annotated[list[UUID] | None, Query(alias="hostId")] = None,
    name: Annotated[str | None, Query()] = None,
) -> CursorPage[SequenceListItem]:
    return service.list_sequences(host_ids, name)


@router.put("/{sequence_id}", status_code=204)
async def update_sequence(
    sequence_id: UUID, body: SequenceRequest, service: Annotated[SequenceService, Depends()]
) -> None:
    service.update_sequence(sequence_id, body)


@router.delete("/{sequence_id}", status_code=204)
async def delete_sequence(
    sequence_id: UUID, service: Annotated[SequenceService, Depends()]
) -> None:
    service.delete_sequence(sequence_id)


@router.get("/{sequence_id}", response_model_exclude_unset=True)
async def get_sequence(
    sequence_id: UUID, service: Annotated[SequenceService, Depends()]
) -> SequenceResponse:
    sequence = service.get_sequence(sequence_id)
    return SequenceResponse(
        id=sequence.id,
        host_id=sequence.host_id,
        host=sequence.host.url,
        segment_set_id=sequence.segment_set_id,
        name=sequence.name,
        sequence=sequence.sequence,
    )


@router.post("/{sequence_id}/execute", status_code=204)
async def execute_by_id(sequence_id: UUID, service: Annotated[SequenceService, Depends()]) -> None:
    await service.execute_sequence_by_id(sequence_id)
