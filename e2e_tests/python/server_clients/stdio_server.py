import logging
import os
import shutil
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from server_clients.server import Server


class StdioServer(Server):
    """Manages MCP server connections and tool execution for servers running locally over stdio."""

    def __init__(self, name: str, config: dict[str, Any]) -> None:
        super().__init__(name, config)

    async def initialize(self) -> None:
        """Initialize the server connection."""
        command = (
            shutil.which("npx")
            if self.config["command"] == "npx"
            else self.config["command"]
        )
        if command is None:
            raise ValueError("The command must be a valid string and cannot be None.")

        server_params = StdioServerParameters(
            command=command,
            args=self.config["args"],
            env=(
                {**os.environ, **self.config["env"]} if self.config.get("env") else None
            ),
        )
        try:
            self._client = stdio_client(server_params)
            self.read, self.write = await self._client.__aenter__()
            session = ClientSession(self.read, self.write)
            self.session = await session.__aenter__()
            await self.session.initialize()
        except Exception as e:
            logging.exception(f"Error initializing server {self.name}: {e}")
            raise
