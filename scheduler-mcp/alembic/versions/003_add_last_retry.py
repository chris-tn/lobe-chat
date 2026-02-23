"""Add last_retry to schedules

Revision ID: 003_add_last_retry
Revises: 002_add_retry_count
Create Date: 2025-01-12 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_add_last_retry'
down_revision: Union[str, None] = '002_add_retry_count'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add last_retry column to schedules
    op.add_column(
        'schedules',
        sa.Column('last_retry', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    op.drop_column('schedules', 'last_retry')




