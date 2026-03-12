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
    op.add_column('notifications', sa.Column('activity_id', sa.Text(), nullable=True))
    op.add_column('notifications', sa.Column('lecture_id', sa.Text(), nullable=True))
    # Foreign keys
    op.create_foreign_key(None, 'notifications', 'activities', ['activity_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'notifications', 'lectures', ['lecture_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'notifications', type_='foreignkey')
    op.drop_constraint(None, 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'lecture_id')
    op.drop_column('notifications', 'activity_id')
