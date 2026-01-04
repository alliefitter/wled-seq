from dynaconf import Dynaconf
from pydantic import AnyUrl, BaseModel, ConfigDict


def to_upper(upper: str) -> str:
    return upper.upper()


class Settings(BaseModel):
    model_config = ConfigDict(alias_generator=to_upper)

    db_url: AnyUrl
    mqtt_url: str
    api_url: AnyUrl


settings = Dynaconf(
    envvar_prefix="WLED_SEQ",
    preload="default.toml",
    settings_files=["settings.toml"],
)


def get_settings():
    return Settings.model_validate(settings.as_dict())
