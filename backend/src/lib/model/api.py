from pydantic import UUID4, AnyUrl, BaseModel

from lib.model.sequence import LedSequence


class WledHostRequest(BaseModel):
    url: AnyUrl


class WledHostResponse(BaseModel):
    id: UUID4
    url: AnyUrl


class SequenceRequest(BaseModel):
    host_id: UUID4
    name: str
    sequence: LedSequence


class SequenceResponse(BaseModel):
    id: UUID4
    host_id: UUID4
    host: AnyUrl
    name: str
    sequence: LedSequence


class SequenceListItem(BaseModel):
    id: UUID4
    host_id: UUID4
    host: AnyUrl
    name: str


class CreateResponse(BaseModel):
    id: UUID4


class ExecuteSequenceRequest(BaseModel):
    host_id: UUID4
    sequence: LedSequence


class ExecuteRandomRequest(BaseModel):
    sleep_time: float


class EffectField(BaseModel):
    key: str
    label: str


class EffectsItem(BaseModel):
    id: int
    value: str
    fields: list[EffectField]
    uses_palette: bool
    colors: list[str]


class CreatePlaylistEntry(BaseModel):
    sequence_id: UUID4
    name: str
    order: int


class PlaylistEntry(CreatePlaylistEntry):
    id: UUID4


class CreatePlaylistRequest(BaseModel):
    host_id: UUID4
    name: str
    shuffle: bool
    entries: list[CreatePlaylistEntry]


class PlaylistResponse(BaseModel):
    id: UUID4
    host_id: UUID4
    name: str
    shuffle: bool
    entries: list[PlaylistEntry]
