from logging import getLogger
from typing import Awaitable, Callable
from uuid import UUID, uuid4

from sqlalchemy import (
    TEXT,
    Dialect,
    ForeignKey,
    TypeDecorator,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    MappedAsDataclass,
    MappedColumn,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)
from sqlalchemy_utils import create_database, database_exists
from starlette.requests import Request
from starlette.responses import Response

from lib.model.sequence import LedSequence
from lib.settings import get_settings

settings = get_settings()
print(str(settings.db_url))
engine = create_engine(str(settings.db_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

logger = getLogger(__name__)


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


class SqliteLedSequence(TypeDecorator):
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: LedSequence | dict, dialect: Dialect):
        if value is not None:
            return value.model_dump_json(exclude_unset=True, by_alias=True)
        return value

    def process_result_value(self, value: str, dialect: Dialect):
        if value is not None:
            return LedSequence.model_validate_json(value)
        return value

    def python_type(self):
        return LedSequence


class SqliteUuid(TypeDecorator):
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: UUID, dialect: Dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value: str, dialect: Dialect):
        if value is not None:
            return UUID(value)
        return value

    def python_type(self):
        return UUID


class Base(MappedAsDataclass, DeclarativeBase):
    type_annotation_map = {UUID: SqliteUuid, LedSequence: SqliteLedSequence}


class WledHost(Base):
    __tablename__ = "wled_host"
    id: MappedColumn[UUID] = mapped_column(
        default_factory=lambda: uuid4(), primary_key=True, init=False
    )
    url: MappedColumn[str]

    sequences: MappedColumn[list["Sequence"]] = relationship(
        back_populates="host", init=False
    )


class Sequence(Base):
    __tablename__ = "sequence"

    id: MappedColumn[UUID] = mapped_column(
        default_factory=lambda: uuid4(), primary_key=True, init=False
    )
    name: MappedColumn[str]
    host_id: MappedColumn[UUID] = mapped_column(ForeignKey("wled_host.id"))
    sequence: MappedColumn[LedSequence]

    host: MappedColumn[WledHost] = relationship(back_populates="sequences", init=False)


class PlaylistEntry(Base):
    __tablename__ = "playlist_entry"
    id: MappedColumn[UUID] = mapped_column(
        default_factory=lambda: uuid4(), primary_key=True, init=False
    )
    playlist_id: MappedColumn[UUID] = mapped_column(ForeignKey("playlist.id"))
    sequence_id: MappedColumn[UUID] = mapped_column(ForeignKey("sequence.id"))
    order: MappedColumn[int]
    playlist: MappedColumn["Playlist"] = relationship(
        back_populates="entries", init=False
    )
    sequence: MappedColumn[Sequence] = relationship(init=False)


class Playlist(Base):
    __tablename__ = "playlist"
    id: MappedColumn[UUID] = mapped_column(
        default_factory=lambda: uuid4(), primary_key=True, init=False
    )
    host_id: MappedColumn[UUID] = mapped_column(ForeignKey("wled_host.id"))
    name: MappedColumn[str]
    shuffle: MappedColumn[bool]
    entries: MappedColumn[list[PlaylistEntry]] = relationship(
        back_populates="playlist", init=False
    )
