"""Schedule model."""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ScheduleType(PyEnum):
    """Schedule type enum."""

    CRON = "cron"
    INTERVAL = "interval"
    ONE_TIME = "one_time"


class Schedule(Base):
    """Schedule model for agent execution."""

    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(100), nullable=False)
    creator_agent_id: Mapped[str] = mapped_column(String(100), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)

    schedule_type: Mapped[ScheduleType] = mapped_column(
        Enum(ScheduleType, native_enum=False),
        nullable=False,
    )
    cron_expression: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    question: Mapped[str] = mapped_column(Text, nullable=False)
    override_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_retry: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    execution_history: Mapped[list["ExecutionHistory"]] = relationship(
        "ExecutionHistory",
        back_populates="schedule",
        cascade="all, delete-orphan",
    )

