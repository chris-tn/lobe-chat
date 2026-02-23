"""Pytest configuration and fixtures."""

import os

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.scheduler_mcp.models.base import Base


@pytest_asyncio.fixture
async def db_session():
    """
    Provide an async database session for tests.
    Uses DATABASE_URL from environment (e.g. test database).
    """
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://scheduler_user:scheduler_pass@localhost:5433/scheduler_db",
    )
    engine = create_async_engine(database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with async_session() as session:
        try:
            yield session
            await session.rollback()
        finally:
            await session.close()
    await engine.dispose()
