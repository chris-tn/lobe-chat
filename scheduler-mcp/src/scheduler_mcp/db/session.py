"""SQLAlchemy async session management."""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ..config import settings

# Global engine - will be created per event loop
_engines: dict[asyncio.AbstractEventLoop, object] = {}
_session_factories: dict[asyncio.AbstractEventLoop, async_sessionmaker] = {}


def get_engine():
    """Get or create engine for current event loop."""
    loop = asyncio.get_running_loop()
    if loop not in _engines:
        _engines[loop] = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
        )
    return _engines[loop]


def get_session_factory():
    """Get or create session factory for current event loop."""
    loop = asyncio.get_running_loop()
    if loop not in _session_factories:
        engine = get_engine()
        _session_factories[loop] = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factories[loop]


async def get_db() -> AsyncSession:
    """Get database session for current event loop."""
    factory = get_session_factory()
    return factory()



