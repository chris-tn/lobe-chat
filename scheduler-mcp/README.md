# SchedulerManagement MCP Server

MCP Server for managing and triggering scheduled agent executions in LobeChat.

## Features

- Create, update, delete, and list schedules
- Support for cron, interval, and one-time schedules
- Automatic retry with 5-minute delays (2 retries after initial failure)
- Webhook notifications when schedules are disabled
- Execution history tracking

## Quick Start with Docker

### Using Docker Compose

1. Copy environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration

3. Start services:
```bash
make up
# or
docker-compose up -d
```

4. Run migrations:
```bash
# With Docker
docker-compose exec scheduler-mcp python -m alembic upgrade head

# Or locally (if you have Python environment set up)
cd scheduler-mcp
python -m alembic upgrade head
```

5. Check health:
```bash
curl http://localhost:8004/health
```

6. Setup cron job to trigger pending schedules (every 1 minute):
```bash
# Example with curl
curl -X POST "http://localhost:8004/cron/scheduler?secret=YOUR_SECRET_TOKEN"

# Or use cron service (Vercel, Cloudflare, AWS EventBridge, etc.)
# Configure to call: http://your-scheduler-mcp-host:8004/cron/scheduler
# With Authorization header: Bearer YOUR_SECRET_TOKEN
```

### Manual Installation

1. Install dependencies:
```bash
pip install -e .
```

2. Set up environment variables (copy `.env.example` to `.env` and configure):
```bash
cp .env.example .env
```

3. Run database migrations:
```bash
alembic upgrade head
```

4. Run the server:
```bash
python -m src.scheduler_mcp.main
```

## Configuration

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `LOBECHAT_API_BASE_URL`: Base URL of LobeChat instance
- `RETRY_MAX_ATTEMPTS`: Number of retries (default: 2)
- `RETRY_DELAY_SECONDS`: Delay between retries in seconds (default: 300 = 5 minutes)
- `WEBHOOK_NOTIFICATION_URL`: Webhook URL for notifications

## Docker Commands

```bash
# Build images
make build

# Start services
make up

# View logs
make logs

# Open shell in container
make shell

# Run tests
make test

# Run migrations
make migrate

# Create new migration
make migrate-create MESSAGE="description"

# Stop services
make down

# Clean up everything
make clean
```

## MCP Tools

### create_schedule
Create a new schedule for agent execution.

### list_schedules
List all schedules with optional filters.

### update_schedule
Update an existing schedule.

### delete_schedule
Delete a schedule.

### get_execution_history
Get execution history for schedules.

### trigger_now
Manually trigger a schedule immediately.

## API Endpoints

### GET /health
Health check endpoint.

### POST /trigger-pending
Trigger all pending schedules. Called by LobeChat cron endpoint.

## Error Handling

- Network failures: Retry 2 times with 5-minute delays
- After all retries fail: Schedule is disabled and webhook notification is sent
- HTTP 4xx errors: No retry, error is recorded
- HTTP 401/403: Schedule disabled immediately

## Development

### Running Tests

```bash
# With Docker
make test

# Locally
pytest tests/ -v
```

### Creating Migrations

```bash
# With Docker
make migrate-create MESSAGE="add new field"

# Locally
alembic revision --autogenerate -m "add new field"
```
