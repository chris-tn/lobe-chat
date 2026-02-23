"""Manual trigger MCP tools."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from ..db.session import get_db
from ..models.execution import ExecutionStatus
from ..services.executor import ExecutorService
from ..services.history import HistoryService
from ..services.scheduler import SchedulerService
from ..services.webhook import WebhookService


class TriggerNowInput(BaseModel):
    """Input for trigger_now tool."""

    schedule_id: str = Field(..., description="Schedule ID to trigger immediately")


async def trigger_now(input: TriggerNowInput) -> dict[str, Any]:
    """Manually trigger a schedule immediately."""
    db = await get_db()
    try:
        scheduler_service = SchedulerService(db)
        history_service = HistoryService(db)
        executor_service = ExecutorService()
        webhook_service = WebhookService()

        try:
            schedule_id = uuid.UUID(input.schedule_id)
        except ValueError:
            return {"error": f"Invalid schedule_id: {input.schedule_id}"}

        schedule = await scheduler_service.get_schedule(schedule_id)
        if not schedule:
            return {"error": f"Schedule not found: {input.schedule_id}"}

        if not schedule.enabled:
            return {"error": "Schedule is disabled"}

        # Create execution record
        input_data = {
            "question": schedule.question,
            "override_config": schedule.override_config,
        }
        execution = await history_service.create_execution(schedule, input_data)
        execution.status = ExecutionStatus.RUNNING

        # Execute with retry logic
        attempts = []
        last_error = None
        max_attempts = 3  # Initial + 2 retries

        for attempt_num in range(1, max_attempts + 1):
            try:
                execution = await executor_service.execute_schedule(schedule, execution)
                await history_service.update_execution(execution)
                await db.commit()

                if execution.status == ExecutionStatus.SUCCESS:
                    await scheduler_service.mark_schedule_executed(schedule)
                    await db.commit()
                    return {
                        "success": True,
                        "execution_id": str(execution.id),
                        "status": execution.status.value,
                        "output": execution.output,
                    }

                # If failed, prepare for retry
                attempts.append(
                    {
                        "attempt": attempt_num,
                        "error": execution.error_message,
                        "at": datetime.utcnow().isoformat(),
                    }
                )
                last_error = execution.error_message

            except Exception as e:
                last_error = str(e)
                attempts.append(
                    {
                        "attempt": attempt_num,
                        "error": last_error,
                        "at": datetime.utcnow().isoformat(),
                    }
                )

            # Wait before retry (except on last attempt)
            if attempt_num < max_attempts:
                import asyncio

                await asyncio.sleep(300)  # 5 minutes

        # All attempts failed - disable schedule and send webhook
        execution.status = ExecutionStatus.FAILED
        execution.error_message = f"Failed after {max_attempts} attempts: {last_error}"
        execution.finished_at = datetime.utcnow()
        if execution.started_at:
            duration = (execution.finished_at - execution.started_at).total_seconds() * 1000
            execution.duration_ms = int(duration)

        await history_service.update_execution(execution)
        await scheduler_service.disable_schedule(schedule)
        await webhook_service.send_schedule_disabled_notification(schedule, execution, attempts)
        await db.commit()

        return {
            "success": False,
            "execution_id": str(execution.id),
            "status": execution.status.value,
            "error": execution.error_message,
            "schedule_disabled": True,
        }
    finally:
        await db.close()



