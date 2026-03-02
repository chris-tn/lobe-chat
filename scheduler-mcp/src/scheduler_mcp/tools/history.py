"""Execution history MCP tools."""

import uuid
from typing import Any

from pydantic import BaseModel, Field

from ..db.session import get_db
from ..models.execution import ExecutionStatus
from ..services.history import HistoryService


class GetExecutionHistoryInput(BaseModel):
    """Input for get_execution_history tool."""

    schedule_id: str | None = Field(None, description="Filter by schedule ID")
    agent_id: str | None = Field(None, description="Filter by agent ID")
    status: str | None = Field(None, description="Filter by status: 'pending', 'running', 'success', 'failed'")
    limit: int = Field(50, description="Maximum number of results")
    offset: int = Field(0, description="Offset for pagination")


async def get_execution_history(input: GetExecutionHistoryInput) -> dict[str, Any]:
    """Get execution history for schedules."""
    db = await get_db()
    try:
        history_service = HistoryService(db)

        # Parse status if provided
        status = None
        if input.status:
            try:
                status = ExecutionStatus(input.status.lower())
            except ValueError:
                return {"error": f"Invalid status: {input.status}"}

        # Parse schedule_id if provided
        schedule_id = None
        if input.schedule_id:
            try:
                schedule_id = uuid.UUID(input.schedule_id)
            except ValueError:
                return {"error": f"Invalid schedule_id: {input.schedule_id}"}

        executions = await history_service.get_execution_history(
            schedule_id=schedule_id,
            agent_id=input.agent_id,
            status=status,
            limit=input.limit,
            offset=input.offset,
        )

        return {
            "executions": [
                {
                    "id": str(e.id),
                    "schedule_id": str(e.schedule_id),
                    "agent_id": e.agent_id,
                    "status": e.status.value,
                    "started_at": e.started_at.isoformat(),
                    "finished_at": e.finished_at.isoformat() if e.finished_at else None,
                    "duration_ms": e.duration_ms,
                    "error_message": e.error_message,
                }
                for e in executions
            ],
            "count": len(executions),
        }
    finally:
        await db.close()



