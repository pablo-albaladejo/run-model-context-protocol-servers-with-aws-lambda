import { logger } from "@demo/shared";
import {
  ChatMessageEntity,
  MessageSender,
} from "../../../domain/entities/chat-message";
import { ChatMessageRepository } from "../../../domain/repositories/chat-message-repository";
import { MCPService } from "../../../domain/services/mcp-service";
import { SessionService } from "../../../domain/services/session-service";

export interface SendMessageRequest {
  sessionId: string;
  content: string;
  userId: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessageEntity;
  assistantMessage: ChatMessageEntity;
  sessionId: string;
}

export class SendMessageUseCase {
  constructor(
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly mcpService: MCPService,
    private readonly sessionService: SessionService
  ) {}

  async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // Validate session exists
      const session = await this.sessionService.getSession(request.sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Create and save user message
      const userMessage = ChatMessageEntity.create(
        request.sessionId,
        request.content,
        MessageSender.USER,
        { userId: request.userId }
      );

      const savedUserMessage = await this.chatMessageRepository.save(
        userMessage
      );

      // Process with MCP service
      const assistantResponse = await this.mcpService.processMessage(
        request.content
      );

      // Create and save assistant message
      const assistantMessage = ChatMessageEntity.create(
        request.sessionId,
        assistantResponse,
        MessageSender.ASSISTANT,
        { userId: request.userId, processed: true }
      );

      const savedAssistantMessage = await this.chatMessageRepository.save(
        assistantMessage
      );

      // Update session last activity
      await this.sessionService.updateLastActivity(request.sessionId);

      logger.info("Message processed successfully", {
        sessionId: request.sessionId,
        userId: request.userId,
        messageLength: request.content.length,
      });

      return {
        userMessage: savedUserMessage,
        assistantMessage: savedAssistantMessage,
        sessionId: request.sessionId,
      };
    } catch (error) {
      logger.error("Error in SendMessageUseCase", { error, request });
      throw error;
    }
  }
}
