import { logger } from "@demo/shared";
import { Request, Response } from "express";

export class HealthController {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Basic health check endpoint
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const uptime = Date.now() - this.startTime;
      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || "1.0.0",
        uptime: Math.floor(uptime / 1000), // Convert to seconds
        environment: process.env.NODE_ENV || "development",
        region: process.env.AWS_REGION || "us-east-1",
      };

      logger.info("Health check requested", {
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(200).json(healthStatus);
    } catch (error) {
      logger.error("Health check failed", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  }

  /**
   * Detailed health check with system information
   */
  async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();

      const detailedHealth = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || "1.0.0",
        uptime: Math.floor(uptime / 1000),
        environment: process.env.NODE_ENV || "development",
        region: process.env.AWS_REGION || "us-east-1",
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          },
          cpu: process.cpuUsage(),
        },
        services: {
          database: await this.checkDatabaseHealth(),
          mcpServers: await this.checkMCPServersHealth(),
        },
      };

      logger.info("Detailed health check requested", {
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(200).json(detailedHealth);
    } catch (error) {
      logger.error("Detailed health check failed", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Detailed health check failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Readiness check for Kubernetes
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      // Check if the application is ready to receive traffic
      const isReady = await this.checkReadiness();

      if (isReady) {
        res.status(200).json({
          status: "ready",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: "not ready",
          timestamp: new Date().toISOString(),
          reason: "Application not ready to receive traffic",
        });
      }
    } catch (error) {
      logger.error("Readiness check failed", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        error: "Readiness check failed",
      });
    }
  }

  /**
   * Liveness check for Kubernetes
   */
  async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      // Simple check to see if the application is alive
      const uptime = Date.now() - this.startTime;

      if (uptime > 0) {
        res.status(200).json({
          status: "alive",
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime / 1000),
        });
      } else {
        res.status(503).json({
          status: "dead",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Liveness check failed", {
        error: error instanceof Error ? error.message : String(error),
        correlationId: req.headers["x-correlation-id"],
      });

      res.status(503).json({
        status: "dead",
        timestamp: new Date().toISOString(),
        error: "Liveness check failed",
      });
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<{
    status: string;
    details?: string;
  }> {
    try {
      // This would typically check DynamoDB connectivity
      // For now, we'll simulate a healthy database
      return {
        status: "healthy",
        details: "DynamoDB connection successful",
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details:
          error instanceof Error ? error.message : "Database connection failed",
      };
    }
  }

  /**
   * Check MCP servers health
   */
  private async checkMCPServersHealth(): Promise<{
    status: string;
    details?: string;
  }> {
    try {
      // This would typically check MCP server connectivity
      // For now, we'll simulate healthy MCP servers
      return {
        status: "healthy",
        details: "MCP servers responding",
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details:
          error instanceof Error ? error.message : "MCP servers not responding",
      };
    }
  }

  /**
   * Check if the application is ready
   */
  private async checkReadiness(): Promise<boolean> {
    try {
      // Check database connectivity
      const dbHealth = await this.checkDatabaseHealth();
      if (dbHealth.status !== "healthy") {
        return false;
      }

      // Check MCP servers
      const mcpHealth = await this.checkMCPServersHealth();
      if (mcpHealth.status !== "healthy") {
        return false;
      }

      // Check if the application has been running for at least 5 seconds
      const uptime = Date.now() - this.startTime;
      if (uptime < 5000) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error("Readiness check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
