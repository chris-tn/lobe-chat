"""Schedule management MCP tools."""

import uuid
from typing import Any

from pydantic import BaseModel, Field

from ..db.session import get_db
from ..models.schedule import ScheduleType
from ..services.scheduler import SchedulerService


class CreateScheduleInput(BaseModel):
    """Input for create_schedule tool."""

    name: str = Field(..., description="Schedule name")
    agent_id: str = Field(..., description="Target agent ID to execute")
    schedule_type: str = Field(..., description="Schedule type: 'cron', 'interval', or 'one_time'")
    question: str = Field(..., description="Question/prompt to send to agent")
    creator_agent_id: str = Field(..., description="Agent ID that created this schedule")
    user_email: str = Field(..., description="User email for authentication")
    cron_expression: str | None = Field(None, description="Cron expression (for cron type)")
    interval_seconds: int | None = Field(None, description="Interval in seconds (for interval type)")
    run_at: str | None = Field(None, description="One-time execution time ISO datetime (for one_time type)")
    override_config: dict[str, Any] | None = Field(None, description="Additional config for prediction API")


class ListSchedulesInput(BaseModel):
    """Input for list_schedules tool."""

    agent_id: str | None = Field(None, description="Optional filter by agent ID. If not provided, returns all agents.")
    enabled: bool | None = Field(None, description="Optional filter by enabled status")
    limit: int = Field(50, description="Maximum number of results")
    offset: int = Field(0, description="Offset for pagination")


class UpdateScheduleInput(BaseModel):
    """Input for update_schedule tool."""

    schedule_id: str = Field(..., description="Schedule ID")
    enabled: bool | None = Field(None, description="Enable/disable schedule")
    cron_expression: str | None = Field(None, description="Update cron expression")
    interval_seconds: int | None = Field(None, description="Update interval seconds")
    run_at: str | None = Field(None, description="Update one-time execution time")
    question: str | None = Field(None, description="Update question")
    override_config: dict[str, Any] | None = Field(None, description="Update override config")


class DeleteScheduleInput(BaseModel):
    """Input for delete_schedule tool."""

    schedule_id: str = Field(..., description="Schedule ID to delete")


async def create_schedule(input: CreateScheduleInput) -> dict[str, Any]:
    """Create a new schedule for agent execution."""
    db = await get_db()
    try:
        scheduler_service = SchedulerService(db)

        # Parse schedule type
        try:
            schedule_type = ScheduleType(input.schedule_type.lower())
        except ValueError:
            return {"error": f"Invalid schedule_type: {input.schedule_type}"}

        # Parse run_at if provided
        run_at = None
        if input.run_at:
            from datetime import datetime

            try:
                run_at = datetime.fromisoformat(input.run_at.replace("Z", "+00:00"))
            except ValueError:
                return {"error": f"Invalid run_at format: {input.run_at}"}

        schedule = await scheduler_service.create_schedule(
            name=input.name,
            agent_id=input.agent_id,
            creator_agent_id=input.creator_agent_id,
            user_email=input.user_email,
            schedule_type=schedule_type,
            question=input.question,
            cron_expression=input.cron_expression,
            interval_seconds=input.interval_seconds,
            run_at=run_at,
            override_config=input.override_config,
        )

        await db.commit()

        return {
            "schedule_id": str(schedule.id),
            "name": schedule.name,
            "agent_id": schedule.agent_id,
            "next_run_at": schedule.next_run_at.isoformat() if schedule.next_run_at else None,
        }
    finally:
        await db.close()


async def list_schedules(input: ListSchedulesInput) -> dict[str, Any]:
    """List all schedules with optional filters. Returns all if no filters provided."""
    db = await get_db()
    try:
        scheduler_service = SchedulerService(db)
        schedules = await scheduler_service.list_schedules(
            agent_id=input.agent_id,
            enabled=input.enabled,
            limit=input.limit,
            offset=input.offset,
        )

        return {
            "schedules": [
                {
                    "schedule_id": str(s.id),
                    "name": s.name,
                    "agent_id": s.agent_id,
                    "schedule_type": s.schedule_type.value,
                    "enabled": s.enabled,
                    "next_run_at": s.next_run_at.isoformat() if s.next_run_at else None,
                    "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
                }
                for s in schedules
            ],
            "count": len(schedules),
        }
    finally:
        await db.close()


async def update_schedule(input: UpdateScheduleInput) -> dict[str, Any]:
    """Update an existing schedule."""
    db = await get_db()
    try:
        scheduler_service = SchedulerService(db)

        schedule = await scheduler_service.get_schedule(uuid.UUID(input.schedule_id))
        if not schedule:
            return {"error": f"Schedule not found: {input.schedule_id}"}

        update_data: dict[str, Any] = {}
        if input.enabled is not None:
            update_data["enabled"] = input.enabled
        if input.cron_expression is not None:
            update_data["cron_expression"] = input.cron_expression
        if input.interval_seconds is not None:
            update_data["interval_seconds"] = input.interval_seconds
        if input.run_at is not None:
            from datetime import datetime

            try:
                update_data["run_at"] = datetime.fromisoformat(input.run_at.replace("Z", "+00:00"))
            except ValueError:
                return {"error": f"Invalid run_at format: {input.run_at}"}
        if input.question is not None:
            update_data["question"] = input.question
        if input.override_config is not None:
            update_data["override_config"] = input.override_config

        schedule = await scheduler_service.update_schedule(schedule, **update_data)
        await db.commit()

        return {
            "schedule_id": str(schedule.id),
            "name": schedule.name,
            "enabled": schedule.enabled,
            "next_run_at": schedule.next_run_at.isoformat() if schedule.next_run_at else None,
        }
    finally:
        await db.close()


async def delete_schedule(input: DeleteScheduleInput) -> dict[str, Any]:
    """Delete a schedule."""
    db = await get_db()
    try:
        scheduler_service = SchedulerService(db)

        deleted = await scheduler_service.delete_schedule(uuid.UUID(input.schedule_id))
        if not deleted:
            return {"error": f"Schedule not found: {input.schedule_id}"}

        await db.commit()

        return {"success": True, "schedule_id": input.schedule_id}
    finally:
        await db.close()

