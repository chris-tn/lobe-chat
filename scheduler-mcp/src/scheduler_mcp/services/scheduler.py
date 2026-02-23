"""Scheduler service - manages schedules and calculates next run times."""

import uuid
from datetime import datetime, timedelta
from typing import Any

from croniter import croniter
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.schedule import Schedule, ScheduleType


class SchedulerService:
    """Service for managing schedules."""

    def __init__(self, db: AsyncSession):
        """Initialize scheduler service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_schedule(
        self,
        name: str,
        agent_id: str,
        creator_agent_id: str,
        user_email: str,
        schedule_type: ScheduleType,
        question: str,
        cron_expression: str | None = None,
        interval_seconds: int | None = None,
        run_at: datetime | None = None,
        override_config: dict[str, Any] | None = None,
    ) -> Schedule:
        """Create a new schedule.

        Args:
            name: Schedule name
            agent_id: Target agent ID
            creator_agent_id: Agent that created this schedule
            user_email: User email for authentication
            schedule_type: Type of schedule
            question: Question to send to agent
            cron_expression: Cron expression (for cron type)
            interval_seconds: Interval in seconds (for interval type)
            run_at: One-time execution time (for one_time type)
            override_config: Additional config for prediction API

        Returns:
            Created schedule
        """
        schedule = Schedule(
            name=name,
            agent_id=agent_id,
            creator_agent_id=creator_agent_id,
            user_email=user_email,
            schedule_type=schedule_type,
            cron_expression=cron_expression,
            interval_seconds=interval_seconds,
            run_at=run_at,
            question=question,
            override_config=override_config,
            enabled=True,
        )

        # Calculate next run time
        schedule.next_run_at = self._calculate_next_run_time(schedule)

        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def get_schedule(self, schedule_id: uuid.UUID) -> Schedule | None:
        """Get schedule by ID.

        Args:
            schedule_id: Schedule ID

        Returns:
            Schedule or None if not found
        """
        result = await self.db.execute(select(Schedule).where(Schedule.id == schedule_id))
        return result.scalar_one_or_none()

    async def list_schedules(
        self,
        agent_id: str | None = None,
        enabled: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Schedule]:
        """List schedules with filters.

        Args:
            agent_id: Filter by agent ID
            enabled: Filter by enabled status
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of schedules
        """
        query = select(Schedule)

        conditions = []
        if agent_id:
            conditions.append(Schedule.agent_id == agent_id)
        if enabled is not None:
            conditions.append(Schedule.enabled == enabled)

        if conditions:
            query = query.where(and_(*conditions))

        query = query.order_by(Schedule.created_at.desc()).limit(limit).offset(offset)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_schedule(
        self,
        schedule: Schedule,
        **kwargs: Any,
    ) -> Schedule:
        """Update schedule fields.

        Args:
            schedule: Schedule to update
            **kwargs: Fields to update

        Returns:
            Updated schedule
        """
        for key, value in kwargs.items():
            if hasattr(schedule, key):
                setattr(schedule, key, value)

        # Recalculate next_run_at if schedule timing changed
        if any(k in kwargs for k in ["cron_expression", "interval_seconds", "run_at", "enabled"]):
            schedule.next_run_at = self._calculate_next_run_time(schedule)

        await self.db.flush()
        return schedule

    async def delete_schedule(self, schedule_id: uuid.UUID) -> bool:
        """Delete a schedule.

        Args:
            schedule_id: Schedule ID

        Returns:
            True if deleted, False if not found
        """
        schedule = await self.get_schedule(schedule_id)
        if not schedule:
            return False

        await self.db.delete(schedule)
        await self.db.flush()
        return True

    async def get_pending_schedules(self, now: datetime | None = None) -> list[Schedule]:
        """Get schedules that should be executed now.

        Args:
            now: Current time (defaults to UTC now)

        Returns:
            List of schedules ready to execute
        """
        if now is None:
            now = datetime.utcnow()

        query = select(Schedule).where(
            and_(
                Schedule.enabled == True,  # noqa: E712
                Schedule.next_run_at <= now,
            )
        )

        result = await self.db.execute(query)
        schedules = list(result.scalars().all())

        return schedules

    async def mark_schedule_executed(self, schedule: Schedule) -> Schedule:
        """Mark schedule as executed and calculate next run time.

        Args:
            schedule: Schedule that was executed

        Returns:
            Updated schedule
        """
        schedule.last_run_at = datetime.utcnow()
        schedule.last_retry = 0  # Reset retry count on success
        schedule.next_run_at = self._calculate_next_run_time(schedule)
        await self.db.flush()
        return schedule

    async def disable_schedule(self, schedule: Schedule) -> Schedule:
        """Disable a schedule.

        Args:
            schedule: Schedule to disable

        Returns:
            Updated schedule
        """
        schedule.enabled = False
        await self.db.flush()
        return schedule

    def _calculate_next_run_time(self, schedule: Schedule) -> datetime | None:
        """Calculate next run time for a schedule.

        Args:
            schedule: Schedule to calculate for

        Returns:
            Next run time or None if disabled or invalid
        """
        if not schedule.enabled:
            return None

        now = datetime.utcnow()

        if schedule.schedule_type == ScheduleType.CRON:
            if not schedule.cron_expression:
                return None
            try:
                cron = croniter(schedule.cron_expression, now)
                return cron.get_next(datetime)
            except Exception:
                return None

        elif schedule.schedule_type == ScheduleType.INTERVAL:
            if not schedule.interval_seconds:
                return None
            base_time = schedule.last_run_at if schedule.last_run_at else now
            return base_time + timedelta(seconds=schedule.interval_seconds)

        elif schedule.schedule_type == ScheduleType.ONE_TIME:
            if not schedule.run_at:
                return None
            # If run_at is in the past, return None (already executed)
            if schedule.run_at <= now:
                return None
            return schedule.run_at

        return None



