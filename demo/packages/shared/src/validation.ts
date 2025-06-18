import { ChatMessage, UserSession, WebSocketMessage } from "@demo/types";

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class Validator {
  static validateChatMessage(message: any): ChatMessage {
    if (!message || typeof message !== "object") {
      throw new ValidationError("Message must be an object");
    }

    if (!message.id || typeof message.id !== "string") {
      throw new ValidationError(
        "Message ID is required and must be a string",
        "id"
      );
    }

    if (
      !message.type ||
      !["user", "bot", "system", "error"].includes(message.type)
    ) {
      throw new ValidationError(
        "Message type must be one of: user, bot, system, error",
        "type"
      );
    }

    if (!message.content || typeof message.content !== "string") {
      throw new ValidationError(
        "Message content is required and must be a string",
        "content"
      );
    }

    if (!message.timestamp || typeof message.timestamp !== "string") {
      throw new ValidationError(
        "Message timestamp is required and must be a string",
        "timestamp"
      );
    }

    return message as ChatMessage;
  }

  static validateWebSocketMessage(message: any): WebSocketMessage {
    if (!message || typeof message !== "object") {
      throw new ValidationError("WebSocket message must be an object");
    }

    if (
      !message.type ||
      !["chat", "system", "error", "typing", "connected"].includes(message.type)
    ) {
      throw new ValidationError("WebSocket message type is invalid", "type");
    }

    if (!message.timestamp || typeof message.timestamp !== "string") {
      throw new ValidationError(
        "WebSocket message timestamp is required",
        "timestamp"
      );
    }

    return message as WebSocketMessage;
  }

  static validateUserSession(session: any): UserSession {
    if (!session || typeof session !== "object") {
      throw new ValidationError("User session must be an object");
    }

    if (!session.connectionId || typeof session.connectionId !== "string") {
      throw new ValidationError("Connection ID is required", "connectionId");
    }

    if (!session.userId || typeof session.userId !== "string") {
      throw new ValidationError("User ID is required", "userId");
    }

    if (!Array.isArray(session.messages)) {
      throw new ValidationError("Messages must be an array", "messages");
    }

    if (!session.createdAt || typeof session.createdAt !== "string") {
      throw new ValidationError(
        "Created at timestamp is required",
        "createdAt"
      );
    }

    return session as UserSession;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static validateConnectionId(connectionId: string): boolean {
    return typeof connectionId === "string" && connectionId.length > 0;
  }
}
