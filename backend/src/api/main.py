from logging import getLogger
from typing import Annotated
from uuid import UUID

from aiomqtt import Client
from fastapi import FastAPI, HTTPException
from fastapi.params import Depends, Query
from pydantic import AnyUrl
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from api.orm import (
    PlaylistOrm,
    SegmentSetOrm,
    SequenceOrm,
    WledHostOrm,
    db_session_middleware,
    get_db,
)
from api.router import wled_host
from lib.model.api import (
    CreateResponse,
    ExecuteSequenceRequest,
    PlaylistRequest,
    PlaylistResponse,
    SegmentSetRequest,
    SegmentSetResponse,
    SequenceListItem,
    SequenceRequest,
    SequenceResponse,
)
from lib.model.sequence import (
    PlaylistMessage,
    SequenceMessage,
)
from lib.prepare import prepare
from lib.settings import get_settings

logger = getLogger(__name__)

settings = get_settings()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(db_session_middleware)
app.include_router(wled_host.router)


@app.post("/sequence")
async def create_sequence(
    body: SequenceRequest, db: Annotated[Session, Depends(get_db)]
) -> CreateResponse:
    host = db.query(WledHostOrm).filter_by(id=body.host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {body.host_id} does not exist")

    existing_sequence = (
        db.query(SequenceOrm).filter_by(host_id=body.host_id, name=body.name).one_or_none()
    )
    if existing_sequence:
        raise HTTPException(409, f"Sequence with name {body.name} already exists for host")

    sequence = SequenceOrm(
        name=body.name,
        host_id=body.host_id,
        segment_set_id=body.segment_set_id,
        sequence=body.sequence,
    )
    db.add(sequence)
    db.commit()

    return CreateResponse(id=sequence.id)


@app.get("/sequence")
async def list_sequences(
    db: Annotated[Session, Depends(get_db)],
    host_id: Annotated[UUID | None, Query(alias="hostId")] = None,
) -> list[SequenceListItem]:
    query = db.query(SequenceOrm).join(WledHostOrm)
    if host_id:
        query = query.filter_by(id=host_id)

    query = query.order_by(WledHostOrm.url, SequenceOrm.name)
    return [
        SequenceListItem(
            id=s.id,
            host_id=s.host_id,
            host=s.host.url,
            segment_set_id=s.segment_set_id,
            name=str(s.name),
        )
        for s in query.all()
    ]


@app.put("/sequence/{sequence_id}")
async def update_sequence(
    sequence_id: UUID, body: SequenceRequest, db: Annotated[Session, Depends(get_db)]
) -> None:
    sequence = db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, f"Sequence {sequence_id} does not exist")

    sequence.name = body.name
    sequence.host_id = body.host_id
    sequence.sequence = body.sequence
    sequence.segment_set_id = body.segment_set_id
    db.commit()


@app.delete("/sequence/{sequence_id}")
async def delete_sequence(sequence_id: UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    sequence = db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, f"Sequence {sequence_id} does not exist")

    db.delete(sequence)
    db.commit()


@app.get("/sequence/{sequence_id}", response_model_exclude_unset=True)
async def get_sequence(
    sequence_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> SequenceResponse:
    sequence = db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, "sequence not found")

    return SequenceResponse(
        id=sequence.id,
        host_id=sequence.host_id,
        host=sequence.host.url,
        segment_set_id=sequence.segment_set_id,
        name=sequence.name,
        sequence=sequence.sequence,
    )


@app.post("/playlist")
async def create_playlist(
    body: PlaylistRequest, db: Annotated[Session, Depends(get_db)]
) -> CreateResponse:
    existing_playlist = db.query(PlaylistOrm).filter_by(name=body.name).one_or_none()
    if existing_playlist:
        raise HTTPException(409, f"Playlist with name {body.name} already exists")

    playlist = PlaylistOrm(
        name=body.name,
        repeat=body.repeat,
        shuffle=body.shuffle,
        track_time=body.track_time,
        tracks=body.tracks,
    )
    db.add(playlist)
    db.commit()

    return CreateResponse(id=playlist.id)


@app.put("/playlist/{playlist_id}", status_code=204)
async def update_playlist(
    playlist_id: UUID, body: PlaylistRequest, db: Annotated[Session, Depends(get_db)]
) -> None:
    playlist = db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
    if not playlist:
        raise HTTPException(404, "playlist not found")

    playlist.name = body.name
    playlist.repeat = body.repeat
    playlist.shuffle = body.shuffle
    playlist.track_time = body.track_time
    playlist.tracks = body.tracks
    db.commit()


@app.delete("/playlist/{playlist_id}", status_code=204)
async def delete_playlist(playlist_id: UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    playlist = db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
    if not playlist:
        raise HTTPException(404, "playlist not found")

    db.delete(playlist)
    db.commit()


@app.post("/playlist/{playlist_id}/execute", status_code=204)
async def execute_playlist_by_id(
    playlist_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> None:
    playlist = db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
    if not playlist:
        raise HTTPException(404, "playlist not found")

    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/playlist",
            payload=PlaylistMessage(
                base_url=settings.api_url,
                name=playlist.name,
                repeat=playlist.repeat,
                shuffle=playlist.shuffle,
                track_time=playlist.track_time,
                tracks=playlist.tracks,
            ).model_dump_json(exclude_unset=True),
        )


@app.get("/playlist/{playlist_id}", status_code=200)
async def get_playlist(
    playlist_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> PlaylistResponse:
    playlist = db.query(PlaylistOrm).filter_by(id=playlist_id).one_or_none()
    if not playlist:
        raise HTTPException(404, "playlist not found")

    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        repeat=playlist.repeat,
        shuffle=playlist.shuffle,
        track_time=playlist.track_time,
        tracks=playlist.tracks,
    )


@app.get("/playlist", status_code=200)
async def list_playlists(
    db: Annotated[Session, Depends(get_db)],
) -> list[PlaylistResponse]:
    playlists = db.query(PlaylistOrm).all()

    return [
        PlaylistResponse(
            id=p.id,
            repeat=p.repeat,
            name=p.name,
            shuffle=p.shuffle,
            track_time=p.track_time,
            tracks=p.tracks,
        )
        for p in playlists
    ]


@app.post("/segment-set")
async def create_segment_set(
    body: SegmentSetRequest, db: Annotated[Session, Depends(get_db)]
) -> CreateResponse:
    existing_segment_set = (
        db.query(SegmentSetOrm).filter_by(name=body.name, host_id=body.host_id).one_or_none()
    )
    if existing_segment_set:
        raise HTTPException(409, f"Segment set with name {body.name} already exists")

    segment_set = SegmentSetOrm(host_id=body.host_id, name=body.name, segments=body.segments)
    db.add(segment_set)
    db.flush()

    db.commit()

    return CreateResponse(id=segment_set.id)


@app.put("/segment-set/{segment_set_id}")
async def update_segment_set(
    segment_set_id: UUID,
    body: SegmentSetRequest,
    db: Annotated[Session, Depends(get_db)],
) -> CreateResponse:
    segment_set = db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
    if not segment_set:
        raise HTTPException(409, f"Segment set {segment_set} does not exist.")

    segment_set.host_id = body.host_id
    segment_set.name = body.name
    segment_set.segments = body.segments
    db.add(segment_set)
    db.flush()

    db.commit()

    return CreateResponse(id=segment_set.id)


@app.delete("/segment-set/{segment_set_id}", status_code=204)
async def delete_segment_set(segment_set_id: UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    segment_set = db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
    if not segment_set:
        raise HTTPException(404, "Segment set not found")

    db.delete(segment_set)
    db.commit()


@app.get("/segment-set/{segment_set_id}", status_code=200)
async def get_segment_set(
    segment_set_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> SegmentSetResponse:
    segment_set = db.query(SegmentSetOrm).filter_by(id=segment_set_id).one_or_none()
    if not segment_set:
        raise HTTPException(404, "segment_set not found")

    return SegmentSetResponse(
        id=segment_set.id,
        name=segment_set.name,
        host_id=segment_set.host_id,
        host=segment_set.host.url,
        segments=segment_set.segments,
    )


@app.get("/segment-set", status_code=200)
async def list_segment_sets(
    db: Annotated[Session, Depends(get_db)],
) -> list[SegmentSetResponse]:
    segment_sets = db.query(SegmentSetOrm).all()

    return [
        SegmentSetResponse(
            id=s.id,
            name=s.name,
            host_id=s.host_id,
            host=s.host.url,
            segments=s.segments,
        )
        for s in segment_sets
    ]


async def _execute(sequence: SequenceOrm | None):
    if not sequence:
        raise HTTPException(404, "sequence not found")

    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/execute",
            payload=SequenceMessage(
                name=sequence.name,
                sequence=await prepare(sequence.sequence, settings.api_url),
                host=sequence.host.url,
                segment_set_id=sequence.segment_set_id,
            ).model_dump_json(exclude_unset=True),
        )


@app.post("/execute/by-id/{sequence_id}")
async def execute_by_id(sequence_id: UUID, db: Annotated[Session, Depends(get_db)]):
    await _execute(db.query(SequenceOrm).filter_by(id=sequence_id).one_or_none())


@app.post("/execute/by-name/{name}")
async def execute_by_name(name: str, db: Annotated[Session, Depends(get_db)]):
    await _execute(db.query(SequenceOrm).filter_by(name=name).one_or_none())


@app.post("/execute")
async def execute(body: ExecuteSequenceRequest, db: Annotated[Session, Depends(get_db)]):
    host = db.query(WledHostOrm).filter_by(id=body.host_id).one_or_none()
    if not host:
        raise HTTPException(404, "host not found")
    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/execute",
            payload=SequenceMessage(
                name="Test",
                sequence=await prepare(body.sequence, settings.api_url),
                host=AnyUrl(host.url),
                segment_set_id=None,
            ).model_dump_json(exclude_unset=True),
        )


@app.post("/executePlaylist")
async def execute_playlist(body: PlaylistRequest):
    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/playlist",
            payload=PlaylistMessage(
                base_url=settings.api_url,
                name=body.name,
                repeat=body.repeat,
                shuffle=body.shuffle,
                track_time=body.track_time,
                tracks=body.tracks,
            ).model_dump_json(exclude_unset=True),
        )
