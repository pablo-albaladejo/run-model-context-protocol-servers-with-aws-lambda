import { logger } from "@demo/shared";
import { NextFunction, Request, Response } from "express";
import { MetricsService } from "../services/metrics-service";

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  startTime: number;
}

export interface LoggedRequest extends Request {
  context: RequestContext;
}

export class StructuredLoggingMiddleware {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * Middleware to add structured logging to requests
   */
  middleware() {
    return (req: LoggedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      const ipAddress = this.getClientIP(req);
      const userAgent = req.get("User-Agent");

      // Create request context
      req.context = {
        requestId,
        userAgent,
        ipAddress,
        startTime,
      };

      // Log request start
      logger.info("Request started", {
        requestId,
        method: req.method,
        url: req.url,
        userAgent,
        ipAddress,
        userId: req.context.userId,
        sessionId: req.context.sessionId,
        headers: this.sanitizeHeaders(req.headers),
      });

      // Override response methods to log response
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      res.send = function (body: any) {
        this.logResponse(startTime, requestId, body);
        return originalSend.call(this, body);
      }.bind(this);

      res.json = function (body: any) {
        this.logResponse(startTime, requestId, body);
        return originalJson.call(this, body);
      }.bind(this);

      res.end = function (chunk?: any) {
        this.logResponse(startTime, requestId, chunk);
        return originalEnd.call(this, chunk);
      }.bind(this);

      next();
    };
  }

  /**
   * Log response with performance metrics
   */
  private logResponse(startTime: number, requestId: string, body: any) {
    const duration = Date.now() - startTime;
    const statusCode = this.statusCode;

    // Log response
    logger.info("Request completed", {
      requestId,
      statusCode,
      duration,
      responseSize: this.getResponseSize(body),
      userId: (this.req as LoggedRequest).context?.userId,
      sessionId: (this.req as LoggedRequest).context?.sessionId,
    });

    // Record performance metrics
    this.recordPerformanceMetrics(duration, statusCode, requestId);
  }

  /**
   * Record performance metrics
   */
  private async recordPerformanceMetrics(
    duration: number,
    statusCode: number,
    requestId: string
  ): Promise<void> {
    try {
      const isError = statusCode >= 400;
      const operation = "http_request";

      await this.metricsService.recordPerformance(
        operation,
        duration,
        "api",
        (this.req as LoggedRequest).context?.userId
      );

      if (isError) {
        await this.metricsService.recordError(
          "HTTP_ERROR",
          statusCode.toString(),
          "api",
          (this.req as LoggedRequest).context?.userId
        );
      }
    } catch (error) {
      logger.error("Failed to record performance metrics", {
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = Array.isArray(value) ? value[0] : String(value);
      }
    });

    return sanitized;
  }

  /**
   * Get response size in bytes
   */
  private getResponseSize(body: any): number {
    if (!body) return 0;

    try {
      return Buffer.byteLength(JSON.stringify(body), "utf8");
    } catch {
      return Buffer.byteLength(String(body), "utf8");
    }
  }

  /**
   * Set user context for the request
   */
  setUserContext(req: LoggedRequest, userId: string, sessionId?: string): void {
    req.context.userId = userId;
    if (sessionId) {
      req.context.sessionId = sessionId;
    }

    logger.info("User context set", {
      requestId: req.context.requestId,
      userId,
      sessionId,
    });
  }

  /**
   * Log business events
   */
  logBusinessEvent(
    req: LoggedRequest,
    event: string,
    data: Record<string, any>
  ): void {
    logger.info("Business event", {
      requestId: req.context.requestId,
      event,
      userId: req.context.userId,
      sessionId: req.context.sessionId,
      data,
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    req: LoggedRequest,
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    data: Record<string, any>
  ): void {
    logger.warn("Security event", {
      requestId: req.context.requestId,
      event,
      severity,
      userId: req.context.userId,
      sessionId: req.context.sessionId,
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
      data,
    });
  }

  /**
   * Log error with context
   */
  logError(
    req: LoggedRequest,
    error: Error,
    additionalContext?: Record<string, any>
  ): void {
    logger.error("Request error", {
      requestId: req.context.requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      userId: req.context.userId,
      sessionId: req.context.sessionId,
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
      ...additionalContext,
    });
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    req: LoggedRequest,
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const logData = {
      requestId: req.context.requestId,
      operation,
      table,
      duration,
      success,
      userId: req.context.userId,
      sessionId: req.context.sessionId,
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
      };
    }

    if (success) {
      logger.debug("Database operation", logData);
    } else {
      logger.error("Database operation failed", logData);
    }
  }

  /**
   * Log external service calls
   */
  logExternalServiceCall(
    req: LoggedRequest,
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const logData = {
      requestId: req.context.requestId,
      service,
      operation,
      duration,
      success,
      userId: req.context.userId,
      sessionId: req.context.sessionId,
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
      };
    }

    if (success) {
      logger.debug("External service call", logData);
    } else {
      logger.error("External service call failed", logData);
    }
  }
}
