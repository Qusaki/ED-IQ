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
    # Use batch mode for compatibility; safe to re-run if columns already exist
    from sqlalchemy import inspect as sa_inspect
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing_columns = [col['name'] for col in inspector.get_columns('notifications')]

    if 'activity_id' not in existing_columns:
        op.add_column('notifications', sa.Column('activity_id', sa.Text(), nullable=True))
    if 'lecture_id' not in existing_columns:
        op.add_column('notifications', sa.Column('lecture_id', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notifications', 'lecture_id')
    op.drop_column('notifications', 'activity_id')

