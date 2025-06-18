import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@demo/shared";
import { injectable } from "inversify";
import { ChatMessageEntity } from "../../domain/entities/chat-message";
import { ChatMessageRepository } from "../../domain/repositories/chat-message-repository";

@injectable()
export class DynamoDBChatMessageRepository implements ChatMessageRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName =
      process.env["CHAT_TABLE_NAME"] || "MCPDemoStack-dev-chat-messages";
  }

  async save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    try {
      const item = {
        id: message.id,
        sessionId: message.sessionId,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp.toISOString(),
        metadata: message.metadata || {},
        ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );

      logger.info("Chat message saved", {
        messageId: message.id,
        sessionId: message.sessionId,
      });
      return message;
    } catch (error) {
      logger.error("Error saving chat message", {
        error,
        messageId: message.id,
      });
      throw new Error(
        `Failed to save chat message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findBySessionId(sessionId: string): Promise<ChatMessageEntity[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "sessionId = :sessionId",
          ExpressionAttributeValues: {
            ":sessionId": sessionId,
          },
          ScanIndexForward: false, // Most recent first
        })
      );

      return (result.Items || []).map(
        (item) =>
          new ChatMessageEntity(
            item.id,
            item.sessionId,
            item.content,
            item.sender,
            new Date(item.timestamp),
            item.metadata
          )
      );
    } catch (error) {
      logger.error("Error finding messages by session ID", {
        error,
        sessionId,
      });
      throw new Error(
        `Failed to find messages: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findBySessionIdAndDateRange(
    sessionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ChatMessageEntity[]> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "sessionId = :sessionId",
          FilterExpression: "timestamp BETWEEN :startDate AND :endDate",
          ExpressionAttributeValues: {
            ":sessionId": sessionId,
            ":startDate": startDate.toISOString(),
            ":endDate": endDate.toISOString(),
          },
          ScanIndexForward: false,
        })
      );

      return (result.Items || []).map(
        (item) =>
          new ChatMessageEntity(
            item.id,
            item.sessionId,
            item.content,
            item.sender,
            new Date(item.timestamp),
            item.metadata
          )
      );
    } catch (error) {
      logger.error("Error finding messages by date range", {
        error,
        sessionId,
        startDate,
        endDate,
      });
      throw new Error(
        `Failed to find messages by date range: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async countBySessionId(sessionId: string): Promise<number> {
    try {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "sessionId = :sessionId",
          ExpressionAttributeValues: {
            ":sessionId": sessionId,
          },
          Select: "COUNT",
        })
      );

      return result.Count || 0;
    } catch (error) {
      logger.error("Error counting messages by session ID", {
        error,
        sessionId,
      });
      throw new Error(
        `Failed to count messages: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "timestamp BETWEEN :startDate AND :endDate",
          ExpressionAttributeValues: {
            ":startDate": startDate.toISOString(),
            ":endDate": endDate.toISOString(),
          },
          Select: "COUNT",
        })
      );

      return result.Count || 0;
    } catch (error) {
      logger.error("Error counting messages by date range", {
        error,
        startDate,
        endDate,
      });
      throw new Error(
        `Failed to count messages by date range: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async countByContentPattern(pattern: string): Promise<number> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "contains(content, :pattern)",
          ExpressionAttributeValues: {
            ":pattern": pattern,
          },
          Select: "COUNT",
        })
      );

      return result.Count || 0;
    } catch (error) {
      logger.error("Error counting messages by content pattern", {
        error,
        pattern,
      });
      throw new Error(
        `Failed to count messages by pattern: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      // First, get all messages for the session
      const messages = await this.findBySessionId(sessionId);

      // Delete each message
      const deletePromises = messages.map((message) =>
        this.client.send(
          new DeleteCommand({
            TableName: this.tableName,
            Key: {
              id: message.id,
              sessionId: message.sessionId,
            },
          })
        )
      );

      await Promise.all(deletePromises);
      logger.info("Messages deleted by session ID", {
        sessionId,
        count: messages.length,
      });
    } catch (error) {
      logger.error("Error deleting messages by session ID", {
        error,
        sessionId,
      });
      throw new Error(
        `Failed to delete messages: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: {
            id: id,
          },
        })
      );

      logger.info("Message deleted by ID", { messageId: id });
    } catch (error) {
      logger.error("Error deleting message by ID", { error, messageId: id });
      throw new Error(
        `Failed to delete message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
