from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi_pagination.api import set_items_transformer
from fastapi_pagination.cursor import CursorPage
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.led_daemon_client import LedDaemonClient
from api.orm import PlaylistOrm, get_db
from lib.model.api import PlaylistRequest, PlaylistResponse


class PlaylistService:
    def __init__(
        self,
        db: Annotated[Session, Depends(get_db)],
        led_daemon: Annotated[LedDaemonClient, Depends()],
    ):
        self.db = db
        self.led_daemon = led_daemon

    def create_playlist(self, body: PlaylistRequest) -> UUID:
        existing_playlist = self.db.query(PlaylistOrm).filter_by(name=body.name).one_or_none()
        if existing_playlist:
            raise HTTPException(409, f"Playlist with name {body.name} already exists")

        playlist = PlaylistOrm(
            name=body.name,
            repeat=body.repeat,
            shuffle=body.shuffle,
            track_time=body.track_time,
            tracks=body.tracks,
        )
        self.db.add(playlist)
        self.db.commit()

        return playlist.id

    def delete_playlist(self, playlist_id: UUID) -> None:
        playlist = self.db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
        if not playlist:
            raise HTTPException(404, "playlist not found")

        self.db.delete(playlist)
        self.db.commit()

    async def execute_playlist_by_id(self, playlist_id: UUID) -> None:
        playlist = self.get_playlist(playlist_id)
        await self.led_daemon.publish_execute_playlist(
            playlist.name, playlist.repeat, playlist.shuffle, playlist.track_time, playlist.tracks
        )

    async def execute_playlist(self, body: PlaylistRequest) -> None:
        await self.led_daemon.publish_execute_playlist(
            body.name, body.repeat, body.shuffle, body.track_time, body.tracks
        )

    def get_playlist(self, playlist_id: UUID) -> PlaylistOrm:
        playlist = self.db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
        if not playlist:
            raise HTTPException(404, "playlist not found")

        return playlist

    def list_playlists(self, name: str | None = None) -> CursorPage[PlaylistResponse]:
        set_items_transformer(
            lambda data: [
                PlaylistResponse(
                    id=p.id,
                    repeat=p.repeat,
                    name=p.name,
                    shuffle=p.shuffle,
                    track_time=p.track_time,
                    tracks=p.tracks,
                )
                for p in data
            ]
        )
        query = select(PlaylistOrm)

        if name:
            query = query.filter(PlaylistOrm.name.ilike(f"%{name}%"))

        query = query.order_by(PlaylistOrm.name)

        return paginate(self.db, query)

    def update_playlist(self, playlist_id: UUID, body: PlaylistRequest) -> None:
        playlist = self.db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
        if not playlist:
            raise HTTPException(404, "playlist not found")

        playlist.name = body.name
        playlist.repeat = body.repeat
        playlist.shuffle = body.shuffle
        playlist.track_time = body.track_time
        playlist.tracks = body.tracks
        self.db.commit()
