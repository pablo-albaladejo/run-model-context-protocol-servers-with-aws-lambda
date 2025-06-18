import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@demo/shared";
import { UserEntity, UserRole } from "../../domain/entities/user";
import { UserRepository } from "../../domain/repositories/user-repository";

export class DynamoDBUserRepository implements UserRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName =
      process.env["USERS_TABLE_NAME"] || "MCPDemoStack-dev-users";
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { username },
        })
      );

      if (!result.Item) {
        return null;
      }

      return new UserEntity(
        result.Item["id"],
        result.Item["username"],
        result.Item["email"],
        result.Item["role"] as UserRole,
        new Date(result.Item["createdAt"]),
        result.Item["lastLoginAt"]
          ? new Date(result.Item["lastLoginAt"])
          : undefined
      );
    } catch (error) {
      logger.error("Error finding user by username", { error, username });
      throw new Error(
        `Failed to find user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": email,
          },
          Limit: 1,
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const item = result.Items[0];
      return new UserEntity(
        item["id"],
        item["username"],
        item["email"],
        item["role"] as UserRole,
        new Date(item["createdAt"]),
        item["lastLoginAt"] ? new Date(item["lastLoginAt"]) : undefined
      );
    } catch (error) {
      logger.error("Error finding user by email", { error, email });
      throw new Error(
        `Failed to find user by email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async save(user: UserEntity): Promise<UserEntity> {
    try {
      const item = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );

      logger.info("User saved", { userId: user.id, username: user.username });
      return user;
    } catch (error) {
      logger.error("Error saving user", { error, userId: user.id });
      throw new Error(
        `Failed to save user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async update(user: UserEntity): Promise<UserEntity> {
    try {
      const item = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );

      logger.info("User updated", { userId: user.id, username: user.username });
      return user;
    } catch (error) {
      logger.error("Error updating user", { error, userId: user.id });
      throw new Error(
        `Failed to update user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id },
        })
      );

      logger.info("User deleted", { userId: id });
    } catch (error) {
      logger.error("Error deleting user", { error, userId: id });
      throw new Error(
        `Failed to delete user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async findAll(): Promise<UserEntity[]> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
        })
      );

      return (result.Items || []).map(
        (item) =>
          new UserEntity(
            item["id"],
            item["username"],
            item["email"],
            item["role"] as UserRole,
            new Date(item["createdAt"]),
            item["lastLoginAt"] ? new Date(item["lastLoginAt"]) : undefined
          )
      );
    } catch (error) {
      logger.error("Error finding all users", { error });
      throw new Error(
        `Failed to find all users: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async count(): Promise<number> {
    try {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          Select: "COUNT",
        })
      );

      return result.Count || 0;
    } catch (error) {
      logger.error("Error counting users", { error });
      throw new Error(
        `Failed to count users: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
