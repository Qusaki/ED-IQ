"""add student_id to user

Revision ID: f829c3eddd82
Revises: fd08648af89d
Create Date: 2026-03-07 18:24:07.692826

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f829c3eddd82'
down_revision: Union[str, Sequence[str], None] = 'fd08648af89d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('student_id', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'student_id')
