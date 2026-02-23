"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2025-01-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create schedules table
    op.create_table(
        'schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('agent_id', sa.String(100), nullable=False),
        sa.Column('creator_agent_id', sa.String(100), nullable=False),
        sa.Column('user_email', sa.String(255), nullable=False),
        sa.Column('schedule_type', sa.String(20), nullable=False),
        sa.Column('cron_expression', sa.String(100), nullable=True),
        sa.Column('interval_seconds', sa.Integer(), nullable=True),
        sa.Column('run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('override_config', postgresql.JSONB(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Create execution_history table
    op.create_table(
        'execution_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('schedule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('input', postgresql.JSONB(), nullable=False),
        sa.Column('output', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['schedule_id'], ['schedules.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_schedules_agent_id', 'schedules', ['agent_id'])
    op.create_index('ix_schedules_enabled', 'schedules', ['enabled'])
    op.create_index('ix_schedules_next_run_at', 'schedules', ['next_run_at'])
    op.create_index('ix_execution_history_schedule_id', 'execution_history', ['schedule_id'])
    op.create_index('ix_execution_history_agent_id', 'execution_history', ['agent_id'])
    op.create_index('ix_execution_history_status', 'execution_history', ['status'])


def downgrade() -> None:
    op.drop_index('ix_execution_history_status', table_name='execution_history')
    op.drop_index('ix_execution_history_agent_id', table_name='execution_history')
    op.drop_index('ix_execution_history_schedule_id', table_name='execution_history')
    op.drop_index('ix_schedules_next_run_at', table_name='schedules')
    op.drop_index('ix_schedules_enabled', table_name='schedules')
    op.drop_index('ix_schedules_agent_id', table_name='schedules')
    op.drop_table('execution_history')
    op.drop_table('schedules')




