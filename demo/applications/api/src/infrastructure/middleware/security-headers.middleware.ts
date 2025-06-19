import { logger } from "@demo/shared";
import { NextFunction, Request, Response } from "express";

export interface SecurityHeadersConfig {
  // Content Security Policy
  contentSecurityPolicy?: string;

  // Cross-Origin Resource Sharing
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };

  // Other security headers
  enableHsts?: boolean;
  enableXssProtection?: boolean;
  enableContentTypeOptions?: boolean;
  enableFrameOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;

  // Custom headers
  customHeaders?: Record<string, string>;
}

export class SecurityHeadersMiddleware {
  private config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = {
      // Default security configuration
      contentSecurityPolicy:
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';",
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(",") || [
          "http://localhost:3000",
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      enableHsts: true,
      enableXssProtection: true,
      enableContentTypeOptions: true,
      enableFrameOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      customHeaders: {},
      ...config,
    };
  }

  /**
   * Security headers middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Set CORS headers
        this.setCorsHeaders(req, res);

        // Set security headers
        this.setSecurityHeaders(res);

        // Set custom headers
        this.setCustomHeaders(res);

        // Handle preflight requests
        if (req.method === "OPTIONS") {
          res.status(200).end();
          return;
        }

        next();
      } catch (error) {
        logger.error("Security headers middleware error", {
          error: error instanceof Error ? error.message : String(error),
          requestId: (req as any).context?.requestId,
        });
        // Continue without security headers on error
        next();
      }
    };
  }

  /**
   * Set CORS headers
   */
  private setCorsHeaders(req: Request, res: Response): void {
    const cors = this.config.cors!;
    const origin = req.headers.origin;

    // Handle CORS origin
    if (cors.origin === true) {
      // Allow all origins (not recommended for production)
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (typeof cors.origin === "string") {
      // Single origin
      res.setHeader("Access-Control-Allow-Origin", cors.origin);
    } else if (Array.isArray(cors.origin)) {
      // Multiple origins - check if request origin is allowed
      if (origin && cors.origin.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    } else if (origin) {
      // Dynamic origin validation
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }

    // Set other CORS headers
    if (cors.methods) {
      res.setHeader("Access-Control-Allow-Methods", cors.methods.join(", "));
    }

    if (cors.allowedHeaders) {
      res.setHeader(
        "Access-Control-Allow-Headers",
        cors.allowedHeaders.join(", ")
      );
    }

    if (cors.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (cors.maxAge) {
      res.setHeader("Access-Control-Max-Age", cors.maxAge.toString());
    }

    // Expose headers for client access
    res.setHeader(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
    );
  }

  /**
   * Set security headers
   */
  private setSecurityHeaders(res: Response): void {
    // Content Security Policy
    if (this.config.contentSecurityPolicy) {
      res.setHeader(
        "Content-Security-Policy",
        this.config.contentSecurityPolicy
      );
    }

    // HTTP Strict Transport Security (HSTS)
    if (this.config.enableHsts) {
      const hstsValue = "max-age=31536000; includeSubDomains; preload";
      res.setHeader("Strict-Transport-Security", hstsValue);
    }

    // X-XSS-Protection
    if (this.config.enableXssProtection) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    // X-Content-Type-Options
    if (this.config.enableContentTypeOptions) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    // X-Frame-Options
    if (this.config.enableFrameOptions) {
      res.setHeader("X-Frame-Options", "DENY");
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    }

    // Permissions Policy (formerly Feature Policy)
    if (this.config.enablePermissionsPolicy) {
      const permissionsPolicy = [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
        "ambient-light-sensor=()",
        "autoplay=()",
        "encrypted-media=()",
        "picture-in-picture=()",
        "publickey-credentials-get=()",
        "screen-wake-lock=()",
        "sync-xhr=()",
        "web-share=()",
      ].join(", ");

      res.setHeader("Permissions-Policy", permissionsPolicy);
    }

    // Additional security headers
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    // Remove server information
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
  }

  /**
   * Set custom headers
   */
  private setCustomHeaders(res: Response): void {
    if (this.config.customHeaders) {
      Object.entries(this.config.customHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
  }

  /**
   * Create CSP policy for different environments
   */
  static createCSPPolicy(
    environment: "development" | "staging" | "production"
  ): string {
    const basePolicy =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';";

    switch (environment) {
      case "development":
        return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';";

      case "staging":
        return basePolicy + " report-uri /csp-report;";

      case "production":
        return basePolicy + " upgrade-insecure-requests;";

      default:
        return basePolicy;
    }
  }

  /**
   * Create CORS configuration for different environments
   */
  static createCorsConfig(
    environment: "development" | "staging" | "production"
  ) {
    switch (environment) {
      case "development":
        return {
          origin: ["http://localhost:3000", "http://localhost:3001"],
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          maxAge: 86400,
        };

      case "staging":
        return {
          origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          maxAge: 86400,
        };

      case "production":
        return {
          origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization"],
          credentials: true,
          maxAge: 86400,
        };

      default:
        return {
          origin: ["http://localhost:3000"],
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization"],
          credentials: true,
          maxAge: 86400,
        };
    }
  }
}

/**
 * Predefined security configurations for different environments
 */
export const SecurityConfigs = {
  development: {
    contentSecurityPolicy:
      SecurityHeadersMiddleware.createCSPPolicy("development"),
    cors: SecurityHeadersMiddleware.createCorsConfig("development"),
    enableHsts: false, // Disable HSTS in development
    enableXssProtection: true,
    enableContentTypeOptions: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    customHeaders: {
      "X-Environment": "development",
    },
  },

  staging: {
    contentSecurityPolicy: SecurityHeadersMiddleware.createCSPPolicy("staging"),
    cors: SecurityHeadersMiddleware.createCorsConfig("staging"),
    enableHsts: true,
    enableXssProtection: true,
    enableContentTypeOptions: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    customHeaders: {
      "X-Environment": "staging",
    },
  },

  production: {
    contentSecurityPolicy:
      SecurityHeadersMiddleware.createCSPPolicy("production"),
    cors: SecurityHeadersMiddleware.createCorsConfig("production"),
    enableHsts: true,
    enableXssProtection: true,
    enableContentTypeOptions: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    customHeaders: {
      "X-Environment": "production",
    },
  },
};

/**
 * Factory function to create security headers middleware
 */
export function createSecurityHeaders(config?: SecurityHeadersConfig) {
  return new SecurityHeadersMiddleware(config);
}

/**
 * Create security headers middleware for specific environment
 */
export function createSecurityHeadersForEnvironment(
  environment: "development" | "staging" | "production"
) {
  const config = SecurityConfigs[environment];
  return new SecurityHeadersMiddleware(config);
}
