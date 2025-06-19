import { logger } from "@demo/shared";
import { NextFunction, Request, Response } from "express";
import { MetricsService } from "../services/metrics-service";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Error message
  statusCode?: number; // HTTP status code for rate limit exceeded
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  handler?: (req: Request, res: Response) => void; // Custom handler
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number;
}

export class RateLimitMiddleware {
  private store: Map<string, { count: number; resetTime: number }>;
  private metricsService: MetricsService;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.store = new Map();
    this.metricsService = new MetricsService();
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests per window default
      message: "Too many requests, please try again later.",
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Rate limiting middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKey(req);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Get current rate limit info
        const current = this.store.get(key);
        let count = 0;
        let resetTime = new Date(now + this.config.windowMs);

        if (current) {
          // Check if window has expired
          if (current.resetTime <= now) {
            // Reset counter for new window
            count = 1;
            resetTime = new Date(now + this.config.windowMs);
          } else {
            // Increment counter in current window
            count = current.count + 1;
            resetTime = new Date(current.resetTime);
          }
        } else {
          // First request in window
          count = 1;
        }

        // Update store
        this.store.set(key, {
          count,
          resetTime: resetTime.getTime(),
        });

        // Check if rate limit exceeded
        if (count > this.config.maxRequests) {
          const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

          // Record rate limit event
          await this.recordRateLimitEvent(req, key, count);

          // Set rate limit headers
          res.set({
            "X-RateLimit-Limit": this.config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toISOString(),
            "Retry-After": retryAfter.toString(),
          });

          // Log rate limit exceeded
          logger.warn("Rate limit exceeded", {
            key,
            count,
            limit: this.config.maxRequests,
            ipAddress: this.getClientIP(req),
            userAgent: req.get("User-Agent"),
            userId: (req as any).context?.userId,
          });

          // Handle rate limit exceeded
          if (this.config.handler) {
            this.config.handler(req, res);
          } else {
            res.status(this.config.statusCode!).json({
              success: false,
              error: "RATE_LIMIT_EXCEEDED",
              message: this.config.message,
              retryAfter,
            });
          }

          return;
        }

        // Set rate limit headers for successful requests
        res.set({
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": (this.config.maxRequests - count).toString(),
          "X-RateLimit-Reset": resetTime.toISOString(),
        });

        // Skip counting if configured
        if (
          (this.config.skipSuccessfulRequests && res.statusCode < 400) ||
          (this.config.skipFailedRequests && res.statusCode >= 400)
        ) {
          // Decrement count for skipped requests
          const current = this.store.get(key);
          if (current && current.count > 0) {
            this.store.set(key, {
              count: current.count - 1,
              resetTime: current.resetTime,
            });
          }
        }

        next();
      } catch (error) {
        logger.error("Rate limiting error", {
          error: error instanceof Error ? error.message : String(error),
          ipAddress: this.getClientIP(req),
        });
        // Continue without rate limiting on error
        next();
      }
    };
  }

  /**
   * Get rate limit key for the request
   */
  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default key generation based on IP and user
    const ip = this.getClientIP(req);
    const userId = (req as any).context?.userId || "anonymous";

    return `${ip}:${userId}`;
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
   * Record rate limit event for metrics
   */
  private async recordRateLimitEvent(
    req: Request,
    key: string,
    count: number
  ): Promise<void> {
    try {
      await this.metricsService.recordError(
        "RATE_LIMIT_EXCEEDED",
        "429",
        "rate_limiter",
        (req as any).context?.userId
      );

      await this.metricsService.recordUserActivity(
        (req as any).context?.userId || "anonymous",
        "rate_limit_exceeded",
        undefined
      );
    } catch (error) {
      logger.error("Failed to record rate limit metrics", {
        error: error instanceof Error ? error.message : String(error),
        key,
        count,
      });
    }
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.store.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug("Cleaned up expired rate limit entries", {
        count: expiredKeys.length,
      });
    }
  }

  /**
   * Get rate limit info for a key
   */
  getRateLimitInfo(key: string): RateLimitInfo | null {
    const current = this.store.get(key);
    if (!current) {
      return null;
    }

    const now = Date.now();
    const resetTime = new Date(current.resetTime);
    const remaining = Math.max(0, this.config.maxRequests - current.count);
    const retryAfter = Math.max(0, Math.ceil((current.resetTime - now) / 1000));

    return {
      limit: this.config.maxRequests,
      current: current.count,
      remaining,
      resetTime,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a key
   */
  resetRateLimit(key: string): void {
    this.store.delete(key);
    logger.info("Rate limit reset", { key });
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
  } {
    const totalKeys = this.store.size;
    const totalRequests = Array.from(this.store.values()).reduce(
      (sum, value) => sum + value.count,
      0
    );
    const averageRequestsPerKey = totalKeys > 0 ? totalRequests / totalKeys : 0;

    return {
      totalKeys,
      totalRequests,
      averageRequestsPerKey,
    };
  }
}

/**
 * Factory function to create rate limit middleware with different configurations
 */
export function createRateLimit(config: RateLimitConfig) {
  return new RateLimitMiddleware(config);
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: "Too many authentication attempts, please try again later.",
  },

  // Standard rate limiting for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: "Too many API requests, please try again later.",
  },

  // Aggressive rate limiting for chat endpoints
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 messages per minute
    message: "Too many chat messages, please slow down.",
  },

  // Per-user rate limiting
  user: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes per user
    message: "User rate limit exceeded, please try again later.",
    keyGenerator: (req: Request) => {
      const userId = (req as any).context?.userId || "anonymous";
      return `user:${userId}`;
    },
  },

  // IP-based rate limiting
  ip: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // 500 requests per 15 minutes per IP
    message: "IP rate limit exceeded, please try again later.",
    keyGenerator: (req: Request) => {
      const ip =
        (req.headers["x-forwarded-for"] as string) ||
        (req.headers["x-real-ip"] as string) ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        "unknown";
      return `ip:${ip}`;
    },
  },
};
