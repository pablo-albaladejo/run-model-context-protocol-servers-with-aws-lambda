import { Container } from "inversify";
import "reflect-metadata";
import { SendMessageUseCase } from "../application/use-cases/chat/SendMessageUseCase";
import { ChatMessageRepository } from "../domain/repositories/chat-message-repository";
import { UserRepository } from "../domain/repositories/user-repository";
import { MCPService } from "../domain/services/mcp-service";
import { SessionService } from "../domain/services/session-service";
import { ChatController } from "../interfaces/controllers/chat-controller";

// Application use cases
import { GetSessionsUseCase } from "../application/use-cases/admin/GetSessionsUseCase";
import { GetSystemMetricsUseCase } from "../application/use-cases/admin/GetSystemMetricsUseCase";

// Infrastructure implementations
import { DynamoDBChatMessageRepository } from "./repositories/DynamoDBChatMessageRepository";
import { DynamoDBUserRepository } from "./repositories/DynamoDBUserRepository";
import { AWSCPService } from "./services/AWSCPService";
import { DynamoDBSessionService } from "./services/DynamoDBSessionService";

// New security and performance services
import {
  RateLimitMiddleware,
  createRateLimit,
} from "./middleware/rate-limit-middleware";
import {
  SecurityHeadersMiddleware,
  createSecurityHeadersForEnvironment,
} from "./middleware/security-headers.middleware";
import { ValidationMiddleware } from "./middleware/validation-middleware";
import { CacheService, CacheServiceFactory } from "./services/cache-service";
import { MetricsService } from "./services/metrics-service";

// Types for dependency injection
export const TYPES = {
  // Controllers
  ChatController: Symbol.for("ChatController"),

  // Use Cases
  SendMessageUseCase: Symbol.for("SendMessageUseCase"),
  GetSystemMetricsUseCase: Symbol.for("GetSystemMetricsUseCase"),
  GetSessionsUseCase: Symbol.for("GetSessionsUseCase"),

  // Repositories
  ChatMessageRepository: Symbol.for("ChatMessageRepository"),
  UserRepository: Symbol.for("UserRepository"),

  // Services
  MCPService: Symbol.for("MCPService"),
  SessionService: Symbol.for("SessionService"),
  MetricsService: Symbol.for("MetricsService"),
  CacheService: Symbol.for("CacheService"),

  // Middleware
  RateLimitMiddleware: Symbol.for("RateLimitMiddleware"),
  ValidationMiddleware: Symbol.for("ValidationMiddleware"),
  SecurityHeadersMiddleware: Symbol.for("SecurityHeadersMiddleware"),
};

export const container = new Container();

// Register repositories
container
  .bind<ChatMessageRepository>(TYPES.ChatMessageRepository)
  .to(DynamoDBChatMessageRepository)
  .inSingletonScope();

container
  .bind<UserRepository>(TYPES.UserRepository)
  .to(DynamoDBUserRepository)
  .inSingletonScope();

// Register services
container
  .bind<MCPService>(TYPES.MCPService)
  .to(AWSCPService)
  .inSingletonScope();

container
  .bind<SessionService>(TYPES.SessionService)
  .to(DynamoDBSessionService)
  .inSingletonScope();

// Register new services
container
  .bind<MetricsService>(TYPES.MetricsService)
  .to(MetricsService)
  .inSingletonScope();

container
  .bind<CacheService>(TYPES.CacheService)
  .toDynamicValue(() => {
    const environment = process.env.NODE_ENV || "development";
    return CacheServiceFactory.createForEnvironment(environment, {
      ttl: parseInt(process.env.CACHE_TTL || "3600"),
      prefix: process.env.CACHE_PREFIX || "mcp-demo",
      namespace: "api",
    });
  })
  .inSingletonScope();

// Register middleware
container
  .bind<RateLimitMiddleware>(TYPES.RateLimitMiddleware)
  .toDynamicValue(() => {
    const environment = process.env.NODE_ENV || "development";
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== "false";

    if (!rateLimitEnabled) {
      // Return a no-op rate limiter for development
      return createRateLimit({
        windowMs: 15 * 60 * 1000,
        maxRequests: 10000, // Very high limit
        message: "Rate limiting disabled",
      });
    }

    // Production rate limiting
    return createRateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      message: "Too many requests, please try again later.",
    });
  })
  .inSingletonScope();

container
  .bind<ValidationMiddleware>(TYPES.ValidationMiddleware)
  .to(ValidationMiddleware)
  .inSingletonScope();

container
  .bind<SecurityHeadersMiddleware>(TYPES.SecurityHeadersMiddleware)
  .toDynamicValue(() => {
    const environment = (process.env.NODE_ENV || "development") as
      | "development"
      | "staging"
      | "production";
    return createSecurityHeadersForEnvironment(environment);
  })
  .inSingletonScope();

// Register use cases
container
  .bind<SendMessageUseCase>(TYPES.SendMessageUseCase)
  .to(SendMessageUseCase)
  .inSingletonScope();

container
  .bind<GetSystemMetricsUseCase>(TYPES.GetSystemMetricsUseCase)
  .to(GetSystemMetricsUseCase)
  .inSingletonScope();

container
  .bind<GetSessionsUseCase>(TYPES.GetSessionsUseCase)
  .to(GetSessionsUseCase)
  .inSingletonScope();

// Bind controllers
container
  .bind<ChatController>(TYPES.ChatController)
  .to(ChatController)
  .inSingletonScope();

export { Container };
