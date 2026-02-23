"""Add retry_count to execution_history

Revision ID: 002_add_retry_count
Revises: 001_initial
Create Date: 2025-01-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_retry_count'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add retry_count column to execution_history
    op.add_column(
        'execution_history',
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    op.drop_column('execution_history', 'retry_count')




