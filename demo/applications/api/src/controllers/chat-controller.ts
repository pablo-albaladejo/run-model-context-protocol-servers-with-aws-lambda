import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Request, Response, Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { SendMessageUseCase } from "../application/use-cases/chat/send-message-use-case";
import { ChatMessageRepository } from "../domain/repositories/chat-message-repository";
import { MCPService } from "../domain/services/mcp-service";
import { SessionService } from "../domain/services/session-service";
import { container, TYPES } from "../infrastructure/container";
import {
  logger,
  metrics,
  MetricUnit,
} from "../infrastructure/middleware/powertools-middleware";
import { ValidationSchemas } from "../infrastructure/middleware/validation-middleware";
import { authenticateChatUser } from "../middleware/chat-auth-middleware";

const router = Router();
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({});

// Get services from container
const cacheService = container.get(TYPES.CacheService);
const metricsService = container.get(TYPES.MetricsService);
const validationMiddleware = container.get(TYPES.ValidationMiddleware);
const rateLimitMiddleware = container.get(TYPES.RateLimitMiddleware);

const CHAT_TABLE_NAME =
  process.env["CHAT_TABLE_NAME"] || "MCPDemoStack-dev-chat-messages";
const SESSIONS_TABLE_NAME =
  process.env["SESSIONS_TABLE_NAME"] || "MCPDemoStack-dev-user-sessions";
const WEATHER_ALERTS_FUNCTION_NAME =
  process.env["WEATHER_ALERTS_FUNCTION_NAME"] ||
  "MCPDemoStack-dev-weather-alerts";
const TIME_FUNCTION_NAME =
  process.env["TIME_FUNCTION_NAME"] || "MCPDemoStack-dev-time";

interface ChatMessage {
  sessionId: string;
  timestamp: string;
  message: string;
  sender: "user" | "assistant";
  ttl: number;
}

interface Session {
  sessionId: string;
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

// Apply chat authentication middleware to all chat routes
router.use(authenticateChatUser);

// Apply rate limiting to chat endpoints
router.use(rateLimitMiddleware.middleware());

// Create a new chat session
router.post(
  "/sessions",
  validationMiddleware.validate(ValidationSchemas.createSession),
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const sessionId = uuidv4();
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

      const session: Session = {
        sessionId,
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

      // Cache session data
      await cacheService.set(`session:${sessionId}`, session, 1800); // 30 minutes

      const duration = Date.now() - startTime;

      logger.info("New session created", {
        sessionId,
        userId: req.user.sub,
        correlationId: logger.getCorrelationId(),
        duration,
      });

      // Record metrics
      await metricsService.recordMetric("SessionCreated", 1, "Count");
      await metricsService.recordMetric(
        "SessionCreationTime",
        duration,
        "Milliseconds"
      );
      await metricsService.recordUserActivity(
        req.user.sub,
        "session_created",
        duration
      );

      metrics.addMetric("SessionsCreated", MetricUnit.Count, 1);

      res.status(201).json({
        sessionId,
        createdAt: now,
        message: "Session created successfully",
      });
    } catch (error) {
      const duration = Date.now() - (req as any).startTime || 0;

      logger.error("Error creating session", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.user.sub,
        correlationId: logger.getCorrelationId(),
        duration,
      });

      await metricsService.recordError(
        "SESSION_CREATION_ERROR",
        "500",
        "chat_controller",
        req.user.sub
      );
      metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

      res.status(500).json({
        error: "Failed to create session",
        message: "Internal server error",
      });
    }
  }
);

// Get session information
router.get("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { sessionId } = req.params;

    // Try to get from cache first
    let session = await cacheService.get<Session>(`session:${sessionId}`);

    if (!session) {
      // Cache miss - get from database
      const result = await docClient.send(
        new GetCommand({
          TableName: SESSIONS_TABLE_NAME,
          Key: { sessionId },
        })
      );

      if (!result.Item) {
        return res.status(404).json({
          error: "Session not found",
          message: "The specified session does not exist",
        });
      }

      session = result.Item as Session;

      // Cache the session
      await cacheService.set(`session:${sessionId}`, session, 1800);
    }

    const duration = Date.now() - startTime;

    logger.info("Session retrieved", {
      sessionId,
      userId: req.user.sub,
      correlationId: logger.getCorrelationId(),
      duration,
      cacheHit: !!session,
    });

    await metricsService.recordMetric("SessionRetrieved", 1, "Count");
    await metricsService.recordMetric(
      "SessionRetrievalTime",
      duration,
      "Milliseconds"
    );

    return res.json({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });
  } catch (error) {
    const duration = Date.now() - (req as any).startTime || 0;

    logger.error("Error getting session", {
      error: error instanceof Error ? error.message : String(error),
      sessionId: req.params["sessionId"],
      userId: req.user.sub,
      correlationId: logger.getCorrelationId(),
      duration,
    });

    await metricsService.recordError(
      "SESSION_RETRIEVAL_ERROR",
      "500",
      "chat_controller",
      req.user.sub
    );
    metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

    return res.status(500).json({
      error: "Failed to get session",
      message: "Internal server error",
    });
  }
});

// Send a message
router.post(
  "/messages",
  validationMiddleware.validate(ValidationSchemas.chatMessage),
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const { sessionId, message } = req.body;

      // Verify session exists (try cache first)
      let session = await cacheService.get<Session>(`session:${sessionId}`);

      if (!session) {
        const sessionResult = await docClient.send(
          new GetCommand({
            TableName: SESSIONS_TABLE_NAME,
            Key: { sessionId },
          })
        );

        if (!sessionResult.Item) {
          return res.status(404).json({
            error: "Session not found",
            message: "The specified session does not exist",
          });
        }

        session = sessionResult.Item as Session;
        await cacheService.set(`session:${sessionId}`, session, 1800);
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
      const assistantResponse = await processWithMCPServers(message);

      // Save assistant response
      const assistantMessage: ChatMessage = {
        sessionId,
        timestamp: new Date().toISOString(),
        message: assistantResponse,
        sender: "assistant",
        ttl,
      };

      await docClient.send(
        new PutCommand({
          TableName: CHAT_TABLE_NAME,
          Item: assistantMessage,
        })
      );

      // Update session last activity
      const updatedSession = {
        ...session,
        lastActivity: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: SESSIONS_TABLE_NAME,
          Item: updatedSession,
        })
      );

      // Update cache
      await cacheService.set(`session:${sessionId}`, updatedSession, 1800);

      // Invalidate message cache for this session
      await cacheService.invalidate(`messages:${sessionId}:*`);

      const duration = Date.now() - startTime;

      logger.info("Message processed", {
        sessionId,
        userId: req.user.sub,
        correlationId: logger.getCorrelationId(),
        messageLength: message.length,
        responseLength: assistantResponse.length,
        duration,
      });

      // Record metrics
      await metricsService.recordMetric("MessageProcessed", 1, "Count");
      await metricsService.recordMetric(
        "MessageProcessingTime",
        duration,
        "Milliseconds"
      );
      await metricsService.recordUserActivity(
        req.user.sub,
        "message_sent",
        duration
      );

      metrics.addMetric("MessagesProcessed", MetricUnit.Count, 1);

      res.json({
        sessionId,
        userMessage: {
          timestamp,
          message,
          sender: "user",
        },
        assistantMessage: {
          timestamp: assistantMessage.timestamp,
          message: assistantResponse,
          sender: "assistant",
        },
      });
    } catch (error) {
      const duration = Date.now() - (req as any).startTime || 0;

      logger.error("Error processing message", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: req.body.sessionId,
        userId: req.user.sub,
        correlationId: logger.getCorrelationId(),
        duration,
      });

      await metricsService.recordError(
        "MESSAGE_PROCESSING_ERROR",
        "500",
        "chat_controller",
        req.user.sub
      );
      metrics.addMetric("MessageErrors", MetricUnit.Count, 1);

      res.status(500).json({
        error: "Failed to process message",
        message: "Internal server error",
      });
    }
  }
);

// Get chat history
router.get("/messages/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query["limit"] as string) || 50;

    // Verify session exists
    const sessionResult = await docClient.send(
      new GetCommand({
        TableName: SESSIONS_TABLE_NAME,
        Key: { sessionId },
      })
    );

    if (!sessionResult.Item) {
      return res.status(404).json({
        error: "Session not found",
        message: "The specified session does not exist",
      });
    }

    // Get chat messages
    const result = await docClient.send(
      new QueryCommand({
        TableName: CHAT_TABLE_NAME,
        KeyConditionExpression: "sessionId = :sessionId",
        ExpressionAttributeValues: { ":sessionId": sessionId },
        ScanIndexForward: false, // Get most recent first
        Limit: limit,
      })
    );

    const messages = (result.Items || [])
      .map((item) => ({
        timestamp: item["timestamp"],
        message: item["message"],
        sender: item["sender"],
      }))
      .reverse(); // Reverse to get chronological order

    return res.json({
      sessionId,
      messages,
      count: messages.length,
    });
  } catch (error) {
    logger.error("Error getting chat history", {
      error,
      sessionId: req.params["sessionId"],
      userId: req.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

    return res.status(500).json({
      error: "Failed to get chat history",
      message: "Internal server error",
    });
  }
});

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
      userId: req.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("MCPServiceErrors", MetricUnit.Count, 1);

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

function extractLocation(message: string): string | null {
  // Simple location extraction - in a real app, you'd use NLP
  const locationMatch = message.match(/(?:in|at|for)\s+([a-zA-Z\s]+)/i);
  return locationMatch ? locationMatch[1]?.trim() || null : null;
}

function extractTimezone(message: string): string | null {
  // Simple timezone extraction
  const timezoneMatch = message.match(/(?:timezone|zone)\s+([a-zA-Z\/]+)/i);
  return timezoneMatch ? timezoneMatch[1]?.trim() || null : null;
}

export const createSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionService = container.get<SessionService>("SessionService");
    const sessionId = await sessionService.createSession(event.user.sub);

    logger.info("New session created", {
      sessionId,
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("SessionsCreated", MetricUnit.Count, 1);

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        sessionId,
        message: "Session created successfully",
      }),
    };
  } catch (error) {
    logger.error("Error creating session", {
      error: error instanceof Error ? error.message : String(error),
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to create session",
      }),
    };
  }
};

export const getSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          error: "Bad Request",
          message: "Session ID is required",
        }),
      };
    }

    const sessionService = container.get<SessionService>("SessionService");
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          error: "Not Found",
          message: "Session not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify(session),
    };
  } catch (error) {
    logger.error("Error getting session", {
      error: error instanceof Error ? error.message : String(error),
      sessionId: event.pathParameters?.sessionId,
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to get session",
      }),
    };
  }
};

export const processMessage = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { message, sessionId } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          error: "Bad Request",
          message: "Message is required",
        }),
      };
    }

    const sendMessageUseCase =
      container.get<SendMessageUseCase>("SendMessageUseCase");
    const result = await sendMessageUseCase.execute({
      message,
      sessionId,
      userId: event.user.sub,
    });

    logger.info("Message processed successfully", {
      messageId: result.messageId,
      sessionId: result.sessionId,
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("MessagesSent", MetricUnit.Count, 1);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error("Error processing message", {
      error: error instanceof Error ? error.message : String(error),
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("ValidationErrors", MetricUnit.Count, 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to process message",
      }),
    };
  }
};

export const getChatHistory = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          error: "Bad Request",
          message: "Session ID is required",
        }),
      };
    }

    const chatMessageRepository = container.get<ChatMessageRepository>(
      "ChatMessageRepository"
    );
    const messages = await chatMessageRepository.findBySessionId(sessionId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        messages,
        sessionId,
      }),
    };
  } catch (error) {
    logger.error("Error getting chat history", {
      error: error instanceof Error ? error.message : String(error),
      sessionId: event.pathParameters?.sessionId,
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to get chat history",
      }),
    };
  }
};

export const processMessageWithMCPServers = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { message, sessionId } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        body: JSON.stringify({
          error: "Bad Request",
          message: "Message is required",
        }),
      };
    }

    const mcpService = container.get<MCPService>("MCPService");
    const result = await mcpService.processMessage(message, sessionId);

    logger.info("Message processed with MCP servers", {
      sessionId,
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("MessagesSent", MetricUnit.Count, 1);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error("Error processing message with MCP servers", {
      error: error instanceof Error ? error.message : String(error),
      userId: event.user.sub,
      correlationId: logger.getCorrelationId(),
    });
    metrics.addMetric("MCPServiceErrors", MetricUnit.Count, 1);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "Failed to process message with MCP servers",
      }),
    };
  }
};

export { router as chatController };
