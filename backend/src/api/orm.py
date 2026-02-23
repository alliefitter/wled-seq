from logging import getLogger
from typing import Awaitable, Callable
from uuid import UUID, uuid4

from pydantic import TypeAdapter
from sqlalchemy import (
    Dialect,
    ForeignKey,
    TypeDecorator,
    create_engine,
    false,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as POSTGRES_UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    MappedAsDataclass,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)
from sqlalchemy_utils import create_database, database_exists
from starlette.requests import Request
from starlette.responses import Response

from lib.model.api import Segment, Track
from lib.model.sequence import LedSequence
from lib.settings import get_settings

settings = get_settings()
engine = create_engine(str(settings.db_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

logger = getLogger(__name__)
tracks_adapter = TypeAdapter(list[Track])
segments_adapter = TypeAdapter(list[Segment])


async def db_session_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response | None:
    response: Response | None = None
    db = SessionLocal()
    try:
        request.state.db = db
        response = await call_next(request)
        db.commit()
    # pylint: disable=broad-exception-caught
    except Exception as e:
        db.rollback()
        logger.error("Unexpected error", exc_info=e)
        raise e from e

    finally:
        try:
            db.close()
        except Exception as e:
            logger.warning("Error while closing db session", exc_info=e)

    return response


async def get_db(request: Request) -> Session:
    return request.state.db


def ensure_database_exists():
    if not database_exists(engine.url):
        create_database(engine.url)
    engine.dispose()


class PostgresLedSequence(TypeDecorator):
    impl = JSONB
    cache_ok = True

    def process_bind_param(self, value: LedSequence | dict, dialect: Dialect):
        if value is not None:
            return value.model_dump(mode="json", exclude_unset=True, by_alias=True)
        return value

    def process_result_value(self, value: str, dialect: Dialect):
        if value is not None:
            return LedSequence.model_validate(value)
        return value

    def python_type(self):
        return LedSequence


class PostgresTracks(TypeDecorator):
    impl = JSONB
    cache_ok = True

    def process_bind_param(self, value: list[Track] | dict, dialect: Dialect):
        if value is not None:
            return tracks_adapter.dump_python(value, exclude_unset=True, by_alias=True, mode="json")
        return value

    def process_result_value(self, value: str, dialect: Dialect):
        if value is not None:
            return tracks_adapter.validate_python(value)
        return value

    def python_type(self):
        return list[Track]


class PostgresSegments(TypeDecorator):
    impl = JSONB
    cache_ok = True

    def process_bind_param(self, value: list[Track] | dict, dialect: Dialect):
        if value is not None:
            return segments_adapter.dump_python(
                value, exclude_unset=True, by_alias=True, mode="json"
            )
        return value

    def process_result_value(self, value: str, dialect: Dialect):
        if value is not None:
            return segments_adapter.validate_python(value)
        return value

    def python_type(self):
        return list[Segment]


class Base(MappedAsDataclass, DeclarativeBase):
    type_annotation_map = {
        UUID: POSTGRES_UUID,
        LedSequence: PostgresLedSequence,
        list[Track]: PostgresTracks,
        list[Segment]: PostgresSegments,
    }


class WledHostOrm(Base):
    __tablename__ = "wled_host"
    id: Mapped[UUID] = mapped_column(default_factory=lambda: uuid4(), primary_key=True, init=False)
    url: Mapped[str]

    sequences: Mapped[list["SequenceOrm"]] = relationship(back_populates="host", init=False)
    segment_sets: Mapped[list["SegmentSetOrm"]] = relationship(back_populates="host", init=False)


class SegmentSetOrm(Base):
    __tablename__ = "segment_set"

    id: Mapped[UUID] = mapped_column(default_factory=lambda: uuid4(), primary_key=True, init=False)
    host_id: Mapped[UUID] = mapped_column(ForeignKey("wled_host.id"))
    name: Mapped[str]
    segments: Mapped[list[Segment]]

    host: Mapped[WledHostOrm] = relationship(back_populates="segment_sets", init=False)


class SequenceOrm(Base):
    __tablename__ = "sequence"

    id: Mapped[UUID] = mapped_column(default_factory=lambda: uuid4(), primary_key=True, init=False)
    name: Mapped[str]
    host_id: Mapped[UUID] = mapped_column(ForeignKey("wled_host.id"))
    segment_set_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segment_set.id"), server_default=None
    )
    sequence: Mapped[LedSequence]

    host: Mapped[WledHostOrm] = relationship(back_populates="sequences", init=False)
    segment_set: Mapped[SegmentSetOrm | None] = relationship(init=False)


class PlaylistOrm(Base):
    __tablename__ = "playlist"
    id: Mapped[UUID] = mapped_column(default_factory=lambda: uuid4(), primary_key=True, init=False)
    name: Mapped[str]
    shuffle: Mapped[bool]
    tracks: Mapped[list[Track]]
    track_time: Mapped[float | None] = mapped_column(default=None)
    repeat: Mapped[bool] = mapped_column(default=False, server_default=false())
