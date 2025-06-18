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
