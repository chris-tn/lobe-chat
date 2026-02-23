"""History service - manages execution history."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.execution import ExecutionHistory, ExecutionStatus
from ..models.schedule import Schedule


class HistoryService:
    """Service for managing execution history."""

    def __init__(self, db: AsyncSession):
        """Initialize history service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_execution(
        self,
        schedule: Schedule,
        input_data: dict[str, Any],
    ) -> ExecutionHistory:
        """Create a new execution history record.

        Args:
            schedule: Schedule being executed
            input_data: Input data sent to agent

        Returns:
            Created execution history record
        """
        execution = ExecutionHistory(
            schedule_id=schedule.id,
            agent_id=schedule.agent_id,
            status=ExecutionStatus.PENDING,
            started_at=datetime.utcnow(),
            input=input_data,
        )
        self.db.add(execution)
        await self.db.flush()
        return execution

    async def update_execution(
        self,
        execution: ExecutionHistory,
    ) -> ExecutionHistory:
        """Update execution history record.

        Args:
            execution: Execution to update

        Returns:
            Updated execution
        """
        await self.db.flush()
        return execution

    async def get_execution_history(
        self,
        schedule_id: uuid.UUID | None = None,
        agent_id: str | None = None,
        status: ExecutionStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ExecutionHistory]:
        """Get execution history with filters.

        Args:
            schedule_id: Filter by schedule ID
            agent_id: Filter by agent ID
            status: Filter by status
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of execution history records
        """
        query = select(ExecutionHistory)

        conditions = []
        if schedule_id:
            conditions.append(ExecutionHistory.schedule_id == schedule_id)
        if agent_id:
            conditions.append(ExecutionHistory.agent_id == agent_id)
        if status:
            conditions.append(ExecutionHistory.status == status)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(desc(ExecutionHistory.created_at)).limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())






