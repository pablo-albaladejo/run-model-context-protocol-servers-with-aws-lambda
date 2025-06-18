import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SendMessageUseCase } from "../application/use-cases/chat/send-message-use-case";
import { ChatMessageRepository } from "../domain/repositories/chat-message-repository";
import { MCPService } from "../domain/services/mcp-service";
import { SessionService } from "../domain/services/session-service";
import { container } from "../infrastructure/container";
import {
  logger,
  metrics,
} from "../infrastructure/middleware/powertools-middleware";

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
