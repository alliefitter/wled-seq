from logging import getLogger
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi_pagination.cursor import CursorPage

from api.service.playlist_service import PlaylistService
from lib.model.api import CreateResponse, PlaylistRequest, PlaylistResponse
from lib.settings import get_settings

router = APIRouter(prefix="/playlist")
settings = get_settings()
logger = getLogger()


@router.post("", status_code=201)
async def create_playlist(
    body: PlaylistRequest, service: Annotated[PlaylistService, Depends()]
) -> CreateResponse:
    return CreateResponse(id=service.create_playlist(body))


@router.put("/{playlist_id}", status_code=204)
async def update_playlist(
    playlist_id: UUID, body: PlaylistRequest, service: Annotated[PlaylistService, Depends()]
) -> None:
    service.update_playlist(playlist_id, body)


@router.delete("/{playlist_id}", status_code=204)
async def delete_playlist(
    playlist_id: UUID, service: Annotated[PlaylistService, Depends()]
) -> None:
    service.delete_playlist(playlist_id)


@router.post("/{playlist_id}/execute", status_code=204)
async def execute_playlist_by_id(
    playlist_id: UUID, service: Annotated[PlaylistService, Depends()]
) -> None:
    await service.execute_playlist_by_id(playlist_id)


@router.post("/executePlaylist", status_code=204)
async def execute_playlist(
    body: PlaylistRequest, service: Annotated[PlaylistService, Depends()]
) -> None:
    await service.execute_playlist(body)


@router.get("/{playlist_id}")
async def get_playlist(
    playlist_id: UUID, service: Annotated[PlaylistService, Depends()]
) -> PlaylistResponse:
    playlist = service.get_playlist(playlist_id)
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        repeat=playlist.repeat,
        shuffle=playlist.shuffle,
        track_time=playlist.track_time,
        tracks=playlist.tracks,
    )


@router.get("")
async def list_playlists(
    service: Annotated[PlaylistService, Depends()], name: str | None = None
) -> CursorPage[PlaylistResponse]:
    return service.list_playlists(name)
