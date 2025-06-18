// Lambda handlers for MCP Demo API
// This file exports individual Lambda functions for serverless deployment

// Import individual handlers
import { createSession } from "./adapters/lambda/create-session.handler";
import { getChatHistory } from "./adapters/lambda/get-chat-history.handler";
import { getSession } from "./adapters/lambda/get-session.handler";
import { processMessageWithMCPServers } from "./adapters/lambda/process-message-with-mcp-servers.handler";
import { processMessage } from "./adapters/lambda/process-message.handler";

// Import middleware
import { chatAuthMiddleware } from "./infrastructure/middleware/auth-middleware";
import { powertoolsMiddleware } from "./infrastructure/middleware/powertools-middleware";

// Import Middy
import middy from "@middy/core";
import httpCors from "@middy/http-cors";
import httpErrorHandler from "@middy/http-error-handler";
import httpJsonBodyParser from "@middy/http-json-body-parser";

// Base handler with PowerTools middleware
const baseHandler = middy()
  .use(powertoolsMiddleware())
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(httpCors());

// Export individual handlers wrapped with middleware
export const createSessionHandler = baseHandler
  .use(chatAuthMiddleware())
  .handler(createSession);

export const getSessionHandler = baseHandler
  .use(chatAuthMiddleware())
  .handler(getSession);

export const processMessageHandler = baseHandler
  .use(chatAuthMiddleware())
  .handler(processMessage);

export const getChatHistoryHandler = baseHandler
  .use(chatAuthMiddleware())
  .handler(getChatHistory);

export const processMessageWithMCPServersHandler = baseHandler
  .use(chatAuthMiddleware())
  .handler(processMessageWithMCPServers);

// Health check handler (no auth required)
export const healthHandler = baseHandler.handler(async (): Promise<any> => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify({
      success: true,
      message: "Service is healthy",
      timestamp: new Date().toISOString(),
    }),
  };
});

// Default export for backward compatibility
export { createSessionHandler as default };
