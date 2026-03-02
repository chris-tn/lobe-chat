"""Check database connection."""
import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def check_db():
    """Check if database is ready."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    
    try:
        engine = create_async_engine(database_url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception as e:
        print(f"Database check failed: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if asyncio.run(check_db()):
        sys.exit(0)
    else:
        sys.exit(1)

