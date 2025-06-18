import { logger } from "@demo/shared";
import { inject, injectable } from "inversify";
import { ChatMessageRepository } from "../../../domain/repositories/chat-message-repository";
import { UserRepository } from "../../../domain/repositories/user-repository";
import { SessionService } from "../../../domain/services/session-service";

export interface SessionInfo {
  id: string;
  userId: string;
  username: string;
  email: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
}

export interface GetSessionsRequest {
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface GetSessionsResponse {
  sessions: SessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

@injectable()
export class GetSessionsUseCase {
  constructor(
    @inject("SessionService") private sessionService: SessionService,
    @inject("ChatMessageRepository")
    private chatMessageRepository: ChatMessageRepository,
    @inject("UserRepository") private userRepository: UserRepository
  ) {}

  async execute(request: GetSessionsRequest): Promise<GetSessionsResponse> {
    try {
      logger.info("Getting sessions", { request });

      const limit = request.limit || 50;
      const offset = request.offset || 0;

      // Get all active sessions
      const allSessions = await this.sessionService.getActiveSessions();

      // Filter by userId if provided
      let filteredSessions = allSessions;
      if (request.userId) {
        filteredSessions = allSessions.filter(
          (session) => session.userId === request.userId
        );
      }

      // Apply pagination
      const paginatedSessions = filteredSessions.slice(offset, offset + limit);

      // Enrich sessions with user info and message count
      const enrichedSessions = await Promise.all(
        paginatedSessions.map(async (session) => {
          const user = await this.userRepository.findByUsername(session.userId);
          const messageCount =
            await this.chatMessageRepository.countBySessionId(session.id);

          // Check if session is active (last activity within 30 minutes)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const isActive = session.lastActivity > thirtyMinutesAgo;

          return {
            id: session.id,
            userId: session.userId,
            username: user?.username || "Unknown",
            email: user?.email || "",
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            messageCount,
            isActive,
          };
        })
      );

      const response: GetSessionsResponse = {
        sessions: enrichedSessions,
        total: filteredSessions.length,
        limit,
        offset,
      };

      logger.info("Sessions retrieved successfully", {
        count: enrichedSessions.length,
        total: filteredSessions.length,
      });

      return response;
    } catch (error) {
      logger.error("Error getting sessions", { error });
      throw new Error(
        `Failed to get sessions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
