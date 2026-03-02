.PHONY: help build up down logs shell test migrate clean

help:
	@echo "Available commands:"
	@echo "  make build      - Build Docker images"
	@echo "  make up         - Start services"
	@echo "  make down       - Stop services"
	@echo "  make logs       - View logs"
	@echo "  make shell      - Open shell in scheduler-mcp container"
	@echo "  make test       - Run tests"
	@echo "  make migrate    - Run database migrations"
	@echo "  make clean      - Clean up containers and volumes"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f scheduler-mcp

shell:
	docker-compose exec scheduler-mcp /bin/bash

test:
	docker-compose exec scheduler-mcp pytest tests/ -v

migrate:
	docker-compose exec scheduler-mcp python -m alembic upgrade head

migrate-create:
	docker-compose exec scheduler-mcp python -m alembic revision --autogenerate -m "$(MESSAGE)"

clean:
	docker-compose down -v
	docker system prune -f


