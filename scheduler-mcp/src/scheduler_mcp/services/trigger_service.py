"""Service for triggering pending schedules."""

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models.execution import ExecutionStatus
from ..services.executor import ExecutorService
from ..services.history import HistoryService
from ..services.scheduler import SchedulerService
from ..services.webhook import WebhookService


class TriggerService:
    """Service for triggering pending schedules."""

    def __init__(self, db: AsyncSession):
        """Initialize trigger service.

        Args:
            db: Database session
        """
        self.db = db
        self.scheduler_service = SchedulerService(db)
        self.history_service = HistoryService(db)
        self.executor_service = ExecutorService()
        self.webhook_service = WebhookService()

    async def trigger_pending_schedules(self) -> dict[str, Any]:
        """Trigger all pending schedules.
        
        Uses queue-based retry: failed executions are rescheduled instead of sleeping.

        Returns:
            Dictionary with triggered and failed counts
        """
        pending_schedules = await self.scheduler_service.get_pending_schedules()
        triggered = 0
        failed = 0
        rescheduled = 0

        for schedule in pending_schedules:
            try:
                # Create execution record
                input_data = {
                    "question": schedule.question,
                    "override_config": schedule.override_config,
                }
                execution = await self.history_service.create_execution(schedule, input_data)
                execution.status = ExecutionStatus.RUNNING

                # Execute once (no retry loop - retries are handled by rescheduling)
                try:
                    execution = await self.executor_service.execute_schedule(schedule, execution)
                    await self.history_service.update_execution(execution)
                    await self.db.flush()

                    if execution.status == ExecutionStatus.SUCCESS:
                        await self.scheduler_service.mark_schedule_executed(schedule)
                        await self.db.commit()
                        triggered += 1
                    else:
                        # Failed - check retry count and reschedule if possible
                        retry_count = getattr(execution, 'retry_count', 0) or 0
                        max_attempts = 3  # Initial + 2 retries
                        
                        if retry_count < max_attempts - 1:
                            # Reschedule for retry (put back to queue)
                            retry_delay = timedelta(seconds=settings.retry_delay_seconds)
                            schedule.next_run_at = datetime.utcnow() + retry_delay
                            schedule.last_retry = retry_count + 1  # Update last_retry count
                            execution.retry_count = retry_count + 1
                            execution.status = ExecutionStatus.PENDING  # Reset to pending for retry
                            execution.error_message = f"Retry {retry_count + 1}/{max_attempts - 1}: {execution.error_message}"
                            await self.history_service.update_execution(execution)
                            await self.scheduler_service.update_schedule(schedule, next_run_at=schedule.next_run_at, last_retry=schedule.last_retry)
                            await self.db.commit()
                            rescheduled += 1
                        else:
                            # All retries exhausted - disable schedule
                            execution.status = ExecutionStatus.FAILED
                            execution.error_message = f"Failed after {max_attempts} attempts: {execution.error_message}"
                            execution.finished_at = datetime.utcnow()
                            if execution.started_at:
                                duration = (execution.finished_at - execution.started_at).total_seconds() * 1000
                                execution.duration_ms = int(duration)

                            await self.history_service.update_execution(execution)
                            await self.scheduler_service.disable_schedule(schedule)
                            await self.webhook_service.send_schedule_disabled_notification(
                                schedule,
                                execution,
                                [],  # Attempts not tracked in queue-based retry
                            )
                            await self.db.commit()
                            failed += 1

                except Exception as e:
                    # Handle exception during execution
                    retry_count = getattr(execution, 'retry_count', 0) or 0
                    max_attempts = 3
                    
                    if retry_count < max_attempts - 1:
                        # Reschedule for retry
                        retry_delay = timedelta(seconds=settings.retry_delay_seconds)
                        schedule.next_run_at = datetime.utcnow() + retry_delay
                        schedule.last_retry = retry_count + 1  # Update last_retry count
                        execution.retry_count = retry_count + 1
                        execution.status = ExecutionStatus.PENDING
                        execution.error_message = f"Retry {retry_count + 1}/{max_attempts - 1}: {str(e)}"
                        await self.history_service.update_execution(execution)
                        await self.scheduler_service.update_schedule(schedule, next_run_at=schedule.next_run_at, last_retry=schedule.last_retry)
                        await self.db.commit()
                        rescheduled += 1
                    else:
                        # All retries exhausted
                        execution.status = ExecutionStatus.FAILED
                        execution.error_message = f"Failed after {max_attempts} attempts: {str(e)}"
                        execution.finished_at = datetime.utcnow()
                        if execution.started_at:
                            duration = (execution.finished_at - execution.started_at).total_seconds() * 1000
                            execution.duration_ms = int(duration)
                        
                        await self.history_service.update_execution(execution)
                        await self.scheduler_service.disable_schedule(schedule)
                        await self.webhook_service.send_schedule_disabled_notification(
                            schedule,
                            execution,
                            [],
                        )
                        await self.db.commit()
                        failed += 1

            except Exception as e:
                # Log error but continue with other schedules
                print(f"Error triggering schedule {schedule.id}: {e}")
                failed += 1

        return {
            "triggered": triggered,
            "failed": failed,
            "rescheduled": rescheduled,
            "total": len(pending_schedules),
        }



