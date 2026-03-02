"""Executor service - calls LobeChat prediction API with retry logic."""

import asyncio
from datetime import datetime
from typing import Any

import requests

from ..config import settings
from ..models.execution import ExecutionHistory, ExecutionStatus
from ..models.schedule import Schedule


class ExecutorService:
    """Service for executing agent calls with retry logic."""

    def __init__(self):
        """Initialize executor service."""
        self.max_attempts = settings.retry_max_attempts + 1  # +1 for initial attempt
        self.retry_delay = settings.retry_delay_seconds

    async def execute_schedule(
        self,
        schedule: Schedule,
        execution: ExecutionHistory,
    ) -> ExecutionHistory:
        """Execute a schedule (single attempt, no retry loop).
        
        Retries are handled by rescheduling in trigger_service.

        Args:
            schedule: Schedule to execute
            execution: Execution history record

        Returns:
            Updated execution history record
        """
        try:
            result = await self._call_prediction_api(schedule)
            execution.status = ExecutionStatus.SUCCESS
            execution.output = result.get("output", "")
            execution.finished_at = datetime.utcnow()
            if execution.started_at:
                duration = (execution.finished_at - execution.started_at).total_seconds() * 1000
                execution.duration_ms = int(duration)
            execution.error_message = None
            return execution

        except Exception as e:
            # Single attempt failed - let trigger_service handle retry via rescheduling
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.finished_at = None  # Keep open for retry
            execution.duration_ms = None
            execution.output = None
            return execution

    async def _call_prediction_api(self, schedule: Schedule) -> dict[str, Any]:
        """Call LobeChat prediction API and handle streaming response.

        Args:
            schedule: Schedule containing agent and question info

        Returns:
            API response with output text

        Raises:
            requests.RequestException: If API call fails
        """
        url = f"{settings.prediction_api_url}/{schedule.agent_id}"

        payload = {
            "question": schedule.question,
            "streaming": True,  # API returns stream, we'll parse it
        }

        if schedule.override_config:
            payload["overrideConfig"] = schedule.override_config

        # Ensure aUser is set for authentication
        if "overrideConfig" not in payload:
            payload["overrideConfig"] = {}
        payload["overrideConfig"]["aUser"] = schedule.user_email

        # Run requests in thread pool to avoid blocking event loop
        def call_api():
            response = requests.post(
                url,
                json=payload,
                timeout=300.0,
                headers={"Content-Type": "application/json"},
                stream=True,  # Enable streaming
            )
            response.raise_for_status()
            return response

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, call_api)
        
        # Parse SSE (Server-Sent Events) stream
        # Format: "event: <type>\ndata: <data>\n\n"
        accumulated_content = ""
        final_usage = None
        tool_results = []
        source_documents = []
        current_event_type = ""
        
        # Process stream line by line
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                # Empty line indicates end of event
                current_event_type = ""
                continue
            
            line = line.strip()
            if not line:
                continue
            
            # Track event type
            if line.startswith("event:"):
                current_event_type = line[6:].strip()
                continue
            
            # Process data line
            if line.startswith("data:"):
                data_str = line[5:].strip()  # Remove "data:" prefix
                if data_str == "[DONE]":
                    break
                
                # Handle different event types based on current_event_type
                if current_event_type == "text" or (not current_event_type and data_str):
                    # Text content - can be string or JSON with event/data structure
                    try:
                        # Try parsing as JSON first (Flowise format: {"event": "token", "data": "text"})
                        import json
                        if data_str.startswith("{") or data_str.startswith("["):
                            parsed = json.loads(data_str)
                            if isinstance(parsed, dict):
                                # Check for Flowise format
                                if "event" in parsed and "data" in parsed:
                                    if parsed["event"] == "token":
                                        accumulated_content += str(parsed["data"])
                                elif "data" in parsed:
                                    accumulated_content += str(parsed["data"])
                                elif "text" in parsed:
                                    accumulated_content += str(parsed["text"])
                                elif "content" in parsed:
                                    accumulated_content += str(parsed["content"])
                                else:
                                    # Unknown format, try to extract text
                                    accumulated_content += str(parsed)
                            else:
                                accumulated_content += str(parsed)
                        else:
                            # Plain text
                            accumulated_content += data_str
                    except (json.JSONDecodeError, Exception):
                        # If not JSON, treat as plain text
                        accumulated_content += data_str
                
                elif current_event_type == "usage" or current_event_type == "usageMetadata":
                    try:
                        import json
                        final_usage = json.loads(data_str) if isinstance(data_str, str) else data_str
                    except Exception:
                        pass
                
                elif current_event_type == "usedTools":
                    try:
                        import json
                        tools = json.loads(data_str) if isinstance(data_str, str) else data_str
                        if isinstance(tools, list):
                            tool_results.extend(tools)
                        else:
                            tool_results.append(tools)
                    except Exception:
                        pass
                
                elif current_event_type == "sourceDocuments":
                    try:
                        import json
                        docs = json.loads(data_str) if isinstance(data_str, str) else data_str
                        if isinstance(docs, list):
                            source_documents.extend(docs)
                        else:
                            source_documents.append(docs)
                    except Exception:
                        pass
        
        # Return accumulated content
        return {
            "output": accumulated_content,
            "usage": final_usage,
            "tool_results": tool_results if tool_results else None,
            "source_documents": source_documents if source_documents else None,
        }