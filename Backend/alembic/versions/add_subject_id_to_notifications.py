"""add subject_id to notifications

Revision ID: add_subject_id_to_notifications
Revises: 7b041469d435
Create Date: 2026-03-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_subject_id_to_notifications'
down_revision: Union[str, Sequence[str], None] = '7b041469d435'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add subject_id column to notifications table."""
    op.add_column('notifications',
        sa.Column('subject_id', sa.Text(), nullable=True)
    )
    op.create_foreign_key(
        'fk_notifications_subject_id',
        'notifications', 'subject',
        ['subject_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_index('idx_notifications_subject_id', 'notifications', ['subject_id'])


def downgrade() -> None:
    """Downgrade schema - remove subject_id column from notifications table."""
    op.drop_constraint('fk_notifications_subject_id', 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'subject_id')
