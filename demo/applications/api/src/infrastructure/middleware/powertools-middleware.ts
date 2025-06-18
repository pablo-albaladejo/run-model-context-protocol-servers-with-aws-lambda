import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { Tracer } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";

// Initialize PowerTools
export const logger = new Logger({
  serviceName: "mcp-demo-api",
  logLevel: (process.env["LOG_LEVEL"] as any) || "INFO",
});

export const metrics = new Metrics({
  namespace: "MCPDemo",
  serviceName: "api",
});

export const tracer = new Tracer({
  serviceName: "mcp-demo-api",
});

// Business metrics tracking functions
export const trackBusinessMetric = {
  // User engagement metrics
  userLogin: () => metrics.addMetric("UserLogins", MetricUnit.Count, 1),
  userLogout: () => metrics.addMetric("UserLogouts", MetricUnit.Count, 1),
  sessionCreated: () =>
    metrics.addMetric("SessionsCreated", MetricUnit.Count, 1),
  sessionDeleted: () =>
    metrics.addMetric("SessionsDeleted", MetricUnit.Count, 1),

  // Chat metrics
  messageSent: () => metrics.addMetric("MessagesSent", MetricUnit.Count, 1),
  messageReceived: () =>
    metrics.addMetric("MessagesReceived", MetricUnit.Count, 1),
  chatSessionStarted: () =>
    metrics.addMetric("ChatSessionsStarted", MetricUnit.Count, 1),
  chatSessionEnded: () =>
    metrics.addMetric("ChatSessionsEnded", MetricUnit.Count, 1),

  // MCP service metrics
  mcpServiceCall: (serviceName: string) => {
    metrics.addMetric("MCPServiceCalls", MetricUnit.Count, 1);
    metrics.addDimension("Service", serviceName);
  },
  mcpServiceSuccess: (serviceName: string) => {
    metrics.addMetric("MCPServiceSuccess", MetricUnit.Count, 1);
    metrics.addDimension("Service", serviceName);
  },
  mcpServiceError: (serviceName: string) => {
    metrics.addMetric("MCPServiceErrors", MetricUnit.Count, 1);
    metrics.addDimension("Service", serviceName);
  },

  // Performance metrics
  requestDuration: (duration: number) =>
    metrics.addMetric("RequestDuration", MetricUnit.Milliseconds, duration),
  databaseQueryTime: (duration: number) =>
    metrics.addMetric("DatabaseQueryTime", MetricUnit.Milliseconds, duration),
  externalApiCallTime: (duration: number) =>
    metrics.addMetric("ExternalApiCallTime", MetricUnit.Milliseconds, duration),

  // Error metrics
  validationError: () =>
    metrics.addMetric("ValidationErrors", MetricUnit.Count, 1),
  authenticationError: () =>
    metrics.addMetric("AuthenticationErrors", MetricUnit.Count, 1),
  authorizationError: () =>
    metrics.addMetric("AuthorizationErrors", MetricUnit.Count, 1),
  databaseError: () => metrics.addMetric("DatabaseErrors", MetricUnit.Count, 1),
  externalServiceError: () =>
    metrics.addMetric("ExternalServiceErrors", MetricUnit.Count, 1),

  // Custom business metrics
  activeUsers: (count: number) =>
    metrics.addMetric("ActiveUsers", MetricUnit.Count, count),
  totalSessions: (count: number) =>
    metrics.addMetric("TotalSessions", MetricUnit.Count, count),
  messagesPerSession: (count: number) =>
    metrics.addMetric("MessagesPerSession", MetricUnit.Count, count),
};

// PowerTools middleware for Middy
export const powertoolsMiddleware = () => ({
  before: async (handler: middy.Request) => {
    const { event, context } = handler;

    // Add correlation ID to logger
    const correlationId =
      event.headers?.["x-correlation-id"] ||
      event.requestContext?.requestId ||
      context.awsRequestId;

    logger.setCorrelationId(correlationId);

    // Log request details
    logger.info("Request started", {
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers?.["user-agent"],
      correlationId,
    });

    // Add custom metrics
    metrics.addDimension("Environment", process.env["STAGE"] || "dev");
    metrics.addDimension("Function", context.functionName);

    // Start timing
    handler.context.startTime = Date.now();
  },

  after: async (handler: middy.Request) => {
    const { event, context } = handler;
    const duration = Date.now() - handler.context.startTime;

    // Log response details
    logger.info("Request completed", {
      method: event.httpMethod,
      path: event.path,
      statusCode: handler.response?.statusCode,
      duration,
      correlationId: logger.getCorrelationId(),
    });

    // Add performance metric
    trackBusinessMetric.requestDuration(duration);

    // Publish metrics
    await metrics.publishStoredMetrics();
  },

  onError: async (handler: middy.Request) => {
    const { error, event, context } = handler;
    const duration = Date.now() - handler.context.startTime;

    // Log error details
    logger.error("Request failed", {
      method: event.httpMethod,
      path: event.path,
      error: error?.message || "Unknown error",
      stack: error?.stack,
      duration,
      correlationId: logger.getCorrelationId(),
    });

    // Add error metrics
    trackBusinessMetric.validationError();

    // Publish metrics
    await metrics.publishStoredMetrics();
  },
});

// Performance monitoring middleware
export const performanceMiddleware = () => ({
  before: (handler: middy.Request) => {
    handler.context.startTime = Date.now();
  },

  after: (handler: middy.Request) => {
    const duration = Date.now() - handler.context.startTime;
    const { event } = handler;

    logger.info("Request performance", {
      method: event.httpMethod,
      path: event.path,
      duration,
      correlationId: logger.getCorrelationId(),
    });

    trackBusinessMetric.requestDuration(duration);
  },
});

// Error tracking middleware
export const errorTrackingMiddleware = () => ({
  onError: async (handler: middy.Request) => {
    const { error, event } = handler;

    // Categorize errors
    if (error?.name === "ValidationError") {
      trackBusinessMetric.validationError();
    } else if (error?.name === "DatabaseError") {
      trackBusinessMetric.databaseError();
    } else if (error?.name === "MCPServiceError") {
      trackBusinessMetric.externalServiceError();
    } else if (error?.name === "AuthError") {
      trackBusinessMetric.authenticationError();
    }

    logger.error("Request error", {
      method: event.httpMethod,
      path: event.path,
      error: error?.message || "Unknown error",
      errorType: error?.name || "Unknown",
      correlationId: logger.getCorrelationId(),
    });
  },
});

// Export types for use in other files
export type PowerToolsContext = {
  logger: Logger;
  metrics: Metrics;
  tracer: Tracer;
  correlationId: string;
};
