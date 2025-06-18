import { describe, expect, it } from "vitest";
import { ChatMessageEntity, MessageSender } from "./ChatMessage";

describe("ChatMessageEntity", () => {
  describe("constructor", () => {
    it("should create a chat message with all required properties", () => {
      // Arrange
      const id = "msg-123";
      const sessionId = "session-456";
      const content = "Hello, world!";
      const sender = MessageSender.USER;
      const timestamp = new Date("2024-01-01T00:00:00Z");

      // Act
      const message = new ChatMessageEntity(
        id,
        sessionId,
        content,
        sender,
        timestamp
      );

      // Assert
      expect(message.id).toBe(id);
      expect(message.sessionId).toBe(sessionId);
      expect(message.content).toBe(content);
      expect(message.sender).toBe(sender);
      expect(message.timestamp).toBe(timestamp);
      expect(message.metadata).toBeUndefined();
    });

    it("should create a chat message with optional metadata", () => {
      // Arrange
      const id = "msg-123";
      const sessionId = "session-456";
      const content = "Hello, world!";
      const sender = MessageSender.USER;
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const metadata = { type: "text", length: 13 };

      // Act
      const message = new ChatMessageEntity(
        id,
        sessionId,
        content,
        sender,
        timestamp,
        metadata
      );

      // Assert
      expect(message.metadata).toEqual(metadata);
    });
  });

  describe("message properties", () => {
    it("should have correct content length", () => {
      // Arrange
      const content = "This is a test message";
      const message = new ChatMessageEntity(
        "msg-123",
        "session-456",
        content,
        MessageSender.USER,
        new Date()
      );

      // Act
      const length = message.content.length;

      // Assert
      expect(length).toBe(22);
    });

    it("should have valid timestamp", () => {
      // Arrange
      const timestamp = new Date("2024-01-01T12:00:00Z");
      const message = new ChatMessageEntity(
        "msg-123",
        "session-456",
        "Hello",
        MessageSender.USER,
        timestamp
      );

      // Act
      const messageTimestamp = message.timestamp;

      // Assert
      expect(messageTimestamp).toBeInstanceOf(Date);
      expect(messageTimestamp.getTime()).toBe(timestamp.getTime());
    });
  });

  describe("metadata handling", () => {
    it("should handle undefined metadata gracefully", () => {
      // Arrange
      const message = new ChatMessageEntity(
        "msg-123",
        "session-456",
        "Hello",
        MessageSender.USER,
        new Date()
      );

      // Act
      const metadata = message.metadata;

      // Assert
      expect(metadata).toBeUndefined();
    });

    it("should preserve metadata structure", () => {
      // Arrange
      const metadata = {
        type: "text",
        language: "en",
        sentiment: "positive",
        entities: ["greeting"],
      };
      const message = new ChatMessageEntity(
        "msg-123",
        "session-456",
        "Hello!",
        MessageSender.USER,
        new Date(),
        metadata
      );

      // Act
      const messageMetadata = message.metadata;

      // Assert
      expect(messageMetadata).toEqual(metadata);
      expect(messageMetadata?.["type"]).toBe("text");
      expect(messageMetadata?.["entities"]).toContain("greeting");
    });
  });
});
