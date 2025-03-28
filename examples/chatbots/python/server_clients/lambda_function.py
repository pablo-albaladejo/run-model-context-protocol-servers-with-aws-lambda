import logging
from typing import Any

from mcp import ClientSession
from mcp_lambda import LambdaFunctionParameters, lambda_function_client

from server_clients.server import Server


class LambdaFunctionClient(Server):
    """Manages MCP server connections and tool execution for servers running in Lambda functions."""

    def __init__(self, name: str, config: dict[str, Any]) -> None:
        super().__init__(name, config)

    async def initialize(self) -> None:
        """Initialize the server connection."""
        function_name = self.config["functionName"]
        if function_name is None:
            raise ValueError(
                "The functionName must be a valid string and cannot be None."
            )
        region_name = self.config["region"]

        server_params = LambdaFunctionParameters(
            function_name=function_name,
            region_name=region_name,
        )
        try:
            self._client = lambda_function_client(server_params)
            self.read, self.write = await self._client.__aenter__()
            session = ClientSession(self.read, self.write)
            self.session = await session.__aenter__()
            await self.session.initialize()
        except Exception as e:
            logging.exception(
                f"Error initializing Lambda function client {self.name}: {e}"
            )
            raise
