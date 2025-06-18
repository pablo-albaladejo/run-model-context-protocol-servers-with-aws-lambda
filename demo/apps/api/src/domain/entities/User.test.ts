import { describe, expect, it } from "vitest";
import { UserEntity, UserRole } from "./User";

describe("UserEntity", () => {
  describe("constructor", () => {
    it("should create a user with all required properties", () => {
      // Arrange
      const id = "user-123";
      const username = "testuser";
      const email = "test@example.com";
      const role = UserRole.CHAT_USER;
      const createdAt = new Date("2024-01-01T00:00:00Z");

      // Act
      const user = new UserEntity(id, username, email, role, createdAt);

      // Assert
      expect(user.id).toBe(id);
      expect(user.username).toBe(username);
      expect(user.email).toBe(email);
      expect(user.role).toBe(role);
      expect(user.createdAt).toBe(createdAt);
      expect(user.lastLoginAt).toBeUndefined();
    });

    it("should create a user with optional lastLoginAt", () => {
      // Arrange
      const id = "user-123";
      const username = "testuser";
      const email = "test@example.com";
      const role = UserRole.ADMIN;
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const lastLoginAt = new Date("2024-01-02T00:00:00Z");

      // Act
      const user = new UserEntity(
        id,
        username,
        email,
        role,
        createdAt,
        lastLoginAt
      );

      // Assert
      expect(user.lastLoginAt).toBe(lastLoginAt);
    });
  });

  describe("canAccessChat", () => {
    it("should return true for user role", () => {
      // Arrange
      const user = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.CHAT_USER,
        new Date()
      );

      // Act
      const canAccess = user.canAccessChat();

      // Assert
      expect(canAccess).toBe(true);
    });

    it("should return false for admin role", () => {
      // Arrange
      const user = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.ADMIN,
        new Date()
      );

      // Act
      const canAccess = user.canAccessChat();

      // Assert
      expect(canAccess).toBe(false);
    });
  });

  describe("canAccessAdmin", () => {
    it("should return false for user role", () => {
      // Arrange
      const user = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.CHAT_USER,
        new Date()
      );

      // Act
      const canAccess = user.canAccessAdmin();

      // Assert
      expect(canAccess).toBe(false);
    });

    it("should return true for admin role", () => {
      // Arrange
      const user = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.ADMIN,
        new Date()
      );

      // Act
      const canAccess = user.canAccessAdmin();

      // Assert
      expect(canAccess).toBe(true);
    });
  });

  describe("updateLastLogin", () => {
    it("should create new user instance with updated lastLoginAt", () => {
      // Arrange
      const originalUser = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.CHAT_USER,
        new Date()
      );
      const newLoginTime = new Date("2024-01-03T00:00:00Z");

      // Act
      const updatedUser = new UserEntity(
        originalUser.id,
        originalUser.username,
        originalUser.email,
        originalUser.role,
        originalUser.createdAt,
        newLoginTime
      );

      // Assert
      expect(updatedUser).not.toBe(originalUser); // Should be a new instance
      expect(updatedUser.id).toBe(originalUser.id);
      expect(updatedUser.username).toBe(originalUser.username);
      expect(updatedUser.email).toBe(originalUser.email);
      expect(updatedUser.role).toBe(originalUser.role);
      expect(updatedUser.createdAt).toBe(originalUser.createdAt);
      expect(updatedUser.lastLoginAt).toBe(newLoginTime);
    });

    it("should use current time when no date is provided", () => {
      // Arrange
      const originalUser = new UserEntity(
        "user-123",
        "testuser",
        "test@example.com",
        UserRole.CHAT_USER,
        new Date()
      );
      const beforeUpdate = new Date();

      // Act
      const updatedUser = originalUser.updateLastLogin();

      // Assert
      expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
      expect(updatedUser.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
    });
  });
});
