import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SessionService } from "../../../domain/services/session-service";
import { container } from "../../../infrastructure/container";
import {
  logger,
  metrics,
} from "../../../infrastructure/middleware/powertools-middleware";

export const createSession = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionService = container.get<SessionService>("SessionService");
    const sessionId = await sessionService.createSession(
      (event as any).user.sub
    );

    logger.info("New session created", {
      sessionId,
      userId: (event as any).user.sub,
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
        message: "Failed to create session",
      }),
    };
  }
};
