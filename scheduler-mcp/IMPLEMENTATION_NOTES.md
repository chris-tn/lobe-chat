# Implementation Notes

## Environment Variables

### Scheduler MCP Server (.env)
All environment variables are documented in `.env.example`.

### LobeChat Side
Add to LobeChat's environment variables:
- `SCHEDULER_MCP_SERVER_URL`: URL of the scheduler MCP server (default: http://localhost:8000)
- `CRON_SECRET_TOKEN`: Secret token for authenticating cron calls (optional but recommended)

## FastMCP Integration

The FastMCP tool registration may need adjustment based on the actual FastMCP v2 API. The current implementation uses:
- `@router.tool()` decorator for tool definitions
- `mcp.include_router()` for registering routers

If FastMCP v2 uses a different API, adjust the tool registration in:
- `src/scheduler_mcp/tools/schedule.py`
- `src/scheduler_mcp/tools/history.py`
- `src/scheduler_mcp/tools/trigger.py`
- `src/scheduler_mcp/main.py`

## Database Setup

1. Start PostgreSQL (using docker-compose or your own instance):
```bash
docker-compose up -d
```

2. Update `.env` with correct `DATABASE_URL`

3. Run migrations:
```bash
alembic upgrade head
```

## Testing

Run tests with:
```bash
pytest tests/
```

## Retry Logic

The retry logic is implemented in:
- `src/scheduler_mcp/services/executor.py`: Handles retries with 5-minute delays
- `src/scheduler_mcp/services/trigger_service.py`: Orchestrates execution with retry and webhook notification

Retry flow:
1. Initial attempt
2. If fails, wait 5 minutes
3. Retry attempt 1
4. If fails, wait 5 minutes  
5. Retry attempt 2
6. If all fail, disable schedule and send webhook

## Webhook Notification

When a schedule is disabled due to failures, a webhook is sent to `WEBHOOK_NOTIFICATION_URL` with:
- Event type: "schedule_disabled"
- Schedule details
- Error information
- All attempt details

## Cron Integration

The scheduler MCP server provides a cron endpoint at `/cron/scheduler` (or `/trigger-pending`) that should be called periodically (e.g., every 1 minute) by:
- Vercel Cron Jobs
- Cloudflare Cron Triggers
- AWS EventBridge
- Or any other cron service

**Endpoint URL**: `http://<scheduler-mcp-host>:8004/cron/scheduler`

**Authentication**: 
- Set `CRON_SECRET_TOKEN` in environment variables
- Pass token via:
  - Authorization header: `Authorization: Bearer YOUR_SECRET_TOKEN`
  - Query parameter: `?secret=YOUR_SECRET_TOKEN`

**Example cron call**:
```bash
curl -X POST "http://localhost:8004/cron/scheduler?secret=YOUR_SECRET_TOKEN"
# or
curl -X POST "http://localhost:8004/cron/scheduler" \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

The endpoint triggers all pending schedules and returns a summary of triggered and failed executions.



