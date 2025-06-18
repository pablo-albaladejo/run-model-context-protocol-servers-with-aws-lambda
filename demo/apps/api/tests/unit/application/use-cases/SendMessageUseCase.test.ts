import { beforeEach, describe, expect, it, vi } from "vitest";
import { SendMessageUseCase } from "../../../../src/application/use-cases/chat/SendMessageUseCase";
import { ChatMessageEntity } from "../../../../src/domain/entities/ChatMessage";
import { ChatMessageRepository } from "../../../../src/domain/repositories/ChatMessageRepository";
import { MCPService } from "../../../../src/domain/services/MCPService";
import { SessionService } from "../../../../src/domain/services/SessionService";

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
    it("should send message and return response with new session", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        username: "testuser",
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
        "user",
        new Date()
      );

      const mockAssistantMessage = new ChatMessageEntity(
        "msg-124",
        "session-456",
        "I am doing well, thank you!",
        "assistant",
        new Date()
      );

      mockSessionService.createSession.mockResolvedValue(mockSession);
      mockChatMessageRepository.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      mockMCPService.processMessage.mockResolvedValue(
        "I am doing well, thank you!"
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(mockSessionService.createSession).toHaveBeenCalledWith("user-123");
      expect(mockChatMessageRepository.save).toHaveBeenCalledTimes(2);
      expect(mockMCPService.processMessage).toHaveBeenCalledWith(
        "Hello, how are you?"
      );
      expect(result.message).toBe(mockAssistantMessage);
      expect(result.session).toBe(mockSession);
    });

    it("should use existing session when sessionId is provided", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        username: "testuser",
        sessionId: "existing-session-123",
      };

      const mockSession = {
        id: "existing-session-123",
        userId: "user-123",
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      const mockUserMessage = new ChatMessageEntity(
        "msg-123",
        "existing-session-123",
        "Hello, how are you?",
        "user",
        new Date()
      );

      const mockAssistantMessage = new ChatMessageEntity(
        "msg-124",
        "existing-session-123",
        "I am doing well, thank you!",
        "assistant",
        new Date()
      );

      mockSessionService.getSession.mockResolvedValue(mockSession);
      mockChatMessageRepository.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      mockMCPService.processMessage.mockResolvedValue(
        "I am doing well, thank you!"
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(mockSessionService.getSession).toHaveBeenCalledWith(
        "existing-session-123"
      );
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
      expect(result.message).toBe(mockAssistantMessage);
      expect(result.session).toBe(mockSession);
    });

    it("should throw error when session does not belong to user", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        username: "testuser",
        sessionId: "other-user-session",
      };

      const mockSession = {
        id: "other-user-session",
        userId: "other-user-456",
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      mockSessionService.getSession.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(
        "Session does not belong to user"
      );
    });

    it("should throw error when session is not found", async () => {
      // Arrange
      const request = {
        content: "Hello, how are you?",
        userId: "user-123",
        username: "testuser",
        sessionId: "non-existent-session",
      };

      mockSessionService.getSession.mockResolvedValue(null);

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
        username: "testuser",
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
        "user",
        new Date()
      );

      const mockAssistantMessage = new ChatMessageEntity(
        "msg-124",
        "session-456",
        "Sorry, I encountered an error processing your request.",
        "assistant",
        new Date()
      );

      mockSessionService.createSession.mockResolvedValue(mockSession);
      mockChatMessageRepository.save
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      mockMCPService.processMessage.mockRejectedValue(
        new Error("MCP service error")
      );

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.message.content).toContain("Sorry, I encountered an error");
    });
  });
});
