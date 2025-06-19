import { logger } from "@demo/shared";
import { NextFunction, Request, Response } from "express";
import { MetricsService } from "../services/metrics-service";

export interface ValidationRule {
  field: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => boolean | string;
  sanitize?: (value: any) => any;
  transform?: (value: any) => any;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
  headers?: ValidationRule[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  rule: string;
}

export class ValidationMiddleware {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * Create validation middleware for a schema
   */
  validate(schema: ValidationSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors: ValidationError[] = [];

        // Validate body
        if (schema.body) {
          errors.push(...this.validateObject(req.body, schema.body, "body"));
        }

        // Validate query parameters
        if (schema.query) {
          errors.push(...this.validateObject(req.query, schema.query, "query"));
        }

        // Validate URL parameters
        if (schema.params) {
          errors.push(
            ...this.validateObject(req.params, schema.params, "params")
          );
        }

        // Validate headers
        if (schema.headers) {
          errors.push(
            ...this.validateObject(req.headers, schema.headers, "headers")
          );
        }

        // If there are validation errors, return them
        if (errors.length > 0) {
          await this.recordValidationError(req, errors);

          logger.warn("Validation failed", {
            requestId: (req as any).context?.requestId,
            errors: errors.map((e) => `${e.field}: ${e.message}`),
            userId: (req as any).context?.userId,
          });

          return res.status(400).json({
            success: false,
            error: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: errors,
          });
        }

        next();
      } catch (error) {
        logger.error("Validation middleware error", {
          error: error instanceof Error ? error.message : String(error),
          requestId: (req as any).context?.requestId,
        });

        return res.status(500).json({
          success: false,
          error: "INTERNAL_SERVER_ERROR",
          message: "Validation processing error",
        });
      }
    };
  }

  /**
   * Validate an object against validation rules
   */
  private validateObject(
    obj: any,
    rules: ValidationRule[],
    context: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = this.getNestedValue(obj, rule.field);
      const error = this.validateField(value, rule, context);

      if (error) {
        errors.push(error);
      } else if (rule.sanitize && value !== undefined) {
        // Apply sanitization
        this.setNestedValue(obj, rule.field, rule.sanitize(value));
      } else if (rule.transform && value !== undefined) {
        // Apply transformation
        this.setNestedValue(obj, rule.field, rule.transform(value));
      }
    }

    return errors;
  }

  /**
   * Validate a single field
   */
  private validateField(
    value: any,
    rule: ValidationRule,
    context: string
  ): ValidationError | null {
    // Check if required
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      return {
        field: rule.field,
        message: `${rule.field} is required`,
        rule: "required",
      };
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) {
      return null;
    }

    // Type validation
    const typeError = this.validateType(value, rule.type);
    if (typeError) {
      return {
        field: rule.field,
        message: typeError,
        value,
        rule: "type",
      };
    }

    // String validations
    if (rule.type === "string" && typeof value === "string") {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return {
          field: rule.field,
          message: `${rule.field} must be at least ${rule.minLength} characters long`,
          value,
          rule: "minLength",
        };
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return {
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.maxLength} characters long`,
          value,
          rule: "maxLength",
        };
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          field: rule.field,
          message: `${rule.field} format is invalid`,
          value,
          rule: "pattern",
        };
      }

      if (rule.enum && !rule.enum.includes(value)) {
        return {
          field: rule.field,
          message: `${rule.field} must be one of: ${rule.enum.join(", ")}`,
          value,
          rule: "enum",
        };
      }
    }

    // Number validations
    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        return {
          field: rule.field,
          message: `${rule.field} must be at least ${rule.min}`,
          value,
          rule: "min",
        };
      }

      if (rule.max !== undefined && value > rule.max) {
        return {
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.max}`,
          value,
          rule: "max",
        };
      }
    }

    // Array validations
    if (rule.type === "array" && Array.isArray(value)) {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return {
          field: rule.field,
          message: `${rule.field} must have at least ${rule.minLength} items`,
          value,
          rule: "minLength",
        };
      }

      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return {
          field: rule.field,
          message: `${rule.field} must have no more than ${rule.maxLength} items`,
          value,
          rule: "maxLength",
        };
      }
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return {
          field: rule.field,
          message:
            typeof result === "string" ? result : `${rule.field} is invalid`,
          value,
          rule: "custom",
        };
      }
    }

    return null;
  }

  /**
   * Validate data type
   */
  private validateType(value: any, expectedType: string): string | null {
    switch (expectedType) {
      case "string":
        return typeof value === "string" ? null : "Must be a string";
      case "number":
        return typeof value === "number" && !isNaN(value)
          ? null
          : "Must be a number";
      case "boolean":
        return typeof value === "boolean" ? null : "Must be a boolean";
      case "array":
        return Array.isArray(value) ? null : "Must be an array";
      case "object":
        return typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
          ? null
          : "Must be an object";
      default:
        return null;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      return current && typeof current === "object" ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current) || typeof current[key] !== "object") {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Record validation error for metrics
   */
  private async recordValidationError(
    req: Request,
    errors: ValidationError[]
  ): Promise<void> {
    try {
      await this.metricsService.recordError(
        "VALIDATION_ERROR",
        "400",
        "validation_middleware",
        (req as any).context?.userId
      );

      await this.metricsService.recordUserActivity(
        (req as any).context?.userId || "anonymous",
        "validation_failed",
        undefined
      );
    } catch (error) {
      logger.error("Failed to record validation error metrics", {
        error: error instanceof Error ? error.message : String(error),
        errors: errors.length,
      });
    }
  }
}

/**
 * Predefined validation schemas for common use cases
 */
export const ValidationSchemas = {
  // Chat message validation
  chatMessage: {
    body: [
      {
        field: "content",
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 1000,
        sanitize: (value: string) => value.trim(),
      },
      {
        field: "sessionId",
        type: "string",
        required: true,
        pattern: /^[a-zA-Z0-9-]+$/,
      },
    ],
  },

  // Session creation validation
  createSession: {
    body: [
      {
        field: "name",
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 100,
        sanitize: (value: string) => value.trim(),
      },
    ],
  },

  // User authentication validation
  authenticate: {
    body: [
      {
        field: "username",
        type: "string",
        required: true,
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        sanitize: (value: string) => value.toLowerCase().trim(),
      },
      {
        field: "password",
        type: "string",
        required: true,
        minLength: 8,
        maxLength: 128,
      },
    ],
  },

  // Pagination validation
  pagination: {
    query: [
      {
        field: "limit",
        type: "number",
        min: 1,
        max: 100,
        transform: (value: any) => parseInt(value, 10),
      },
      {
        field: "offset",
        type: "number",
        min: 0,
        transform: (value: any) => parseInt(value, 10),
      },
    ],
  },

  // UUID parameter validation
  uuidParam: {
    params: [
      {
        field: "id",
        type: "string",
        required: true,
        pattern:
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      },
    ],
  },

  // Admin operations validation
  adminOperation: {
    headers: [
      {
        field: "authorization",
        type: "string",
        required: true,
        pattern: /^Bearer\s+/,
      },
    ],
  },
};

/**
 * Common sanitization functions
 */
export const Sanitizers = {
  // Remove HTML tags and entities
  stripHtml: (value: string): string => {
    return value.replace(/<[^>]*>/g, "").replace(/&[a-zA-Z]+;/g, "");
  },

  // Normalize email addresses
  normalizeEmail: (value: string): string => {
    return value.toLowerCase().trim();
  },

  // Remove special characters except alphanumeric and spaces
  alphanumeric: (value: string): string => {
    return value.replace(/[^a-zA-Z0-9\s]/g, "");
  },

  // Limit string length
  truncate:
    (maxLength: number) =>
    (value: string): string => {
      return value.length > maxLength ? value.substring(0, maxLength) : value;
    },

  // Convert to lowercase
  toLowerCase: (value: string): string => {
    return value.toLowerCase();
  },

  // Convert to uppercase
  toUpperCase: (value: string): string => {
    return value.toUpperCase();
  },
};

/**
 * Common validation functions
 */
export const Validators = {
  // Check if string contains only allowed characters
  allowedChars:
    (allowedChars: string) =>
    (value: string): boolean | string => {
      const regex = new RegExp(`^[${allowedChars}]+$`);
      return regex.test(value) || `Only characters: ${allowedChars}`;
    },

  // Check if value is a valid URL
  isValidUrl: (value: string): boolean | string => {
    try {
      new URL(value);
      return true;
    } catch {
      return "Must be a valid URL";
    }
  },

  // Check if value is a valid email
  isValidEmail: (value: string): boolean | string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || "Must be a valid email address";
  },

  // Check if value is a valid date
  isValidDate: (value: string): boolean | string => {
    const date = new Date(value);
    return !isNaN(date.getTime()) || "Must be a valid date";
  },

  // Check if value is within allowed range
  inRange:
    (min: number, max: number) =>
    (value: number): boolean | string => {
      return (
        (value >= min && value <= max) || `Must be between ${min} and ${max}`
      );
    },
};
