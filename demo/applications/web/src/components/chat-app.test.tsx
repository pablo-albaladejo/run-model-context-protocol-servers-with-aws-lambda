import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatApp } from "./chat-app";

// Mock the WebSocket hook
vi.mock("../hooks/use-websocket", () => ({
  useWebSocket: () => ({
    isConnected: true,
    sendMessage: vi.fn(),
    lastMessage: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock the API client
vi.mock("../utils/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ChatApp", () => {
  const mockUser = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    role: "user",
  };

  const mockSession = {
    id: "session-123",
    name: "Test Session",
    userId: "user-123",
    createdAt: "2024-01-15T10:00:00Z",
    lastActivityAt: "2024-01-15T11:00:00Z",
    messageCount: 0,
    status: "active",
  };

  const mockMessages = [
    {
      id: "msg-1",
      sessionId: "session-123",
      content: "Hello",
      sender: "user",
      timestamp: "2024-01-15T10:30:00Z",
    },
    {
      id: "msg-2",
      sessionId: "session-123",
      content: "Hi there! How can I help you?",
      sender: "assistant",
      timestamp: "2024-01-15T10:31:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render chat interface", () => {
    render(<ChatApp user={mockUser} />);

    expect(screen.getByText("MCP Chat")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type your message...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("should display user information", () => {
    render(<ChatApp user={mockUser} />);

    expect(screen.getByText(mockUser.username)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it("should show connection status", () => {
    render(<ChatApp user={mockUser} />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("should allow typing and sending messages", async () => {
    const mockSendMessage = vi.fn();
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    const input = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type a message
    fireEvent.change(input, { target: { value: "Hello, world!" } });
    expect(input).toHaveValue("Hello, world!");

    // Send the message
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "send_message",
        data: {
          content: "Hello, world!",
          sessionId: expect.any(String),
        },
      });
    });

    // Input should be cleared after sending
    expect(input).toHaveValue("");
  });

  it("should not send empty messages", () => {
    const mockSendMessage = vi.fn();
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    const sendButton = screen.getByRole("button", { name: /send/i });

    // Try to send empty message
    fireEvent.click(sendButton);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("should send message on Enter key", async () => {
    const mockSendMessage = vi.fn();
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    const input = screen.getByPlaceholderText("Type your message...");

    // Type and press Enter
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "send_message",
        data: {
          content: "Test message",
          sessionId: expect.any(String),
        },
      });
    });
  });

  it("should display received messages", () => {
    const mockLastMessage = {
      type: "message_received",
      data: {
        id: "msg-3",
        content: "This is a received message",
        sender: "assistant",
        timestamp: "2024-01-15T10:32:00Z",
      },
    };

    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(),
      lastMessage: mockLastMessage,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    expect(screen.getByText("This is a received message")).toBeInTheDocument();
  });

  it("should show typing indicator when processing", () => {
    render(<ChatApp user={mockUser} />);

    // Simulate processing state
    const chatApp = screen.getByTestId("chat-app");
    fireEvent.change(chatApp, { target: { value: "Test" } });

    expect(screen.getByText("AI is typing...")).toBeInTheDocument();
  });

  it("should handle WebSocket disconnection", () => {
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: false,
      sendMessage: vi.fn(),
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
  });

  it("should show error messages", () => {
    const mockLastMessage = {
      type: "error",
      data: {
        code: "VALIDATION_ERROR",
        message: "Invalid message format",
      },
    };

    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(),
      lastMessage: mockLastMessage,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    expect(
      screen.getByText("Error: Invalid message format")
    ).toBeInTheDocument();
  });

  it("should handle session creation", async () => {
    const mockApiClient = vi.mocked(apiClient);
    mockApiClient.post.mockResolvedValueOnce({
      data: { success: true, data: mockSession },
    });

    render(<ChatApp user={mockUser} />);

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith("/api/chat/sessions", {
        name: expect.stringContaining("Chat Session"),
      });
    });
  });

  it("should load message history", async () => {
    const mockApiClient = vi.mocked(apiClient);
    mockApiClient.post.mockResolvedValueOnce({
      data: { success: true, data: mockSession },
    });
    mockApiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { session: mockSession, messages: mockMessages },
      },
    });

    render(<ChatApp user={mockUser} />);

    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith(
        `/api/chat/sessions/${mockSession.id}`
      );
    });

    // Should display loaded messages
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(
      screen.getByText("Hi there! How can I help you?")
    ).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    const mockApiClient = vi.mocked(apiClient);
    mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

    render(<ChatApp user={mockUser} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to create session")).toBeInTheDocument();
    });
  });

  it("should show loading state", () => {
    render(<ChatApp user={mockUser} />);

    // Initially should show loading
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should handle message with special characters", async () => {
    const mockSendMessage = vi.fn();
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    const input = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type message with special characters
    const specialMessage = "Hello! How are you? 😊";
    fireEvent.change(input, { target: { value: specialMessage } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "send_message",
        data: {
          content: specialMessage,
          sessionId: expect.any(String),
        },
      });
    });
  });

  it("should handle long messages", async () => {
    const mockSendMessage = vi.fn();
    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: mockSendMessage,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    const input = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button", { name: /send/i });

    // Type a long message
    const longMessage = "A".repeat(1000);
    fireEvent.change(input, { target: { value: longMessage } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "send_message",
        data: {
          content: longMessage,
          sessionId: expect.any(String),
        },
      });
    });
  });

  it("should show message timestamps", () => {
    const mockLastMessage = {
      type: "message_received",
      data: {
        id: "msg-3",
        content: "Test message",
        sender: "assistant",
        timestamp: "2024-01-15T10:32:00Z",
      },
    };

    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(),
      lastMessage: mockLastMessage,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    // Should show formatted timestamp
    expect(screen.getByText(/10:32/)).toBeInTheDocument();
  });

  it("should handle different message types", () => {
    const mockLastMessage = {
      type: "system_message",
      data: {
        content: "System maintenance in 5 minutes",
        timestamp: "2024-01-15T10:32:00Z",
      },
    };

    vi.mocked(useWebSocket).mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(),
      lastMessage: mockLastMessage,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<ChatApp user={mockUser} />);

    expect(
      screen.getByText("System maintenance in 5 minutes")
    ).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("should handle user role restrictions", () => {
    const adminUser = { ...mockUser, role: "admin" };
    render(<ChatApp user={adminUser} />);

    // Admin users should see additional features
    expect(screen.getByText("Admin Mode")).toBeInTheDocument();
  });

  it("should handle session switching", async () => {
    const mockApiClient = vi.mocked(apiClient);
    mockApiClient.get.mockResolvedValueOnce({
      data: { success: true, data: [mockSession] },
    });

    render(<ChatApp user={mockUser} />);

    // Should load available sessions
    await waitFor(() => {
      expect(mockApiClient.get).toHaveBeenCalledWith("/api/chat/sessions");
    });
  });
});
