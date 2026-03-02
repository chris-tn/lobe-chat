"""FastMCP server entry point."""

from fastapi import FastAPI
from fastmcp import FastMCP

from .api import health, trigger_pending
from .config import settings

# Create FastMCP app for MCP tools
mcp = FastMCP("SchedulerManagement")

# Register MCP tools using @mcp.tool decorator
# Import and register schedule tools
from .tools.schedule import (
    CreateScheduleInput,
    DeleteScheduleInput,
    ListSchedulesInput,
    UpdateScheduleInput,
    create_schedule,
    delete_schedule,
    list_schedules,
    update_schedule,
)

# Register tools with FastMCP using decorator
@mcp.tool
async def scheduler_create_schedule(
    name: str,
    agent_id: str,
    schedule_type: str,
    question: str,
    creator_agent_id: str,
    user_email: str,
    cron_expression: str | None = None,
    interval_seconds: int | None = None,
    run_at: str | None = None,
    override_config: dict | None = None,
) -> dict:
    """Create a new schedule for agent execution.
    
    Args:
        name: Schedule name
        agent_id: Target agent ID to execute
        schedule_type: Schedule type: 'cron', 'interval', or 'one_time'
        question: Question/prompt to send to agent
        creator_agent_id: Agent ID that created this schedule
        user_email: User email for authentication
        cron_expression: Cron expression (for cron type)
        interval_seconds: Interval in seconds (for interval type)
        run_at: One-time execution time ISO datetime (for one_time type)
        override_config: Additional config for prediction API
    """
    input_data = CreateScheduleInput(
        name=name,
        agent_id=agent_id,
        schedule_type=schedule_type,
        question=question,
        creator_agent_id=creator_agent_id,
        user_email=user_email,
        cron_expression=cron_expression,
        interval_seconds=interval_seconds,
        run_at=run_at,
        override_config=override_config,
    )
    return await create_schedule(input_data)


@mcp.tool
async def scheduler_list_schedules(
    agent_id: str | None = None,
    enabled: bool | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List all schedules with optional filters. If no filters provided, returns all schedules.
    
    Args:
        agent_id: Optional filter by agent ID. If not provided, returns schedules for all agents.
        enabled: Optional filter by enabled status
        limit: Maximum number of results
        offset: Offset for pagination
    """
    input_data = ListSchedulesInput(
        agent_id=agent_id,
        enabled=enabled,
        limit=limit,
        offset=offset,
    )
    return await list_schedules(input_data)


@mcp.tool
async def scheduler_update_schedule(
    schedule_id: str,
    enabled: bool | None = None,
    cron_expression: str | None = None,
    interval_seconds: int | None = None,
    run_at: str | None = None,
    question: str | None = None,
    override_config: dict | None = None,
) -> dict:
    """Update an existing schedule.
    
    Args:
        schedule_id: Schedule ID
        enabled: Enable/disable schedule
        cron_expression: Update cron expression
        interval_seconds: Update interval seconds
        run_at: Update one-time execution time
        question: Update question
        override_config: Update override config
    """
    input_data = UpdateScheduleInput(
        schedule_id=schedule_id,
        enabled=enabled,
        cron_expression=cron_expression,
        interval_seconds=interval_seconds,
        run_at=run_at,
        question=question,
        override_config=override_config,
    )
    return await update_schedule(input_data)


@mcp.tool
async def scheduler_delete_schedule(schedule_id: str) -> dict:
    """Delete a schedule.
    
    Args:
        schedule_id: Schedule ID to delete
    """
    input_data = DeleteScheduleInput(schedule_id=schedule_id)
    return await delete_schedule(input_data)


# Import and register history tools
from .tools.history import GetExecutionHistoryInput, get_execution_history


@mcp.tool
async def scheduler_get_execution_history(
    schedule_id: str | None = None,
    agent_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Get execution history for schedules.
    
    Args:
        schedule_id: Filter by schedule ID
        agent_id: Filter by agent ID
        status: Filter by status: 'pending', 'running', 'success', 'failed'
        limit: Maximum number of results
        offset: Offset for pagination
    """
    input_data = GetExecutionHistoryInput(
        schedule_id=schedule_id,
        agent_id=agent_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return await get_execution_history(input_data)


# Import and register trigger tools
from .tools.trigger import TriggerNowInput, trigger_now


@mcp.tool
async def scheduler_trigger_now(schedule_id: str) -> dict:
    """Manually trigger a schedule immediately.
    
    Args:
        schedule_id: Schedule ID to trigger immediately
    """
    input_data = TriggerNowInput(schedule_id=schedule_id)
    return await trigger_now(input_data)


# Create FastAPI app for HTTP endpoints (health, cron)
fastapi_app = FastAPI(
    title="SchedulerManagement HTTP API",
    description="HTTP API for scheduler management (health check, cron trigger)",
    version="0.1.0",
)

# Register HTTP API endpoints
fastapi_app.include_router(health.router)
fastapi_app.include_router(trigger_pending.router)


def main():
    """Run the MCP server with HTTP transport.
    
    According to FastMCP docs: https://github.com/jlowin/fastmcp
    Use mcp.run(transport="http") for HTTP/Streamable HTTP transport.
    
    FastMCP handles MCP protocol at /mcp endpoint.
    FastAPI handles HTTP endpoints like /health and /cron/scheduler.
    
    Note: FastAPI runs in a separate process/thread to avoid event loop conflicts.
    """
    import asyncio
    import threading
    import uvicorn
    
    # Start FastAPI server in background thread for HTTP endpoints
    # Use a new event loop for FastAPI to avoid conflicts
    def run_fastapi():
        # Create new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        http_port = settings.mcp_server_port + 1
        config = uvicorn.Config(
            fastapi_app,
            host=settings.mcp_server_host,
            port=http_port,
            log_level="info",
            loop="asyncio",
        )
        server = uvicorn.Server(config)
        loop.run_until_complete(server.serve())
    
    fastapi_thread = threading.Thread(target=run_fastapi, daemon=True)
    fastapi_thread.start()
    
    # Give FastAPI a moment to start
    import time
    time.sleep(1)
    
    print(f"FastMCP server starting on http://{settings.mcp_server_host}:{settings.mcp_server_port}/mcp")
    print(f"HTTP API (health, cron) on http://{settings.mcp_server_host}:{settings.mcp_server_port + 1}")
    print("MCP tools available:")
    print("  - scheduler_create_schedule")
    print("  - scheduler_list_schedules")
    print("  - scheduler_update_schedule")
    print("  - scheduler_delete_schedule")
    print("  - scheduler_get_execution_history")
    print("  - scheduler_trigger_now")
    print("\nHTTP endpoints:")
    print(f"  - http://{settings.mcp_server_host}:{settings.mcp_server_port + 1}/health")
    print(f"  - http://{settings.mcp_server_host}:{settings.mcp_server_port + 1}/trigger-pending")
    print(f"  - http://{settings.mcp_server_host}:{settings.mcp_server_port + 1}/cron/scheduler")
    
    # Run FastMCP with HTTP transport
    # This provides the MCP protocol endpoint at /mcp
    mcp.run(
        transport="http",
        host=settings.mcp_server_host,
        port=settings.mcp_server_port,
        path="/mcp",
    )


if __name__ == "__main__":
    main()
