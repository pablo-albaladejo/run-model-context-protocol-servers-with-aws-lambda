import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@demo/shared";
import { Session, SessionService } from "../../domain/services/session-service";

export class DynamoDBSessionService implements SessionService {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName =
      process.env["SESSIONS_TABLE_NAME"] || "MCPDemoStack-dev-user-sessions";
  }

  async createSession(userId: string): Promise<Session> {
    try {
      const sessionId = crypto.randomUUID();
      const now = new Date();
      const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

      const session: Session = {
        id: sessionId,
        userId,
        createdAt: now,
        lastActivity: now,
      };

      const item = {
        sessionId,
        userId,
        createdAt: now.toISOString(),
        lastActivity: now.toISOString(),
        ttl,
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );

      logger.info("Session created", { sessionId, userId });
      return session;
    } catch (error) {
      logger.error("Error creating session", { error, userId });
      throw new Error(
        `Failed to create session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { sessionId },
        })
      );

      if (!result.Item) {
        return null;
      }

      return {
        id: result.Item["sessionId"],
        userId: result.Item["userId"],
        createdAt: new Date(result.Item["createdAt"]),
        lastActivity: new Date(result.Item["lastActivity"]),
      };
    } catch (error) {
      logger.error("Error getting session", { error, sessionId });
      throw new Error(
        `Failed to get session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { sessionId },
          UpdateExpression: "SET lastActivity = :lastActivity",
          ExpressionAttributeValues: {
            ":lastActivity": now,
          },
        })
      );

      logger.info("Session last activity updated", { sessionId });
    } catch (error) {
      logger.error("Error updating session last activity", {
        error,
        sessionId,
      });
      throw new Error(
        `Failed to update session activity: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { sessionId },
        })
      );

      logger.info("Session deleted", { sessionId });
    } catch (error) {
      logger.error("Error deleting session", { error, sessionId });
      throw new Error(
        `Failed to delete session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getActiveSessions(): Promise<Session[]> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
        })
      );

      return (result.Items || []).map((item) => ({
        id: item["sessionId"],
        userId: item["userId"],
        createdAt: new Date(item["createdAt"]),
        lastActivity: new Date(item["lastActivity"]),
      }));
    } catch (error) {
      logger.error("Error getting active sessions", { error });
      throw new Error(
        `Failed to get active sessions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async countActiveSessions(): Promise<number> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          Select: "COUNT",
        })
      );

      return result.Count || 0;
    } catch (error) {
      logger.error("Error counting active sessions", { error });
      throw new Error(
        `Failed to count active sessions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
