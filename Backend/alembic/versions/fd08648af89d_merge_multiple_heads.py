"""Merge multiple heads

Revision ID: fd08648af89d
Revises: add_subject_id_to_notifications, b24fd7676de0
Create Date: 2026-03-04 22:08:09.302616

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd08648af89d'
down_revision: Union[str, Sequence[str], None] = ('add_subject_id_to_notifications', 'b24fd7676de0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
