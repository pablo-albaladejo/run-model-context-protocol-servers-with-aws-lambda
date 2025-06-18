import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SendMessageUseCase } from "../../../application/use-cases/chat/send-message-use-case";
import { container } from "../../../infrastructure/container";
import {
  logger,
  metrics,
} from "../../../infrastructure/middleware/powertools-middleware";

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
      userId: (event as any).user.sub,
    });

    logger.info("Message processed successfully", {
      sessionId: result.sessionId,
      userId: (event as any).user.sub,
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
      userId: (event as any).user.sub,
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
