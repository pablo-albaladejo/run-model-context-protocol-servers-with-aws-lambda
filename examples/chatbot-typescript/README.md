# TypeScript MCP Chatbot Example

This example demonstrates how to build a simple chatbot that uses the Model Context Protocol (MCP) to interact with various tools. The chatbot uses AWS Bedrock for the LLM and connects to both local MCP servers and Lambda-based MCP servers.

## Features

- Connects to local MCP servers using stdio
- Connects to remote MCP servers running in AWS Lambda
- Uses AWS Bedrock Claude model for chat interactions
- Supports tool use through the MCP protocol
- Uses Winston for structured logging

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Make sure you have AWS credentials configured with access to AWS Bedrock and the Lambda functions.

## Running the Chatbot

Start the chatbot:

```bash
npm start
```

You can interact with the chatbot by typing messages. The chatbot will respond and may use tools when appropriate.

## Available Tools

The chatbot connects to three servers:

1. The Lambda function-based 'time' MCP server
   - Ask: "What is the current time?"

2. The Lambda function-based 'weather-alerts' MCP server
   - Ask: "Are there any weather alerts right now?"

3. A local 'fetch' MCP server
   - Ask: "Who is Tom Cruise?"

Type 'quit' or 'exit' to end the session.

## Configuration

The servers are configured in `servers_config.json`. You can modify this file to add or remove servers.

## Logging

The application uses Winston for logging. You can control the log level using environment variables:

```bash
# For normal operation
npm start

# For debug logging
LOG_LEVEL=debug npm start

# Alternative debug mode
DEBUG=true npm start
```
