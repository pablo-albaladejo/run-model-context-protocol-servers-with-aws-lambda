import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/index";

// Mock AWS services for testing
vi.mock("@aws-sdk/client-dynamodb");
vi.mock("@aws-sdk/lib-dynamodb");

describe("API Integration Tests", () => {
  let server: any;
  let mockDynamoClient: any;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = "test";
    process.env.CHAT_TABLE_NAME = "test-chat-table";
    process.env.SESSIONS_TABLE_NAME = "test-sessions-table";
    process.env.USER_POOL_ID = "test-user-pool";
    process.env.CLIENT_ID = "test-client-id";

    // Mock DynamoDB client
    mockDynamoClient = {
      send: vi.fn(),
    };

    vi.mocked(DynamoDBClient).mockImplementation(() => mockDynamoClient as any);
    vi.mocked(DynamoDBDocumentClient.from).mockReturnValue(
      mockDynamoClient as any
    );

    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Health Check", () => {
    it("should return 200 and health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "healthy",
        timestamp: expect.any(String),
        version: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe("Authentication", () => {
    it("should reject requests without authentication", async () => {
      const response = await request(app)
        .post("/api/chat/sessions")
        .send({ name: "Test Session" });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: "UNAUTHORIZED",
        message: expect.stringContaining("token"),
      });
    });

    it("should reject requests with invalid JWT", async () => {
      const response = await request(app)
        .post("/api/chat/sessions")
        .set("Authorization", "Bearer invalid-token")
        .send({ name: "Test Session" });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: "UNAUTHORIZED",
        message: expect.stringContaining("Invalid"),
      });
    });
  });

  describe("Chat Sessions", () => {
    const mockUser = {
      sub: "test-user-123",
      username: "testuser",
      email: "test@example.com",
      role: "user",
    };

    const mockJWT = "valid-jwt-token";

    beforeEach(() => {
      // Mock successful authentication
      vi.doMock("../../src/infrastructure/middleware/auth-middleware", () => ({
        authMiddleware: () => ({
          before: (handler: any) => {
            handler.event.user = mockUser;
          },
        }),
      }));
    });

    it("should create a new chat session", async () => {
      // Mock DynamoDB responses
      mockDynamoClient.send
        .mockResolvedValueOnce({}) // Session creation
        .mockResolvedValueOnce({ Item: mockUser }); // User lookup

      const response = await request(app)
        .post("/api/chat/sessions")
        .set("Authorization", `Bearer ${mockJWT}`)
        .send({ name: "Test Session" });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: "Test Session",
          userId: mockUser.sub,
          createdAt: expect.any(String),
          lastActivityAt: expect.any(String),
          messageCount: 0,
          status: "active",
        },
      });
    });

    it("should get user sessions", async () => {
      const mockSessions = [
        {
          id: "session-1",
          name: "Session 1",
          userId: mockUser.sub,
          createdAt: "2024-01-15T10:00:00Z",
          lastActivityAt: "2024-01-15T11:00:00Z",
          messageCount: 5,
          status: "active",
        },
      ];

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockSessions,
        Count: 1,
        ScannedCount: 1,
      });

      const response = await request(app)
        .get("/api/chat/sessions")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockSessions,
        pagination: {
          limit: 20,
          offset: 0,
          total: 1,
          hasMore: false,
        },
      });
    });

    it("should get specific session with messages", async () => {
      const mockSession = {
        id: "session-1",
        name: "Test Session",
        userId: mockUser.sub,
        createdAt: "2024-01-15T10:00:00Z",
        lastActivityAt: "2024-01-15T11:00:00Z",
        messageCount: 2,
        status: "active",
      };

      const mockMessages = [
        {
          id: "msg-1",
          sessionId: "session-1",
          content: "Hello",
          sender: "user",
          timestamp: "2024-01-15T10:30:00Z",
        },
        {
          id: "msg-2",
          sessionId: "session-1",
          content: "Hi there!",
          sender: "assistant",
          timestamp: "2024-01-15T10:31:00Z",
        },
      ];

      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockSession })
        .mockResolvedValueOnce({ Items: mockMessages, Count: 2 });

      const response = await request(app)
        .get("/api/chat/sessions/session-1")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: mockSession,
          messages: mockMessages,
          pagination: {
            limit: 50,
            offset: 0,
            total: 2,
            hasMore: false,
          },
        },
      });
    });

    it("should delete a session", async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});

      const response = await request(app)
        .delete("/api/chat/sessions/session-1")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "Session deleted successfully",
      });
    });
  });

  describe("Chat Messages", () => {
    const mockUser = {
      sub: "test-user-123",
      username: "testuser",
      email: "test@example.com",
      role: "user",
    };

    const mockJWT = "valid-jwt-token";

    beforeEach(() => {
      // Mock successful authentication
      vi.doMock("../../src/infrastructure/middleware/auth-middleware", () => ({
        authMiddleware: () => ({
          before: (handler: any) => {
            handler.event.user = mockUser;
          },
        }),
      }));
    });

    it("should send a message successfully", async () => {
      const mockSession = {
        id: "session-1",
        userId: mockUser.sub,
        createdAt: "2024-01-15T10:00:00Z",
        lastActivityAt: "2024-01-15T11:00:00Z",
        messageCount: 0,
        status: "active",
      };

      const mockMCPResponse = {
        server: "weather-alerts",
        tool: "get_weather",
        response: "The weather is sunny today!",
        duration: 150,
        success: true,
      };

      // Mock DynamoDB responses
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockSession }) // Get session
        .mockResolvedValueOnce({}) // Save user message
        .mockResolvedValueOnce({}) // Save assistant message
        .mockResolvedValueOnce({}); // Update session

      // Mock MCP service
      vi.doMock("../../src/domain/services/mcp-service", () => ({
        MCPService: {
          processMessage: vi.fn().mockResolvedValue(mockMCPResponse),
        },
      }));

      const response = await request(app)
        .post("/api/chat/messages")
        .set("Authorization", `Bearer ${mockJWT}`)
        .send({
          content: "What's the weather like?",
          sessionId: "session-1",
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: {
            id: expect.any(String),
            sessionId: "session-1",
            content: expect.any(String),
            sender: "assistant",
            timestamp: expect.any(String),
          },
          session: expect.any(Object),
          mcpResponse: mockMCPResponse,
        },
      });
    });

    it("should validate message content", async () => {
      const response = await request(app)
        .post("/api/chat/messages")
        .set("Authorization", `Bearer ${mockJWT}`)
        .send({
          content: "", // Empty content
          sessionId: "session-1",
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: "VALIDATION_ERROR",
        message: expect.stringContaining("content"),
      });
    });

    it("should handle session not found", async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null }); // Session not found

      const response = await request(app)
        .post("/api/chat/messages")
        .set("Authorization", `Bearer ${mockJWT}`)
        .send({
          content: "Hello",
          sessionId: "non-existent-session",
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: "NOT_FOUND",
        message: expect.stringContaining("session"),
      });
    });
  });

  describe("Admin Endpoints", () => {
    const mockAdminUser = {
      sub: "admin-user-123",
      username: "admin",
      email: "admin@example.com",
      role: "admin",
    };

    const mockJWT = "valid-admin-jwt";

    beforeEach(() => {
      // Mock successful admin authentication
      vi.doMock("../../src/infrastructure/middleware/auth-middleware", () => ({
        authMiddleware: () => ({
          before: (handler: any) => {
            handler.event.user = mockAdminUser;
          },
        }),
      }));
    });

    it("should get system metrics", async () => {
      const mockMetrics = {
        totalUsers: 150,
        activeSessions: 45,
        totalMessages: 1250,
        averageResponseTime: 245.5,
        mcpServerCalls: {
          weatherAlerts: 89,
          timeService: 67,
        },
        errorRate: 0.02,
        uptime: 86400,
      };

      // Mock repository responses
      mockDynamoClient.send
        .mockResolvedValueOnce({ Count: 150 }) // Total users
        .mockResolvedValueOnce({ Count: 45 }) // Active sessions
        .mockResolvedValueOnce({ Count: 1250 }); // Total messages

      const response = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalUsers: expect.any(Number),
          activeSessions: expect.any(Number),
          totalMessages: expect.any(Number),
        }),
      });
    });

    it("should get all sessions for admin", async () => {
      const mockSessions = [
        {
          id: "session-1",
          userId: "user-1",
          username: "user1",
          email: "user1@example.com",
          createdAt: "2024-01-15T10:00:00Z",
          lastActivityAt: "2024-01-15T11:00:00Z",
          messageCount: 5,
          status: "active",
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0...",
        },
      ];

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockSessions,
        Count: 1,
        ScannedCount: 1,
      });

      const response = await request(app)
        .get("/api/admin/sessions")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockSessions,
        pagination: {
          limit: 20,
          offset: 0,
          total: 1,
          hasMore: false,
        },
      });
    });

    it("should reject non-admin users from admin endpoints", async () => {
      const mockRegularUser = {
        sub: "user-123",
        username: "user",
        email: "user@example.com",
        role: "user",
      };

      // Mock regular user authentication
      vi.doMock("../../src/infrastructure/middleware/auth-middleware", () => ({
        authMiddleware: () => ({
          before: (handler: any) => {
            handler.event.user = mockRegularUser;
          },
        }),
      }));

      const response = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${mockJWT}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: "FORBIDDEN",
        message: expect.stringContaining("admin"),
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockDynamoClient.send.mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      const response = await request(app)
        .get("/api/chat/sessions")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("error"),
      });
    });

    it("should handle validation errors", async () => {
      const response = await request(app)
        .post("/api/chat/messages")
        .set("Authorization", "Bearer valid-token")
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: "VALIDATION_ERROR",
        message: expect.stringContaining("validation"),
      });
    });

    it("should handle rate limiting", async () => {
      // Mock rate limiting middleware
      vi.doMock(
        "../../src/infrastructure/middleware/rate-limit-middleware",
        () => ({
          rateLimitMiddleware: () => ({
            before: (handler: any) => {
              throw new Error("Rate limit exceeded");
            },
          }),
        })
      );

      const response = await request(app)
        .post("/api/chat/messages")
        .set("Authorization", "Bearer valid-token")
        .send({
          content: "Test message",
          sessionId: "session-1",
        });

      expect(response.status).toBe(429);
      expect(response.body).toMatchObject({
        success: false,
        error: "RATE_LIMIT_EXCEEDED",
        message: expect.stringContaining("rate limit"),
      });
    });
  });
});
