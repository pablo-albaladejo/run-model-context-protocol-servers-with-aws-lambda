# 🏗️ Hexagonal Architecture (Clean Architecture) - MCP Demo

## 📋 **Executive Summary**

This project implements a **hexagonal architecture (clean architecture)** following SOLID principles, using **Middy** for AWS Lambda middleware, **Zod** for validation, **Inversify** for dependency injection, and **TypeScript** for type safety.

## 🎯 **Architecture Objectives**

- ✅ **Clear separation of responsibilities** between layers
- ✅ **Framework independence** and external technologies
- ✅ **Improved testability** with dependency injection
- ✅ **Maintainability** and code scalability
- ✅ **Complete type safety** with TypeScript
- ✅ **Robust validation** with Zod
- ✅ **Modern middleware** with Middy

## 🏛️ **Layer Structure**

```
src/
├── domain/                    # 🎯 Domain Layer (Core)
│   ├── entities/             # Business entities
│   ├── repositories/         # Repository interfaces
│   └── services/            # Domain services
├── application/              # 📋 Application Layer
│   └── use-cases/           # Use cases
├── interfaces/               # 🌐 Interfaces Layer
│   └── controllers/         # HTTP controllers
├── infrastructure/           # 🔧 Infrastructure Layer
│   ├── repositories/        # Repository implementations
│   ├── services/           # Service implementations
│   ├── middleware/         # Authentication middleware
│   └── container.ts        # Dependency injection
└── shared/                  # 📦 Shared code
    └── schemas/            # Validation schemas
```

## 🎯 **Domain Layer (Core)**

### **Business Entities**

```typescript
// User.ts - User entity
export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
    public readonly lastLoginAt?: Date
  ) {}

  // Business methods
  canAccessChat(): boolean {
    return this.role === "user" || this.role === "admin";
  }
  canAccessAdmin(): boolean {
    return this.role === "admin";
  }
  updateLastLogin(): UserEntity {
    /* ... */
  }
}

// ChatMessage.ts - Message entity
export class ChatMessageEntity {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly content: string,
    public readonly sender: string,
    public readonly timestamp: Date,
    public readonly metadata?: Record<string, any>
  ) {}
}
```

### **Repository Interfaces**

```typescript
// ChatMessageRepository.ts
export interface ChatMessageRepository {
  save(message: ChatMessageEntity): Promise<ChatMessageEntity>;
  findBySessionId(sessionId: string): Promise<ChatMessageEntity[]>;
  countBySessionId(sessionId: string): Promise<number>;
  deleteBySessionId(sessionId: string): Promise<void>;
  // ... more methods
}

// UserRepository.ts
export interface UserRepository {
  findByUsername(username: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<UserEntity>;
  count(): Promise<number>;
  // ... more methods
}
```

### **Domain Services**

```typescript
// MCPService.ts
export interface MCPService {
  processMessage(message: string): Promise<string>;
  getWeatherAlerts(location: string): Promise<string>;
  getTimeInfo(timezone: string): Promise<string>;
}

// SessionService.ts
export interface SessionService {
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateLastActivity(sessionId: string): Promise<void>;
  // ... more methods
}
```

## 📋 **Application Layer**

### **Use Cases**

```typescript
// SendMessageUseCase.ts
@injectable()
export class SendMessageUseCase {
  constructor(
    @inject("ChatMessageRepository")
    private chatMessageRepository: ChatMessageRepository,
    @inject("MCPService") private mcpService: MCPService,
    @inject("SessionService") private sessionService: SessionService
  ) {}

  async execute(request: SendMessageRequest): Promise<SendMessageResponse> {
    // Business logic
    const session = await this.getOrCreateSession(
      request.userId,
      request.sessionId
    );
    const userMessage = await this.saveUserMessage(request, session.id);
    const assistantResponse = await this.mcpService.processMessage(
      request.content
    );
    const assistantMessage = await this.saveAssistantMessage(
      assistantResponse,
      session.id
    );

    return { message: assistantMessage, session };
  }
}

// GetSystemMetricsUseCase.ts
@injectable()
export class GetSystemMetricsUseCase {
  async execute(): Promise<GetSystemMetricsResponse> {
    // Get system metrics
    const [totalUsers, activeSessions, totalMessages] = await Promise.all([
      this.userRepository.count(),
      this.sessionService.countActiveSessions(),
      this.chatMessageRepository.countByDateRange(new Date(0), new Date()),
    ]);

    return { metrics: { totalUsers, activeSessions, totalMessages } };
  }
}
```

## 🌐 **Interfaces Layer**

### **Controllers with Middy**

```typescript
// chat.controller.ts
export const sendMessage = middy(
  async (event: ChatEvent): Promise<APIGatewayProxyResult> => {
    // Validation with Zod
    const validatedData = sendMessageSchema.parse(
      JSON.parse(event.body || "{}")
    );

    // Get use case from container
    const sendMessageUseCase =
      container.get<SendMessageUseCase>("SendMessageUseCase");

    // Execute use case
    const result = await sendMessageUseCase.execute({
      content: validatedData.content,
      userId: event.user.sub,
      username: event.user.username,
      sessionId: validatedData.sessionId,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: result }),
    };
  }
);
```

### **Validation with Zod**

```typescript
// chat.schemas.ts
import { z } from "zod";

// Validation schemas
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
});

export const getMessagesSchema = z.object({
  sessionId: z.string(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export const getSessionsSchema = z.object({
  userId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});
```

## 🔧 **Infrastructure Layer**

### **Repository Implementations**

```typescript
// DynamoDBChatMessageRepository.ts
@injectable()
export class DynamoDBChatMessageRepository implements ChatMessageRepository {
  constructor(
    @inject("DynamoDBClient")
    private dynamoDBClient: DynamoDBDocumentClient
  ) {}

  async save(message: ChatMessageEntity): Promise<ChatMessageEntity> {
    const params = {
      TableName: process.env.CHAT_TABLE_NAME,
      Item: {
        id: message.id,
        sessionId: message.sessionId,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp.toISOString(),
        metadata: message.metadata,
      },
    };

    await this.dynamoDBClient.send(new PutCommand(params));
    return message;
  }

  async findBySessionId(sessionId: string): Promise<ChatMessageEntity[]> {
    const params = {
      TableName: process.env.CHAT_TABLE_NAME,
      KeyConditionExpression: "sessionId = :sessionId",
      ExpressionAttributeValues: { ":sessionId": sessionId },
      ScanIndexForward: false,
    };

    const result = await this.dynamoDBClient.send(new QueryCommand(params));
    return (result.Items || []).map(this.mapToEntity);
  }
}
```

### **Service Implementations**

```typescript
// AWSCPService.ts
@injectable()
export class AWSCPService implements MCPService {
  constructor(
    @inject("LambdaClient") private lambdaClient: LambdaClient
  ) {}

  async processMessage(message: string): Promise<string> {
    const command = new InvokeCommand({
      FunctionName: process.env.MCP_FUNCTION_NAME,
      Payload: JSON.stringify({
        method: "processMessage",
        params: { message },
      }),
    });

    const response = await this.lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    return result.response;
  }
}
```

### **Authentication Middleware**

```typescript
// auth.middleware.ts
export const authenticateToken = middy(
  async (event: APIGatewayProxyEvent): Promise<AuthEvent> => {
    const token = event.headers.Authorization?.replace("Bearer ", "");
    
    if (!token) {
      throw new Error("No token provided");
    }

    try {
      const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID!,
        tokenUse: "access",
        clientId: process.env.CLIENT_ID!,
      });

      const payload = await verifier.verify(token);
      
      return {
        ...event,
        user: {
          sub: payload.sub,
          username: payload.username,
          email: payload.email,
          role: payload["custom:role"] || "user",
        },
      };
    } catch (error) {
      throw new Error("Invalid token");
    }
  }
);
```

## 🔄 **Dependency Injection**

### **Container Configuration**

```typescript
// container.ts
const container = new Container();

// Bind repositories
container.bind<ChatMessageRepository>("ChatMessageRepository")
  .to(DynamoDBChatMessageRepository);
container.bind<UserRepository>("UserRepository")
  .to(DynamoDBUserRepository);

// Bind services
container.bind<MCPService>("MCPService").to(AWSCPService);
container.bind<SessionService>("SessionService").to(DynamoDBSessionService);

// Bind use cases
container.bind<SendMessageUseCase>("SendMessageUseCase")
  .to(SendMessageUseCase);
container.bind<GetSessionsUseCase>("GetSessionsUseCase")
  .to(GetSessionsUseCase);

// Bind controllers
container.bind<ChatController>("ChatController").to(ChatController);
container.bind<AdminController>("AdminController").to(AdminController);
```

### **Controller with Authentication**

```typescript
// chat.controller.ts
export const sendMessage = middy(
  async (event: ChatEvent): Promise<APIGatewayProxyResult> => {
    // Use case execution with dependency injection
    const sendMessageUseCase = container.get<SendMessageUseCase>("SendMessageUseCase");
    const result = await sendMessageUseCase.execute({
      content: event.body.content,
      userId: event.user.sub,
      sessionId: event.body.sessionId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result }),
    };
  }
).use(authenticateToken);
```

## 🎯 **SOLID Principles Implementation**

### **Single Responsibility Principle (SRP)**
- ✅ Each class has a single responsibility
- ✅ Controllers: handle HTTP requests
- ✅ Use cases: orchestrate business logic
- ✅ Repositories: manage data access
- ✅ Services: provide domain services

### **Open/Closed Principle (OCP)**
- ✅ Open for extension, closed for modification
- ✅ New repository implementations without changing business logic
- ✅ New use cases without modifying existing ones
- ✅ New controllers without affecting domain layer

### **Liskov Substitution Principle (LSP)**
- ✅ Use cases can use any valid implementation
- ✅ Repository interfaces ensure substitutability
- ✅ Service interfaces allow different implementations

### **Interface Segregation Principle (ISP)**
- ✅ Specific interfaces for each responsibility
- ✅ `ChatMessageRepository` only message methods
- ✅ `UserRepository` only user methods
- ✅ `MCPService` only MCP methods

### **Dependency Inversion Principle (DIP)**
- ✅ High-level modules don't depend on low-level modules
- ✅ Both depend on abstractions
- ✅ Inversify handles dependency inversion

## 🧪 **Testing Strategy**

### **Unit Testing**
```typescript
// SendMessageUseCase.test.ts
describe("SendMessageUseCase", () => {
  it("should process message successfully", async () => {
    const mockRepository = createMockChatMessageRepository();
    const mockMCPService = createMockMCPService();
    const useCase = new SendMessageUseCase(mockRepository, mockMCPService);

    const result = await useCase.execute({
      content: "Hello",
      userId: "user-123",
      sessionId: "session-456",
    });

    expect(result.message.content).toBe("Hello there!");
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });
});
```

### **Integration Testing**
```typescript
// chat.integration.test.ts
describe("Chat API Integration", () => {
  it("should send message through API", async () => {
    const response = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ content: "Hello" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 📊 **Benefits of This Architecture**

### **Maintainability**
- ✅ Code organized by responsibilities
- ✅ Changes localized to specific layers
- ✅ Clear separation of concerns
- ✅ Documentation integrated in code

### **Testability**
- ✅ Dependency injection enables easy mocking
- ✅ Business logic isolated from infrastructure
- ✅ Unit tests for each layer
- ✅ Integration tests for end-to-end scenarios

### **Scalability**
- ✅ New implementations without changing business logic
- ✅ Easy to add new features
- ✅ Modular design supports team development
- ✅ Clear interfaces for team collaboration

### **Type Safety**
- ✅ Validation with Zod
- ✅ Early error detection
- ✅ IntelliSense support
- ✅ Compile-time error checking

## 🔧 **Technologies Used**

| Technology     | Purpose             | Benefits                                 |
|----------------|---------------------|------------------------------------------|
| **TypeScript** | Type safety         | Early error detection, better DX         |
| **Middy**      | AWS Lambda middleware | Cleaner code, reusable middleware       |
| **Zod**        | Validation          | Runtime type safety, robust validation   |
| **Inversify**  | IoC Container       | Dependency injection, easy testing      |
| **AWS Lambda** | Computation         | Serverless, automatic scalability       |
| **Cognito**    | Authentication      | Security, user management               |

## 📈 **Metrics and Monitoring**

### **Application Metrics**
```typescript
// GetSystemMetricsUseCase.ts
export class GetSystemMetricsUseCase {
  async execute(): Promise<SystemMetrics> {
    const [totalUsers, activeSessions, totalMessages] = await Promise.all([
      this.userRepository.count(),
      this.sessionService.countActiveSessions(),
      this.chatMessageRepository.countByDateRange(new Date(0), new Date()),
    ]);

    return {
      totalUsers,
      activeSessions,
      totalMessages,
      averageMessagesPerSession: totalMessages / activeSessions,
      systemHealth: "healthy",
    };
  }
}
```

### **Performance Monitoring**
```typescript
// Performance middleware
export const performanceMiddleware = () => ({
  before: (handler: any) => {
    handler.context.startTime = Date.now();
  },
  after: (handler: any) => {
    const duration = Date.now() - handler.context.startTime;
    logger.info("Request duration", { duration, path: handler.event.path });
  },
});
```

### **Error Tracking**
```typescript
// Error handling middleware
export const errorHandler = () => ({
  onError: (handler: any) => {
    const { error } = handler;
    logger.error("Request error", {
      error: error.message,
      stack: error.stack,
      path: handler.event.path,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
    };
  },
});
```

## 🚀 **Deployment and CI/CD**

### **Infrastructure as Code**
```typescript
// CDK Stack
export class MCPDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const chatTable = new Table(this, "ChatTable", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      sortKey: { name: "sessionId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Lambda Functions
    const apiFunction = new Function(this, "ApiFunction", {
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: Code.fromAsset("dist"),
      environment: {
        CHAT_TABLE_NAME: chatTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    // API Gateway
    const api = new RestApi(this, "MCPApi", {
      restApiName: "MCP Demo API",
    });

    api.root.addMethod("POST", new LambdaIntegration(apiFunction));
  }
}
```

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm run deploy
```

## 📚 **Next Steps**

### **Immediate Improvements**
- [ ] Add comprehensive logging
- [ ] Implement caching layer
- [ ] Add rate limiting
- [ ] Enhance error handling
- [ ] Add API documentation

### **Future Enhancements**
- [ ] Real-time notifications
- [ ] File upload support
- [ ] Advanced analytics
- [ ] Multi-tenant support
- [ ] Performance optimization

### **Monitoring and Observability**
- [ ] Distributed tracing
- [ ] Custom dashboards
- [ ] Automated alerts
- [ ] Performance metrics
- [ ] User behavior analytics

## 🎯 **Conclusion**

**This architecture provides a solid, maintainable, and scalable foundation for developing modern serverless applications with AWS Lambda and TypeScript.**
