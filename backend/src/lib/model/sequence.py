from pydantic import UUID4, AnyUrl, BaseModel, ConfigDict, Field

from lib.model.wled import WledState


class WledSequenceElement(BaseModel):
    ref: str | None = Field(
        None, description="Reference another sequence by Id.", alias="$ref"
    )
    state: WledState | None = Field(
        None,
        description="The WLED JSON API state object. See: https://kno.wled.ge/interfaces/json-api/",
    )
    sleep_time: float = Field(
        0.0,
        description="How long the sequence item should be displayed until the next item is displayed.",
    )


class LedSequence(BaseModel):
    model_config = ConfigDict(extra="allow")

    repeat: bool = Field(False, description="Repeat the sequence until changed.")
    random: bool = Field(False, description="Execute items in a random order.")
    elements: list[WledSequenceElement] | None = Field(
        None, description="An array of sequence elements."
    )


class SequenceMessage(BaseModel):
    name: str
    sequence: LedSequence
    host: AnyUrl


class RandomSequenceMessage(BaseModel):
    base_url: AnyUrl
    sleep_time: float
    host: AnyUrl
    host_id: UUID4
