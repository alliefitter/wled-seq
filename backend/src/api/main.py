from logging import getLogger

from fastapi import FastAPI
from fastapi_pagination import add_pagination
from starlette.middleware.cors import CORSMiddleware

from api.orm import (
    db_session_middleware,
)
from api.router import playlist, segment_set, sequence, wled_host
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
app.include_router(playlist.router)
app.include_router(segment_set.router)
app.include_router(sequence.router)
app.include_router(wled_host.router)
add_pagination(app)
