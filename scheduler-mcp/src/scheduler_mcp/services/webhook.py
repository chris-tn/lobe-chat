"""Webhook notification service."""

import asyncio
from datetime import datetime
from typing import Any

import httpx

from ..config import settings
from ..models.execution import ExecutionHistory
from ..models.schedule import Schedule


class WebhookService:
    """Service for sending webhook notifications."""

    async def send_schedule_disabled_notification(
        self,
        schedule: Schedule,
        execution: ExecutionHistory,
        attempts: list[dict[str, Any]],
    ) -> bool:
        """Send webhook notification when schedule is disabled.

        Args:
            schedule: Disabled schedule
            execution: Failed execution
            attempts: List of all attempts with errors

        Returns:
            True if sent successfully, False otherwise
        """
        if not settings.webhook_notification_url:
            return False

        payload = {
            "event": "schedule_disabled",
            "schedule_id": str(schedule.id),
            "schedule_name": schedule.name,
            "agent_id": schedule.agent_id,
            "reason": f"Failed after {len(attempts)} attempts",
            "last_error": execution.error_message,
            "attempts": attempts,
            "disabled_at": datetime.utcnow().isoformat(),
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(settings.webhook_notification_url, json=payload)
                response.raise_for_status()
                return True
        except Exception:
            # Don't fail if webhook fails
            return False






