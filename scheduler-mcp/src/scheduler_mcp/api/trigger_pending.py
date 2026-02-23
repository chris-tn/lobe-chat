"""API endpoint for triggering pending schedules."""

import asyncio
from fastapi import APIRouter, HTTPException, Header, Query, Request, BackgroundTasks

from ..config import settings
from ..db.session import get_db
from ..services.trigger_service import TriggerService

router = APIRouter()


@router.get("/cron/scheduler")
@router.post("/cron/scheduler")
@router.post("/trigger-pending")
async def trigger_pending(
    request: Request,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(None),
    secret: str | None = Query(None),
) -> dict:
    """Trigger all pending schedules (async, non-blocking).
    
    This endpoint should be called periodically (e.g., every 1 minute) by:
    - Vercel Cron Jobs
    - Cloudflare Cron Triggers
    - AWS EventBridge
    - Or any other cron service
    
    Authentication: Use CRON_SECRET_TOKEN in Authorization header or query parameter
    Example: 
      - Authorization: Bearer YOUR_SECRET_TOKEN
      - /cron/scheduler?secret=YOUR_SECRET_TOKEN
    
    Returns immediately after queuing tasks. Actual execution happens in background.
    """
    # Check authentication if secret token is configured
    if settings.cron_secret_token:
        token = None
        
        # Check Authorization header
        if authorization:
            token = authorization.replace("Bearer ", "").strip()
        
        # Check query parameter
        if not token and secret:
            token = secret
        
        if not token or token != settings.cron_secret_token:
            raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Run trigger in background task to avoid blocking
    async def trigger_async():
        db = await get_db()
        try:
            trigger_service = TriggerService(db)
            await trigger_service.trigger_pending_schedules()
            await db.commit()
        except Exception as e:
            print(f"Error in background trigger: {e}")
        finally:
            await db.close()
    
    # Add background task
    background_tasks.add_task(trigger_async)
    
    # Return immediately
    return {
        "status": "queued",
        "message": "Trigger tasks queued for background execution",
    }

