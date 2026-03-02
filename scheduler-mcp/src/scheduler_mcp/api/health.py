"""Health check endpoint."""

from fastapi import APIRouter
from sqlalchemy import text

from ..db.session import get_db

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    try:
        # Check database connection
        db = await get_db()
        try:
            await db.execute(text("SELECT 1"))
            return {
                "status": "healthy",
                "service": "scheduler-mcp",
            }
        finally:
            await db.close()
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "scheduler-mcp",
            "error": str(e),
        }


