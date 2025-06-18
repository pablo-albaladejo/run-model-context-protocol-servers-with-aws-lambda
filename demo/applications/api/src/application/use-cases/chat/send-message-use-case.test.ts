import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChatMessageEntity,
  MessageSender,
} from "../../../domain/entities/chat-message";
import { ChatMessageRepository } from "../../../domain/repositories/chat-message-repository";
import { MCPService } from "../../../domain/services/mcp-service";
import { SessionService } from "../../../domain/services/session-service";
import { SendMessageUseCase } from "./send-message-use-case";

// Mock dependencies
const mockChatMessageRepository = {
  save: vi.fn(),
  findBySessionId: vi.fn(),
  countBySessionId: vi.fn(),
  deleteBySessionId: vi.fn(),
  deleteById: vi.fn(),
  findBySessionIdAndDateRange: vi.fn(),
  countByDateRange: vi.fn(),
  countByContentPattern: vi.fn(),
} as unknown as ChatMessageRepository;

const mockMCPService = {
  processMessage: vi.fn(),
  getWeatherAlerts: vi.fn(),
  getTimeInfo: vi.fn(),
} as unknown as MCPService;

const mockSessionService = {
  createSession: vi.fn(),
  getSession: vi.fn(),
  updateLastActivity: vi.fn(),
  deleteSession: vi.fn(),
  getActiveSessions: vi.fn(),
  countActiveSessions: vi.fn(),
} as unknown as SessionService;

describe("SendMessageUseCase", () => {
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    // Arrange
    useCase = new SendMessageUseCase(
      mockChatMessageRepository,
      mockMCPService,
      mockSessionService
    );
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("should send message and return response with existing session", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        sessionId: "session-456",
      };

      const mockSession = {
        id: "session-456",
        userId: "user-123",
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      const mockUserMessage = new ChatMessageEntity(
        "msg-123",
        "session-456",
        "Hello, how are you?",
        MessageSender.USER,
        new Date()
      );

      const mockAssistantMessage = new ChatMessageEntity(
        "msg-124",
        "session-456",
        "I am doing well, thank you!",
        MessageSender.ASSISTANT,
        new Date()
      );

      (mockSessionService.getSession as any).mockResolvedValue(mockSession);
      (mockChatMessageRepository.save as any)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      (mockMCPService.processMessage as any).mockResolvedValue(
        "I am doing well, thank you!"
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(mockSessionService.getSession).toHaveBeenCalledWith("session-456");
      expect(mockChatMessageRepository.save).toHaveBeenCalledTimes(2);
      expect(mockMCPService.processMessage).toHaveBeenCalledWith(
        "Hello, how are you?"
      );
      expect(result.assistantMessage).toBe(mockAssistantMessage);
      expect(result.userMessage).toBe(mockUserMessage);
      expect(result.sessionId).toBe("session-456");
    });

    it("should throw error when session is not found", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        sessionId: "non-existent-session",
      };

      (mockSessionService.getSession as any).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(
        "Session not found"
      );
    });

    it("should handle MCP service errors gracefully", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        sessionId: "session-456",
      };

      const mockSession = {
        id: "session-456",
        userId: "user-123",
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      (mockSessionService.getSession as any).mockResolvedValue(mockSession);
      (mockMCPService.processMessage as any).mockRejectedValue(
        new Error("MCP error")
      );

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow("MCP error");
    });
  });
});
