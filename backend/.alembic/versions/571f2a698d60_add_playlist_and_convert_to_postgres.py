"""add playlist and convert to postgres

Revision ID: 571f2a698d60
Revises: 93973b82f9c9
Create Date: 2026-01-07 15:03:38.666735

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import Text

from api.orm import PostgresLedSequence

# revision identifiers, used by Alembic.
revision: str = "571f2a698d60"
down_revision: Union[str, Sequence[str], None] = "93973b82f9c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("sequence_host_id_fkey", "sequence", type_="foreignkey")
    op.alter_column(
        "wled_host",
        "id",
        existing_type=sa.TEXT(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="id::uuid",
    )
    op.alter_column(
        "wled_host", "url", existing_type=sa.TEXT(), type_=sa.String(), nullable=False
    )
    op.alter_column(
        "sequence",
        "id",
        existing_type=sa.TEXT(),
        type_=sa.UUID(),
        existing_nullable=False,
        postgresql_using="id::uuid",
    )
    op.alter_column(
        "sequence", "name", existing_type=sa.TEXT(), type_=sa.String(), nullable=False
    )
    op.alter_column(
        "sequence",
        "host_id",
        existing_type=sa.TEXT(),
        type_=sa.UUID(),
        nullable=False,
        postgresql_using="host_id::uuid",
    )
    op.alter_column(
        "sequence",
        "sequence",
        existing_type=sa.TEXT(),
        type_=PostgresLedSequence(astext_type=Text()),
        nullable=False,
        postgresql_using="sequence::jsonb",
    )
    op.create_foreign_key(
        "sequence_host_id_fkey",
        "sequence",
        "wled_host",
        ["host_id"],
        ["id"],
    )
    op.create_table(
        "playlist",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("host_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("shuffle", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["host_id"],
            ["wled_host.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "track",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("playlist_id", sa.UUID(), nullable=False),
        sa.Column("sequence_id", sa.UUID(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["playlist_id"],
            ["playlist.id"],
        ),
        sa.ForeignKeyConstraint(
            ["sequence_id"],
            ["sequence.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("track")
    op.drop_table("playlist")
    op.alter_column(
        "wled_host", "url", existing_type=sa.String(), type_=sa.TEXT(), nullable=True
    )
    op.alter_column(
        "wled_host",
        "id",
        existing_type=sa.UUID(),
        type_=sa.TEXT(),
        existing_nullable=False,
    )
    op.alter_column(
        "sequence",
        "sequence",
        existing_type=PostgresLedSequence(astext_type=Text()),
        type_=sa.TEXT(),
        nullable=True,
    )
    op.alter_column(
        "sequence", "host_id", existing_type=sa.UUID(), type_=sa.TEXT(), nullable=True
    )
    op.alter_column(
        "sequence", "name", existing_type=sa.String(), type_=sa.TEXT(), nullable=True
    )
    op.alter_column(
        "sequence",
        "id",
        existing_type=sa.UUID(),
        type_=sa.TEXT(),
        existing_nullable=False,
    )
