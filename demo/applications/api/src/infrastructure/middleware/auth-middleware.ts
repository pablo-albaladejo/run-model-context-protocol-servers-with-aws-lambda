import { MetricUnit } from "@aws-lambda-powertools/metrics";
import middy from "@middy/core";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "./powertools-middleware";

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: {
    sub: string;
    username: string;
    email: string;
    role: string;
  };
}

export interface AdminEvent extends AuthenticatedEvent {
  user: {
    sub: string;
    username: string;
    email: string;
    role: string;
  };
}

export interface ChatEvent extends AuthenticatedEvent {
  user: {
    sub: string;
    username: string;
    email: string;
    role: string;
  };
}

// Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env["COGNITO_USER_POOL_ID"] || "",
  tokenUse: "access",
  clientId: process.env["COGNITO_CLIENT_ID"] || "",
});

export const authMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    before: async (handler) => {
      try {
        const event = handler.event as APIGatewayProxyEvent;
        const authHeader =
          event.headers.Authorization || event.headers.authorization;

        if (!authHeader) {
          logger.warn("No authorization header provided", {
            path: event.path,
            method: event.httpMethod,
            correlationId: logger.getCorrelationId(),
          });
          metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

          return {
            statusCode: 401,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type,Authorization",
              "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            },
            body: JSON.stringify({
              error: "Unauthorized",
              message: "No authorization header provided",
            }),
          };
        }

        const token = authHeader.replace("Bearer ", "");

        try {
          const payload = await verifier.verify(token);

          const authenticatedEvent = event as AuthenticatedEvent;
          authenticatedEvent.user = {
            sub: payload.sub || "",
            username:
              (payload.username as string) ||
              (payload["cognito:username"] as string) ||
              "",
            email: (payload["email"] as string) || "",
            role: (payload["custom:role"] as string) || "user",
          };

          logger.info("User authenticated", {
            userId: payload.sub,
            username: authenticatedEvent.user?.username,
            role: authenticatedEvent.user?.role,
            correlationId: logger.getCorrelationId(),
          });
        } catch (verifyError) {
          logger.warn("Token verification failed", {
            error: verifyError,
            correlationId: logger.getCorrelationId(),
          });
          metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

          return {
            statusCode: 401,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type,Authorization",
              "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            },
            body: JSON.stringify({
              error: "Unauthorized",
              message: "Invalid or expired token",
            }),
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error("Auth middleware error", {
          error: errorMessage,
          stack: errorStack,
          correlationId: logger.getCorrelationId(),
        });
        metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

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
            message: "Authentication service error",
          }),
        };
      }
    },
  };
};

export const adminAuthMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    before: async (handler) => {
      // First apply basic auth
      const authResult = await authMiddleware().before?.(handler);
      if (authResult) {
        return authResult;
      }

      const event = handler.event as AuthenticatedEvent;

      if (!event.user) {
        logger.warn("User not authenticated for admin endpoint", {
          correlationId: logger.getCorrelationId(),
        });
        metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

        return {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Unauthorized",
            message: "User not authenticated",
          }),
        };
      }

      // Check if user has admin role
      if (event.user.role !== "admin") {
        logger.warn("Non-admin user attempted to access admin endpoint", {
          userId: event.user.sub,
          username: event.user.username,
          role: event.user.role,
          path: (event as any).path,
          correlationId: logger.getCorrelationId(),
        });
        metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

        return {
          statusCode: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Forbidden",
            message: "Admin access required",
          }),
        };
      }

      // Cast to AdminEvent to ensure type safety
      handler.event = event as AdminEvent;

      logger.info("Admin user authenticated", {
        userId: event.user.sub,
        username: event.user.username,
        correlationId: logger.getCorrelationId(),
      });
    },
  };
};

export const chatAuthMiddleware = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => {
  return {
    before: async (handler) => {
      // First apply basic auth
      const authResult = await authMiddleware().before?.(handler);
      if (authResult) {
        return authResult;
      }

      const event = handler.event as AuthenticatedEvent;

      if (!event.user) {
        logger.warn("User not authenticated for chat endpoint", {
          correlationId: logger.getCorrelationId(),
        });
        metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

        return {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Unauthorized",
            message: "User not authenticated",
          }),
        };
      }

      // Check if user has chat role (user or admin)
      if (event.user.role !== "user" && event.user.role !== "admin") {
        logger.warn("Non-chat user attempted to access chat endpoint", {
          userId: event.user.sub,
          username: event.user.username,
          role: event.user.role,
          path: (event as any).path,
          correlationId: logger.getCorrelationId(),
        });
        metrics.addMetric("AuthFailures", MetricUnit.Count, 1);

        return {
          statusCode: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          },
          body: JSON.stringify({
            error: "Forbidden",
            message: "Chat access required",
          }),
        };
      }

      // Cast to ChatEvent to ensure type safety
      handler.event = event as ChatEvent;

      logger.info("Chat user authenticated", {
        userId: event.user.sub,
        username: event.user.username,
        role: event.user.role,
        correlationId: logger.getCorrelationId(),
      });
    },
  };
};
