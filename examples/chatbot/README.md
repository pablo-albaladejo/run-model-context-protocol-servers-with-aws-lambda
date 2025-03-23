# Simple Chatbot

This chatbot is capable of connecting to MCP servers running locally over stdio,
and connecting to MCP servers running in AWS Lambda.

Note: This example code is a fork of the example provided in the MCP Python SDK,
modified to use the Bedrock Converse API and to support Lambda function-based MCP servers:

https://github.com/modelcontextprotocol/python-sdk/tree/main/examples/clients/simple-chatbot

## Run

1. **Install the dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

1. **Configure servers:**

   Configure the servers you want to connect to in `servers_config.json`.
   The file uses a similar format to Claude Desktop.

   Here's an example for connecting to a stdio-based MCP server running locally:

   ```json
    {
      "stdioServers": {
        "time": {
          "command": "uvx",
          "args": ["mcp-server-time", "--local-timezone", "America/New_York"]
        }
      }
    }
   ```

  Here's an example for connecting to both stdio and Lambda function-based MCP servers.

   ```json
   {
   "stdioServers": {
      "fetch": {
         "command": "uvx",
         "args": ["mcp-server-fetch"]
      }
   },
   "lambdaFunctionServers": {
      "time": {
         "functionName": "mcp-server-time"
      }
   }
   }
   ```

## Usage

1. **Run the client:**

   ```bash
   python main.py
   ```

1. **Interact with the assistant:**

   The assistant will automatically detect available tools and can respond to queries based on the tools provided by the configured servers.

1. **Exit the session:**

   Type `quit` or `exit` to end the session.
