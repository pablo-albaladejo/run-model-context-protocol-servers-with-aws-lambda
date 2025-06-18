import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@demo/shared";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({});

const CHAT_TABLE_NAME = process.env.CHAT_TABLE_NAME!;
const SESSIONS_TABLE_NAME = process.env.SESSIONS_TABLE_NAME!;
const WEATHER_ALERTS_FUNCTION_NAME = process.env.WEATHER_ALERTS_FUNCTION_NAME!;
const TIME_FUNCTION_NAME = process.env.TIME_FUNCTION_NAME!;

interface ChatMessage {
  sessionId: string;
  timestamp: string;
  message: string;
  sender: "user" | "assistant";
  ttl: number;
}

interface Session {
  sessionId: string;
  connectionId: string;
  createdAt: string;
  lastActivity: string;
  ttl: number;
}

interface MCPRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { routeKey, connectionId, body } = event;
  const requestContext = event.requestContext;

  logger.info("WebSocket event received", {
    routeKey,
    connectionId,
    requestId: requestContext.requestId,
  });

  try {
    switch (routeKey) {
      case "$connect":
        return await handleConnect(connectionId!);
      case "$disconnect":
        return await handleDisconnect(connectionId!);
      case "$default":
        return await handleMessage(connectionId!, body!);
      default:
        logger.warn("Unknown route key", { routeKey });
        return { statusCode: 400, body: "Unknown route" };
    }
  } catch (error) {
    logger.error("Error handling WebSocket event", {
      error,
      routeKey,
      connectionId,
    });
    return { statusCode: 500, body: "Internal server error" };
  }
};

async function handleConnect(
  connectionId: string
): Promise<APIGatewayProxyResult> {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

  const session: Session = {
    sessionId,
    connectionId,
    createdAt: now,
    lastActivity: now,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: SESSIONS_TABLE_NAME,
      Item: session,
    })
  );

  logger.info("New WebSocket connection established", {
    connectionId,
    sessionId,
  });

  return { statusCode: 200, body: "Connected" };
}

async function handleDisconnect(
  connectionId: string
): Promise<APIGatewayProxyResult> {
  // Find and remove session
  const sessions = await docClient.send(
    new QueryCommand({
      TableName: SESSIONS_TABLE_NAME,
      IndexName: "connectionId-index",
      KeyConditionExpression: "connectionId = :connectionId",
      ExpressionAttributeValues: { ":connectionId": connectionId },
    })
  );

  if (sessions.Items && sessions.Items.length > 0) {
    const session = sessions.Items[0] as Session;
    await docClient.send(
      new DeleteCommand({
        TableName: SESSIONS_TABLE_NAME,
        Key: { sessionId: session.sessionId },
      })
    );
  }

  logger.info("WebSocket connection disconnected", { connectionId });

  return { statusCode: 200, body: "Disconnected" };
}

async function handleMessage(
  connectionId: string,
  body: string
): Promise<APIGatewayProxyResult> {
  const messageData = JSON.parse(body);
  const { sessionId, message } = messageData;

  if (!sessionId || !message) {
    return { statusCode: 400, body: "Missing sessionId or message" };
  }

  // Verify session exists
  const sessionResult = await docClient.send(
    new GetCommand({
      TableName: SESSIONS_TABLE_NAME,
      Key: { sessionId },
    })
  );

  if (!sessionResult.Item) {
    return { statusCode: 404, body: "Session not found" };
  }

  const session = sessionResult.Item as Session;
  if (session.connectionId !== connectionId) {
    return { statusCode: 403, body: "Unauthorized" };
  }

  // Save user message
  const timestamp = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

  const userMessage: ChatMessage = {
    sessionId,
    timestamp,
    message,
    sender: "user",
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: CHAT_TABLE_NAME,
      Item: userMessage,
    })
  );

  // Process message with MCP servers
  const assistantMessage = await processWithMCPServers(message);

  // Save assistant response
  const assistantTimestamp = new Date().toISOString();
  const assistantChatMessage: ChatMessage = {
    sessionId,
    timestamp: assistantTimestamp,
    message: assistantMessage,
    sender: "assistant",
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: CHAT_TABLE_NAME,
      Item: assistantChatMessage,
    })
  );

  // Send response back to client
  const response = {
    sessionId,
    message: assistantMessage,
    timestamp: assistantTimestamp,
  };

  await sendToConnection(connectionId, response);

  return { statusCode: 200, body: "Message processed" };
}

async function processWithMCPServers(userMessage: string): Promise<string> {
  try {
    // Simple keyword-based routing to MCP servers
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("weather") || lowerMessage.includes("alert")) {
      return await invokeWeatherAlertsServer(userMessage);
    } else if (lowerMessage.includes("time") || lowerMessage.includes("date")) {
      return await invokeTimeServer(userMessage);
    } else {
      return `I can help you with weather alerts and time information. Try asking about "weather alerts" or "current time".`;
    }
  } catch (error) {
    logger.error("Error processing message with MCP servers", {
      error,
      userMessage,
    });
    return "Sorry, I encountered an error processing your request.";
  }
}

async function invokeWeatherAlertsServer(message: string): Promise<string> {
  const mcpRequest: MCPRequest = {
    jsonrpc: "2.0",
    id: "1",
    method: "tools/call",
    params: {
      name: "get_weather_alerts",
      arguments: {
        location: extractLocation(message) || "default",
      },
    },
  };

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: WEATHER_ALERTS_FUNCTION_NAME,
      Payload: JSON.stringify(mcpRequest),
    })
  );

  const responsePayload = JSON.parse(
    new TextDecoder().decode(response.Payload)
  );
  const mcpResponse = responsePayload as MCPResponse;

  if (mcpResponse.error) {
    throw new Error(`MCP server error: ${mcpResponse.error.message}`);
  }

  return (
    mcpResponse.result?.content?.[0]?.text || "No weather alerts available."
  );
}

async function invokeTimeServer(message: string): Promise<string> {
  const mcpRequest: MCPRequest = {
    jsonrpc: "2.0",
    id: "1",
    method: "tools/call",
    params: {
      name: "get_current_time",
      arguments: {
        timezone: extractTimezone(message) || "UTC",
      },
    },
  };

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: TIME_FUNCTION_NAME,
      Payload: JSON.stringify(mcpRequest),
    })
  );

  const responsePayload = JSON.parse(
    new TextDecoder().decode(response.Payload)
  );
  const mcpResponse = responsePayload as MCPResponse;

  if (mcpResponse.error) {
    throw new Error(`MCP server error: ${mcpResponse.error.message}`);
  }

  return (
    mcpResponse.result?.content?.[0]?.text || "Unable to get current time."
  );
}

async function sendToConnection(
  connectionId: string,
  data: any
): Promise<void> {
  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: `https://${process.env.API_GATEWAY_ENDPOINT}`,
  });

  await apiGateway.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    })
  );
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractLocation(message: string): string | null {
  // Simple location extraction - in a real app, you'd use NLP
  const locationMatch = message.match(/(?:in|at|for)\s+([a-zA-Z\s]+)/i);
  return locationMatch ? locationMatch[1].trim() : null;
}

function extractTimezone(message: string): string | null {
  // Simple timezone extraction
  const timezoneMatch = message.match(/(?:timezone|zone)\s+([a-zA-Z\/]+)/i);
  return timezoneMatch ? timezoneMatch[1].trim() : null;
}
