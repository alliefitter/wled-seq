from logging import getLogger
from typing import Annotated
from uuid import UUID

from aiomqtt import Client
from fastapi import FastAPI, HTTPException
from fastapi.params import Depends, Query
from httpx import AsyncClient
from pydantic import AnyUrl
from sqlalchemy.orm import Session
from starlette.middleware.cors import CORSMiddleware

from api.orm import (
    Sequence,
    WledHost,
    db_session_middleware,
    get_db,
)
from lib.model.api import (
    CreateResponse,
    EffectField,
    EffectsItem,
    ExecuteRandomRequest,
    ExecuteSequenceRequest,
    SequenceListItem,
    SequenceRequest,
    SequenceResponse,
    WledHostRequest,
    WledHostResponse,
)
from lib.model.sequence import LedSequence, RandomSequenceMessage, SequenceMessage
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


@app.post("/wled-host")
async def create_host(
    body: WledHostRequest, db: Annotated[Session, Depends(get_db)]
) -> CreateResponse:
    existing_host = db.query(WledHost).filter_by(url=str(body.url)).one_or_none()
    if existing_host:
        raise HTTPException(409, f"Host {body.url} already exists")

    host = WledHost(url=str(body.url))
    db.add(host)
    db.flush()
    db.commit()

    return CreateResponse(id=host.id)


@app.put("/wled-host/{host_id}")
async def update_host(
    host_id: UUID, body: WledHostRequest, db: Annotated[Session, Depends(get_db)]
) -> None:
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    host.url = str(body.url)
    db.commit()


@app.delete("/wled-host/{host_id}")
async def delete_host(host_id: UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    db.delete(host)
    db.commit()


@app.get("/wled-host/{host_id}/sequence")
async def list_host_sequences(
    host_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> list[SequenceListItem]:
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    return [
        SequenceListItem(
            id=s.id,
            host_id=s.host_id,
            host=s.host.url,
            name=str(s.name),
        )
        for s in host.sequences
    ]


@app.post("/wled-host/{host_id}/execute-random")
async def execute_random(
    host_id: UUID, body: ExecuteRandomRequest, db: Annotated[Session, Depends(get_db)]
):
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/random",
            payload=RandomSequenceMessage(
                base_url=settings.api_url,
                sleep_time=body.sleep_time,
                host=AnyUrl(host.url),
                host_id=host_id,
            ).model_dump_json(exclude_unset=True),
        )


@app.get("/wled-host")
async def list_hosts(db: Annotated[Session, Depends(get_db)]) -> list[WledHostResponse]:
    hosts = db.query(WledHost).all()
    return [WledHostResponse.model_validate(h, from_attributes=True) for h in hosts]


async def get_wled_data(host: WledHost, field_name: str) -> list[str]:
    async with AsyncClient(base_url=host.url) as client:
        response = await client.get(f"/json/{field_name}")
        if response.is_error:
            logger.error(
                f"Error retrieving {field_name} list for {host.id}",
                extra={"status_code": response.status_code, "text": response.text},
            )
        logger.info(response.json())
        return response.json()


@app.get("/wled-host/{host_id}/effects")
async def get_host_effects(
    host_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> list[EffectsItem]:
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    async with AsyncClient(base_url=host.url) as client:
        response = await client.get("/json/effects")
        if response.is_error:
            logger.error(
                f"Error retrieving effects list for {host.id}",
                extra={"status_code": response.status_code, "text": response.text},
            )

        effects = response.json()
        response = await client.get("/json/fxdata")
        if response.is_error:
            logger.error(
                f"Error retrieving effects list for {host.id}",
                extra={"status_code": response.status_code, "text": response.text},
            )

        fx_data = response.json()
        processed_effects = []
        for i, effect in enumerate(effects):
            if effect.lower() == "rainbow":
                print("foo")
            processed_effect = EffectsItem(
                id=i, value=effect, fields=[], uses_palette=True, colors=["Primary"]
            )
            fx_iter = iter(fx_data[i].split(";"))
            try:
                fields = next(fx_iter).split(",")
                keys = ["sx", "ix", "c1", "c2", "c3", "o1", "o2", "o3"]
                for n, field in enumerate(fields):
                    if len(field) == 0:
                        continue

                    processed_effect.fields.append(
                        EffectField(
                            key=keys[n],
                            label=field,
                        )
                    )

                colors = next(fx_iter).split(",")
                default_labels = ["Primary", "Secondary", "Tertiary"]
                if len(colors) > 0 and colors[0] != "":
                    processed_effect.colors = []
                    for n, color in enumerate(colors):
                        if len(color) == 0:
                            break
                        processed_effect.colors.append(
                            default_labels[n] if color == "!" else color
                        )

                palette = next(fx_iter)
                processed_effect.uses_palette = palette == "!"

            except StopIteration:
                pass

            finally:
                processed_effects.append(processed_effect)

    return processed_effects


@app.get("/wled-host/{host_id}/palettes")
async def get_host_palettes(
    host_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> list[str]:
    host = db.query(WledHost).filter_by(id=host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {host_id} does not exist")

    async with AsyncClient(base_url=host.url) as client:
        response = await client.get("/json/palettes")
        if response.is_error:
            logger.error(
                f"Error retrieving palettes list for {host.id}",
                extra={"status_code": response.status_code, "text": response.text},
            )

        return response.json()


@app.post("/sequence")
async def create_sequence(
    body: SequenceRequest, db: Annotated[Session, Depends(get_db)]
) -> CreateResponse:
    host = db.query(WledHost).filter_by(id=body.host_id).one_or_none()
    if not host:
        raise HTTPException(404, f"Host {body.host_id} does not exist")
    sequence = Sequence(
        name=body.name,
        host_id=body.host_id,
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
    query = db.query(Sequence)
    if host_id:
        query = query.filter_by(host_id=host_id)
    return [
        SequenceListItem(
            id=s.id,
            host_id=s.host_id,
            host=s.host.url,
            name=str(s.name),
        )
        for s in query.all()
    ]


@app.put("/sequence/{sequence_id}")
async def update_sequence(
    sequence_id: UUID, body: SequenceRequest, db: Annotated[Session, Depends(get_db)]
) -> None:
    sequence = db.query(Sequence).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, f"Sequence {sequence_id} does not exist")

    sequence.name = body.name
    sequence.host_id = body.host_id
    sequence.sequence = body.sequence
    db.commit()


@app.delete("/sequence/{sequence_id}")
async def delete_sequence(
    sequence_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> None:
    sequence = db.query(Sequence).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, f"Sequence {sequence_id} does not exist")

    db.delete(sequence)
    db.commit()


@app.get("/sequence/{sequence_id}", response_model_exclude_unset=True)
async def get_sequence(
    sequence_id: UUID, db: Annotated[Session, Depends(get_db)]
) -> SequenceResponse:
    sequence = db.query(Sequence).filter_by(id=sequence_id).one_or_none()
    if not sequence:
        raise HTTPException(404, "sequence not found")

    return SequenceResponse(
        id=sequence.id,
        host_id=sequence.host_id,
        host=sequence.host.url,
        name=sequence.name,
        sequence=sequence.sequence,
    )


def _prepare(led_sequence: LedSequence, db: Session) -> LedSequence:
    sequence_elements = []
    for element in led_sequence.elements:
        if element.ref:
            referenced_sequence = (
                db.query(Sequence).filter_by(id=element.ref).one_or_none()
            )
            if not referenced_sequence:
                raise HTTPException(500, "referenced sequence not found")

            sequence_elements += referenced_sequence.sequence.elements

        else:
            sequence_elements.append(element)

    led_sequence.elements = sequence_elements

    return led_sequence


async def _execute(sequence: Sequence | None, db: Session):
    if not sequence:
        raise HTTPException(404, "sequence not found")

    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/execute",
            payload=SequenceMessage(
                name=sequence.name,
                sequence=_prepare(sequence.sequence, db),
                host=sequence.host.url,
            ).model_dump_json(exclude_unset=True),
        )


@app.post("/execute/by-id/{sequence_id}")
async def execute_by_id(sequence_id: UUID, db: Annotated[Session, Depends(get_db)]):
    await _execute(db.query(Sequence).filter_by(id=sequence_id).one_or_none(), db)


@app.post("/execute/by-name/{name}")
async def execute_by_name(name: str, db: Annotated[Session, Depends(get_db)]):
    await _execute(db.query(Sequence).filter_by(name=name).one_or_none(), db)


@app.post("/execute")
async def execute(
    body: ExecuteSequenceRequest, db: Annotated[Session, Depends(get_db)]
):
    host = db.query(WledHost).filter_by(id=body.host_id).one_or_none()
    if not host:
        raise HTTPException(404, "host not found")
    async with Client(settings.mqtt_url) as client:
        await client.publish(
            "wled-seq/execute",
            payload=SequenceMessage(
                name="Test", sequence=_prepare(body.sequence, db), host=AnyUrl(host.url)
            ).model_dump_json(exclude_unset=True),
        )
