import { logger } from "@demo/shared";
import { inject, injectable } from "inversify";
import { ChatMessageRepository } from "../../../domain/repositories/chat-message-repository";
import { UserRepository } from "../../../domain/repositories/user-repository";
import { SessionService } from "../../../domain/services/session-service";

export interface SystemMetrics {
  totalUsers: number;
  activeSessions: number;
  totalMessages: number;
  messagesToday: number;
  systemHealth: {
    status: "healthy" | "warning" | "error";
    database: "connected" | "disconnected";
    mcpServices: "available" | "unavailable";
    lastCheck: Date;
  };
}

export interface GetSystemMetricsRequest {
  // No parameters needed for system-wide metrics
}

export interface GetSystemMetricsResponse {
  metrics: SystemMetrics;
}

@injectable()
export class GetSystemMetricsUseCase {
  constructor(
    @inject("ChatMessageRepository")
    private chatMessageRepository: ChatMessageRepository,
    @inject("UserRepository") private userRepository: UserRepository,
    @inject("SessionService") private sessionService: SessionService
  ) {}

  async execute(
    request: GetSystemMetricsRequest
  ): Promise<GetSystemMetricsResponse> {
    try {
      logger.info("Getting system metrics");

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Parallel execution for better performance
      const [totalUsers, activeSessions, totalMessages, messagesToday] =
        await Promise.all([
          this.userRepository.count(),
          this.sessionService.countActiveSessions(),
          this.chatMessageRepository.countByDateRange(new Date(0), new Date()),
          this.chatMessageRepository.countByDateRange(startOfDay, endOfDay),
        ]);

      // Check system health
      const systemHealth = await this.checkSystemHealth();

      const metrics: SystemMetrics = {
        totalUsers,
        activeSessions,
        totalMessages,
        messagesToday,
        systemHealth,
      };

      logger.info("System metrics retrieved successfully", { metrics });

      return { metrics };
    } catch (error) {
      logger.error("Error getting system metrics", { error });
      throw new Error(
        `Failed to get system metrics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async checkSystemHealth(): Promise<SystemMetrics["systemHealth"]> {
    try {
      // Simple health checks
      const databaseCheck = await this.checkDatabaseHealth();
      const mcpServicesCheck = await this.checkMCPServicesHealth();

      const status =
        databaseCheck === "connected" && mcpServicesCheck === "available"
          ? "healthy"
          : databaseCheck === "disconnected" ||
            mcpServicesCheck === "unavailable"
          ? "error"
          : "warning";

      return {
        status,
        database: databaseCheck,
        mcpServices: mcpServicesCheck,
        lastCheck: new Date(),
      };
    } catch (error) {
      logger.error("Error checking system health", { error });
      return {
        status: "error",
        database: "disconnected",
        mcpServices: "unavailable",
        lastCheck: new Date(),
      };
    }
  }

  private async checkDatabaseHealth(): Promise<"connected" | "disconnected"> {
    try {
      // Try to count users as a simple health check
      await this.userRepository.count();
      return "connected";
    } catch (error) {
      logger.error("Database health check failed", { error });
      return "disconnected";
    }
  }

  private async checkMCPServicesHealth(): Promise<"available" | "unavailable"> {
    try {
      // For now, assume MCP services are available
      // In a real implementation, you would check the actual Lambda functions
      return "available";
    } catch (error) {
      logger.error("MCP services health check failed", { error });
      return "unavailable";
    }
  }
}
