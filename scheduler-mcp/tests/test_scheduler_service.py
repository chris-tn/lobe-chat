"""Tests for SchedulerService."""

import pytest
from datetime import datetime, timedelta, timezone

from src.scheduler_mcp.models.schedule import Schedule, ScheduleType
from src.scheduler_mcp.services.scheduler import SchedulerService


@pytest.mark.asyncio
async def test_create_schedule(db_session):
    """Test creating a schedule."""
    service = SchedulerService(db_session)
    
    schedule = await service.create_schedule(
        name="Test Schedule",
        agent_id="agent_123",
        creator_agent_id="creator_456",
        user_email="test@example.com",
        schedule_type=ScheduleType.CRON,
        question="What is the weather?",
        cron_expression="0 9 * * *",
    )
    
    assert schedule.name == "Test Schedule"
    assert schedule.agent_id == "agent_123"
    assert schedule.schedule_type == ScheduleType.CRON
    assert schedule.next_run_at is not None


@pytest.mark.asyncio
async def test_calculate_next_run_time_cron(db_session):
    """Test calculating next run time for cron schedule."""
    service = SchedulerService(db_session)
    
    schedule = await service.create_schedule(
        name="Daily Schedule",
        agent_id="agent_123",
        creator_agent_id="creator_456",
        user_email="test@example.com",
        schedule_type=ScheduleType.CRON,
        question="Daily report",
        cron_expression="0 9 * * *",
    )
    
    assert schedule.next_run_at is not None
    now = datetime.now(timezone.utc)
    next_run = schedule.next_run_at if schedule.next_run_at.tzinfo else schedule.next_run_at.replace(tzinfo=timezone.utc)
    assert next_run > now


@pytest.mark.asyncio
async def test_calculate_next_run_time_interval(db_session):
    """Test calculating next run time for interval schedule."""
    service = SchedulerService(db_session)
    
    schedule = await service.create_schedule(
        name="Interval Schedule",
        agent_id="agent_123",
        creator_agent_id="creator_456",
        user_email="test@example.com",
        schedule_type=ScheduleType.INTERVAL,
        question="Check status",
        interval_seconds=3600,  # 1 hour
    )
    
    assert schedule.next_run_at is not None
    now = datetime.now(timezone.utc)
    expected = now + timedelta(seconds=3600)
    # Allow 5 second tolerance (schedule.next_run_at is timezone-aware)
    if schedule.next_run_at.tzinfo is None:
        schedule_next = schedule.next_run_at.replace(tzinfo=timezone.utc)
    else:
        schedule_next = schedule.next_run_at
    assert abs((schedule_next - expected).total_seconds()) < 5






