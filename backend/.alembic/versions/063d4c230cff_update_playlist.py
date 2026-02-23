"""update playlist

Revision ID: 063d4c230cff
Revises: 571f2a698d60
Create Date: 2026-01-13 15:11:50.675342

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import Text

from api.orm import PostgresTracks

# revision identifiers, used by Alembic.
revision: str = "063d4c230cff"
down_revision: Union[str, Sequence[str], None] = "571f2a698d60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("track")
    op.add_column("playlist", sa.Column("track_time", sa.Float(), nullable=False))
    op.add_column(
        "playlist",
        sa.Column("tracks", PostgresTracks(astext_type=Text()), nullable=False),
    )
    op.drop_constraint(op.f("playlist_host_id_fkey"), "playlist", type_="foreignkey")
    op.drop_column("playlist", "host_id")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "playlist", sa.Column("host_id", sa.UUID(), autoincrement=False, nullable=False)
    )
    op.create_foreign_key(
        op.f("playlist_host_id_fkey"), "playlist", "wled_host", ["host_id"], ["id"]
    )
    op.drop_column("playlist", "tracks")
    op.drop_column("playlist", "track_time")
    op.create_table(
        "track",
        sa.Column("id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column("playlist_id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column("sequence_id", sa.UUID(), autoincrement=False, nullable=False),
        sa.Column("order", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(
            ["playlist_id"], ["playlist.id"], name=op.f("track_playlist_id_fkey")
        ),
        sa.ForeignKeyConstraint(
            ["sequence_id"], ["sequence.id"], name=op.f("track_sequence_id_fkey")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("track_pkey")),
    )
