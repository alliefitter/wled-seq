from logging import getLogger
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import AnyUrl

from api.service.wled_host_service import WledHostService
from lib.model.api import (
    CreateResponse,
    EffectsItem,
    ExecuteRandomRequest,
    ExecuteSequenceRequest,
    SegmentSetResponse,
    SequenceListItem,
    WledHostRequest,
    WledHostResponse,
)
from lib.settings import get_settings

router = APIRouter(prefix="/wled-host")
settings = get_settings()
logger = getLogger()


@router.post("", status_code=201)
async def create_host(
    body: WledHostRequest, service: Annotated[WledHostService, Depends()]
) -> CreateResponse:
    existing_host = service.get_host(url=body.url)
    if existing_host:
        raise HTTPException(409, f"Host {body.url} already exists")

    return CreateResponse(id=service.create_host(body))


@router.put("/{host_id}", status_code=204)
async def update_host(
    host_id: UUID, body: WledHostRequest, service: Annotated[WledHostService, Depends()]
) -> None:
    service.update_host(host_id, body)


@router.delete("/{host_id}", status_code=204)
async def delete_host(host_id: UUID, service: Annotated[WledHostService, Depends()]) -> None:
    service.delete_host(host_id)


@router.get("/{host_id}/sequence")
async def list_host_sequences(
    host_id: UUID, service: Annotated[WledHostService, Depends()]
) -> list[SequenceListItem]:
    return [
        SequenceListItem(
            id=s.id,
            host_id=s.host_id,
            host=s.host.url,
            segment_set_id=s.segment_set_id,
            name=str(s.name),
        )
        for s in service.list_sequences_for_host(host_id)
    ]


@router.get("/{host_id}/segment-set")
async def list_host_segment_sets(
    host_id: UUID, service: Annotated[WledHostService, Depends()]
) -> list[SegmentSetResponse]:
    return [
        SegmentSetResponse(
            id=s.id,
            name=s.name,
            host_id=s.host_id,
            host=s.host.url,
            segments=s.segments,
        )
        for s in service.list_segment_sets_for_host(host_id)
    ]


@router.post("/{host_id}/execute-random", status_code=204)
async def execute_random(
    host_id: UUID,
    body: ExecuteRandomRequest,
    service: Annotated[WledHostService, Depends()],
) -> None:
    await service.execute_random(host_id, body)


@router.get("")
async def list_hosts(service: Annotated[WledHostService, Depends()]) -> list[WledHostResponse]:
    return [
        WledHostResponse(
            id=h.id,
            url=AnyUrl(h.url),
            segment_sets=[
                SegmentSetResponse(
                    id=s.id,
                    host_id=s.host_id,
                    host=AnyUrl(s.host.url),
                    name=s.name,
                    segments=s.segments,
                )
                for s in h.segment_sets
            ],
        )
        for h in service.list_hosts()
    ]


@router.get("/{host_id}/effects")
async def get_host_effects(
    host_id: UUID, service: Annotated[WledHostService, Depends()]
) -> list[EffectsItem]:
    return await service.get_host_effects(host_id)


@router.get("/{host_id}/palettes")
async def get_host_palettes(
    host_id: UUID, service: Annotated[WledHostService, Depends()]
) -> list[str]:
    return await service.get_host_palettes(host_id)


@router.post("/{host_id}/stop", status_code=204)
async def stop(host_id: UUID, service: Annotated[WledHostService, Depends()]) -> None:
    await service.stop(host_id)


@router.post("/{host_id}/power-off", status_code=204)
async def power_off(host_id: UUID, service: Annotated[WledHostService, Depends()]) -> None:
    await service.power_off(host_id)


@router.post("/execute", status_code=204)
async def execute(
    body: ExecuteSequenceRequest, service: Annotated[WledHostService, Depends()]
) -> None:
    await service.execute(body)
