"""Add activity and lecture id to notifications

Revision ID: 49ab222bcd98
Revises: f829c3eddd82
Create Date: 2026-03-12 10:54:20.998629

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49ab222bcd98'
down_revision: Union[str, Sequence[str], None] = 'f829c3eddd82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
