import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionService } from "../../../domain/services/session-service";
import { container } from "../../../infrastructure/container";
import {
  logger,
  metrics,
} from "../../../infrastructure/middleware/powertools-middleware";

export const getSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.["sessionId"];
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
      sessionId: event.pathParameters?.["sessionId"],
      userId: (event as any).user.sub,
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
