"""Configuration management using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str

    # LobeChat API
    lobechat_api_base_url: str
    lobechat_prediction_endpoint: str = "/api/v1/prediction"

    # Retry Configuration
    retry_max_attempts: int = 2
    retry_delay_seconds: int = 300  # 5 minutes

    # Webhook Notification
    webhook_notification_url: str | None = None

    # MCP Server
    mcp_server_host: str = "0.0.0.0"
    mcp_server_port: int = 8000

    # Auth
    cron_secret_token: str | None = None

    @property
    def prediction_api_url(self) -> str:
        """Get full prediction API URL."""
        base = self.lobechat_api_base_url.rstrip("/")
        endpoint = self.lobechat_prediction_endpoint.lstrip("/")
        return f"{base}/{endpoint}"


settings = Settings()






