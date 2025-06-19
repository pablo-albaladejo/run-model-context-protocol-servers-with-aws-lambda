import { logger } from "@demo/shared";
import { NextFunction, Request, Response } from "express";
import { container, TYPES } from "../container";

/**
 * Main application middleware that integrates all security and performance features
 */
export class AppMiddleware {
  private securityHeaders: any;
  private rateLimitMiddleware: any;
  private validationMiddleware: any;

  constructor() {
    // Get middleware instances from container
    this.securityHeaders = container.get(TYPES.SecurityHeadersMiddleware);
    this.rateLimitMiddleware = container.get(TYPES.RateLimitMiddleware);
    this.validationMiddleware = container.get(TYPES.ValidationMiddleware);
  }

  /**
   * Apply all middleware in the correct order
   */
  apply() {
    return [
      // 1. Security headers (first - applied to all responses)
      this.securityHeaders.middleware(),

      // 2. Request timing middleware
      this.timingMiddleware(),

      // 3. Request context middleware
      this.contextMiddleware(),

      // 4. Rate limiting (before validation to prevent abuse)
      this.rateLimitMiddleware.middleware(),

      // 5. Structured logging middleware
      this.structuredLoggingMiddleware(),
    ];
  }

  /**
   * Timing middleware to track request duration
   */
  private timingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Add timing info to request
      (req as any).startTime = startTime;

      // Track response time
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        (req as any).duration = duration;

        logger.debug("Request completed", {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get("User-Agent"),
          ipAddress: this.getClientIP(req),
        });
      });

      next();
    };
  }

  /**
   * Context middleware to add request context
   */
  private contextMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add request context
      (req as any).context = {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        userAgent: req.get("User-Agent"),
        ipAddress: this.getClientIP(req),
        userId: (req as any).user?.sub || "anonymous",
      };

      // Add correlation ID to response headers
      res.setHeader("X-Request-ID", (req as any).context.requestId);
      res.setHeader("X-Response-Time", "0ms"); // Will be updated by timing middleware

      next();
    };
  }

  /**
   * Structured logging middleware
   */
  private structuredLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = (req as any).context;

      logger.info("Request started", {
        method: req.method,
        url: req.url,
        requestId: context.requestId,
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        headers: this.sanitizeHeaders(req.headers),
      });

      next();
    };
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
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Apply validation to specific routes
   */
  applyValidation(schema: any) {
    return this.validationMiddleware.validate(schema);
  }

  /**
   * Apply rate limiting to specific routes
   */
  applyRateLimit(config: any) {
    return config.middleware();
  }
}

/**
 * Factory function to create app middleware
 */
export function createAppMiddleware(): AppMiddleware {
  return new AppMiddleware();
}

/**
 * Predefined middleware configurations for different route types
 */
export const MiddlewareConfigs = {
  // Public routes (minimal security)
  public: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
    validation: null, // No validation for public routes
  },

  // API routes (standard security)
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
    },
    validation: null, // Applied per endpoint
  },

  // Chat routes (aggressive rate limiting)
  chat: {
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 30,
    },
    validation: null, // Applied per endpoint
  },

  // Admin routes (strict security)
  admin: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 50,
    },
    validation: null, // Applied per endpoint
  },
};
