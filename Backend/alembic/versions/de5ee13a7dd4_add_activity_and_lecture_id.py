"""add activity and lecture id

Revision ID: de5ee13a7dd4
Revises: 49ab222bcd98
Create Date: 2026-03-12 10:56:31.574247

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de5ee13a7dd4'
down_revision: Union[str, Sequence[str], None] = '49ab222bcd98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
