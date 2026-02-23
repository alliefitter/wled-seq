from pydantic import UUID4, AnyUrl, BaseModel

from lib.model.sequence import LedSequence, Track


class WledHostRequest(BaseModel):
    url: AnyUrl


class WledHostResponse(BaseModel):
    id: UUID4
    url: AnyUrl
    segment_sets: list["SegmentSetResponse"]


class SequenceRequest(BaseModel):
    host_id: UUID4
    segment_set_id: UUID4
    name: str
    sequence: LedSequence


class SequenceResponse(BaseModel):
    id: UUID4
    host_id: UUID4
    host: AnyUrl
    segment_set_id: UUID4
    name: str
    sequence: LedSequence


class SequenceListItem(BaseModel):
    id: UUID4
    host_id: UUID4
    host: AnyUrl
    segment_set_id: UUID4
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


class PlaylistRequest(BaseModel):
    name: str
    repeat: bool
    shuffle: bool
    track_time: float | None
    tracks: list[Track]


class PlaylistResponse(BaseModel):
    id: UUID4
    name: str
    repeat: bool
    shuffle: bool
    track_time: float | None = None
    tracks: list[Track]


class Segment(BaseModel):
    id: int
    name: str
    start: int
    stop: int | None = None
    start_y: int | None = None
    stop_y: int | None = None
    length: int | None = None
    grouping: int | None = None
    spacing: int | None = None


class SegmentSetRequest(BaseModel):
    host_id: UUID4
    name: str
    segments: list[Segment]


class SegmentSetResponse(SegmentSetRequest):
    id: UUID4
    host: AnyUrl
