import { describe, expect, it } from "vitest";
import { ValidationError, Validator } from "./validation";

describe("Validation", () => {
  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(Validator.validateEmail("test@example.com")).toBe(true);
      expect(Validator.validateEmail("user.name@domain.co.uk")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(Validator.validateEmail("invalid-email")).toBe(false);
      expect(Validator.validateEmail("test@")).toBe(false);
      expect(Validator.validateEmail("@example.com")).toBe(false);
    });
  });

  describe("validateUUID", () => {
    it("should validate correct UUIDs", () => {
      expect(
        Validator.validateUUID("123e4567-e89b-12d3-a456-426614174000")
      ).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      expect(Validator.validateUUID("invalid-uuid")).toBe(false);
      expect(Validator.validateUUID("123e4567-e89b-12d3-a456")).toBe(false);
    });
  });

  describe("validateConnectionId", () => {
    it("should validate correct connection IDs", () => {
      expect(Validator.validateConnectionId("connection-123")).toBe(true);
      expect(Validator.validateConnectionId("abc123")).toBe(true);
    });

    it("should reject invalid connection IDs", () => {
      expect(Validator.validateConnectionId("")).toBe(false);
      expect(Validator.validateConnectionId(null as any)).toBe(false);
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with message and field", () => {
      const error = new ValidationError("Test error", "testField");
      expect(error.message).toBe("Test error");
      expect(error.field).toBe("testField");
      expect(error.name).toBe("ValidationError");
    });
  });
});
