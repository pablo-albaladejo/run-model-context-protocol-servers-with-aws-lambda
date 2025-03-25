import { Context } from 'aws-lambda';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  JSONRPCError,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCNotificationSchema,
  JSONRPCRequest,
  JSONRPCRequestSchema,
  JSONRPCResponse,
  McpError,
  ResultSchema,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.LOG_LEVEL?.toLowerCase() || 'info',
  format: format.simple(),
  transports: [new transports.Console()],
});

export async function stdioServerAdapter(
  serverParams: StdioServerParameters,
  event: JSONRPCMessage,
  context: Context
) {
  logger.debug(`Request: ${JSON.stringify(event)}`);
  const response = await handleMessage(serverParams, event, context);
  logger.debug(`Response: ${JSON.stringify(response)}`);
  return response;
}

async function handleMessage(
  serverParams: StdioServerParameters,
  event: JSONRPCMessage,
  context: Context
) {
  // Determine the type of the message
  try {
    const request = JSONRPCRequestSchema.parse(event);
    return await handleRequest(serverParams, request, context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      try {
        const notification = JSONRPCNotificationSchema.parse(event);
        return await handleNotification(serverParams, notification, context);
      } catch (notificationError) {
        if (notificationError instanceof z.ZodError) {
          return {
            jsonrpc: event.jsonrpc,
            id: 0,
            error: {
              code: ErrorCode.InvalidRequest,
              message:
                'Request is neither a valid JSON-RPC request nor a valid JSON-RPC notification',
            },
          } as JSONRPCError;
        } else {
          throw notificationError;
        }
      }
    } else {
      throw error;
    }
  }
}

async function handleNotification(
  _serverParams: StdioServerParameters,
  _event: JSONRPCNotification,
  _context: Context
) {
  // Ignore notifications
  logger.debug('Ignoring notification');
  return {};
}

async function handleRequest(
  serverParams: StdioServerParameters,
  event: JSONRPCRequest,
  _context: Context
): Promise<JSONRPCMessage> {
  logger.debug('Handling request');
  const { jsonrpc, id, ...request } = event;

  const client = new Client(
    {
      name: 'mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {},
      },
    }
  );

  try {
    const transport = new StdioClientTransport(serverParams);

    await client.connect(transport);

    const result = await client.request(request, ResultSchema);

    return {
      jsonrpc: jsonrpc,
      id: id,
      result: result,
    } as JSONRPCResponse;
  } catch (error) {
    if (error instanceof McpError) {
      logger.error(`MCP error: ${error}`);
      return {
        jsonrpc: jsonrpc,
        id: id,
        error: {
          code: error.code,
          message: error.message,
        },
      } as JSONRPCError;
    } else {
      logger.error(`General exception: ${error}`);
      return {
        jsonrpc: jsonrpc,
        id: id,
        error: {
          code: 500,
          message: 'Internal failure, please check Lambda function logs',
        },
      } as JSONRPCError;
    }
  } finally {
    try {
      await client.close();
    } catch (error) {
      logger.error(`Did not cleanly close client ${error}`);
    }
  }
}
