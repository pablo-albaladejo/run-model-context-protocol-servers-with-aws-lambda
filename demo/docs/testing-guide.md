# Testing Guide

## 📋 Overview

This document provides a comprehensive guide to testing in the MCP Demo project. We follow a multi-layered testing approach to ensure code quality, reliability, and maintainability.

## 🏗️ Testing Strategy

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few)
  /____\    Integration Tests (Some)
 /______\   Unit Tests (Many)
```

### Test Types

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test interactions between components and services
3. **E2E Tests** - Test complete user workflows
4. **Infrastructure Tests** - Test CDK stacks and AWS resources

## 🚀 Running Tests

### All Tests

```bash
npm run test
```

### Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Specific Applications

```bash
# API tests only
npm run test:api

# Web app tests only
npm run test:web

# Shared package tests only
npm run test:shared

# Infrastructure tests only
npm run test:infrastructure
```

### Quality Checks

```bash
# Run all quality checks
npm run quality

# Fix quality issues
npm run quality:fix
```

## 📁 Test Structure

```
demo/
├── applications/
│   ├── api/
│   │   ├── src/
│   │   └── tests/
│   │       ├── unit/           # Unit tests
│   │       ├── integration/    # Integration tests
│   │       └── e2e/           # End-to-end tests
│   └── web/
│       ├── src/
│       └── tests/
│           ├── unit/
│           ├── integration/
│           └── e2e/
├── packages/
│   └── shared/
│       ├── src/
│       └── tests/
├── infrastructure/
│   └── aws/
│       ├── src/
│       └── tests/
└── test/
    └── setup.ts               # Global test setup
```

## 🧪 Unit Tests

### API Unit Tests

Unit tests for the API focus on testing individual use cases, controllers, and domain entities.

```typescript
// Example: SendMessageUseCase test
describe("SendMessageUseCase", () => {
  it("should send a message successfully", async () => {
    // Arrange
    const mockRepository = createMockRepository();
    const useCase = new SendMessageUseCase(mockRepository);

    // Act
    const result = await useCase.execute({
      content: "Hello",
      sessionId: "session-123",
      userId: "user-123",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

### Web Unit Tests

Unit tests for React components using React Testing Library.

```typescript
// Example: ChatApp component test
describe("ChatApp", () => {
  it("should render chat interface", () => {
    render(<ChatApp user={mockUser} />);

    expect(screen.getByText("MCP Chat")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
  });
});
```

### Shared Package Tests

Unit tests for shared utilities and common functionality.

```typescript
// Example: Logger test
describe("Logger", () => {
  it("should log messages with correct level", () => {
    const logger = new Logger();
    const spy = vi.spyOn(console, "log");

    logger.info("Test message");

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "Test message",
      })
    );
  });
});
```

## 🔗 Integration Tests

### API Integration Tests

Test the complete request/response cycle including middleware, validation, and business logic.

```typescript
// Example: API integration test
describe("Chat API Integration", () => {
  it("should create a new chat session", async () => {
    const response = await request(app)
      .post("/api/chat/sessions")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ name: "Test Session" });

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe("Test Session");
  });
});
```

### Database Integration Tests

Test repository implementations with actual database operations.

```typescript
// Example: DynamoDB repository test
describe("DynamoDBChatMessageRepository", () => {
  it("should save and retrieve messages", async () => {
    const repository = new DynamoDBChatMessageRepository(mockDynamoClient);
    const message = new ChatMessage("Hello", "user", "session-123");

    await repository.save(message);
    const retrieved = await repository.findById(message.id);

    expect(retrieved).toEqual(message);
  });
});
```

## 🌐 E2E Tests

### API E2E Tests

Test complete API workflows from authentication to response.

```typescript
// Example: Complete chat workflow
describe("Chat E2E Workflow", () => {
  it("should handle complete chat session", async () => {
    // 1. Authenticate user
    const token = await authenticateUser(testUser);

    // 2. Create session
    const session = await createChatSession(token, "Test Session");

    // 3. Send message
    const response = await sendMessage(token, session.id, "Hello");

    // 4. Verify response
    expect(response.data.message.content).toContain("Hello");
  });
});
```

### Web E2E Tests

Test complete user interactions in the web application.

```typescript
// Example: Web app E2E test
describe("Chat Web App E2E", () => {
  it("should allow user to send and receive messages", async () => {
    await page.goto("/");
    await page.fill('[data-testid="message-input"]', "Hello");
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-list"]')).toContainText(
      "Hello"
    );
  });
});
```

## 🏗️ Infrastructure Tests

### CDK Stack Tests

Test AWS infrastructure configuration and resource creation.

```typescript
// Example: CDK stack test
describe("MCP Demo Stack", () => {
  it("should create all required resources", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "test-chat-table",
      BillingMode: "PAY_PER_REQUEST",
    });
  });
});
```

## 📊 Coverage Requirements

### Coverage Thresholds

- **Global**: 70% minimum
- **Domain Layer**: 80% minimum
- **Application Layer**: 75% minimum
- **Infrastructure Layer**: 65% minimum

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/index.html` (detailed browser view)
- **JSON**: `coverage/coverage.json` (machine-readable)
- **LCOV**: `coverage/lcov.info` (CI/CD integration)

## 🛠️ Testing Tools

### Test Framework

- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing
- **Supertest**: API testing
- **Playwright**: E2E testing

### Mocking

- **Vitest Mocks**: Built-in mocking
- **MSW**: API mocking for integration tests
- **AWS SDK Mocks**: AWS service mocking

### Assertions

- **Vitest Assertions**: Built-in assertions
- **Jest DOM**: DOM-specific assertions
- **CDK Assertions**: Infrastructure assertions

## 📝 Best Practices

### Test Organization

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should describe the scenario
3. **Keep Tests Independent**: Each test should be self-contained
4. **Test One Thing**: Each test should verify one specific behavior

### Test Data

1. **Use Factories**: Create test data using factories
2. **Avoid Magic Numbers**: Use constants for test values
3. **Clean Up**: Always clean up test data after tests
4. **Use Fixtures**: Share common test data across tests

### Mocking

1. **Mock External Dependencies**: Don't test external services in unit tests
2. **Use Real Dependencies**: Use real dependencies in integration tests
3. **Verify Interactions**: Ensure mocks are called correctly
4. **Reset Mocks**: Clear mocks between tests

### Performance

1. **Fast Unit Tests**: Unit tests should run in milliseconds
2. **Parallel Execution**: Run tests in parallel when possible
3. **Selective Testing**: Run only relevant tests during development
4. **CI/CD Optimization**: Optimize test execution in CI/CD

## 🔧 Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
});
```

### Test Setup

```typescript
// test/setup.ts
import { vi } from "vitest";

// Mock environment variables
process.env.NODE_ENV = "test";

// Mock AWS SDK
vi.mock("@aws-sdk/client-dynamodb");

// Mock console methods
console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();
```

## 🚨 Common Issues

### Test Environment Issues

1. **Environment Variables**: Ensure test environment variables are set
2. **Database Connections**: Use test databases or mocks
3. **File Paths**: Use absolute paths or proper relative paths
4. **Async Operations**: Properly handle async/await in tests

### Mocking Issues

1. **Module Resolution**: Ensure mocks are imported correctly
2. **Mock Implementation**: Provide proper mock implementations
3. **Mock Cleanup**: Clear mocks between tests
4. **Type Safety**: Use proper TypeScript types for mocks

### Performance Issues

1. **Slow Tests**: Identify and optimize slow tests
2. **Memory Leaks**: Clean up resources after tests
3. **Database Connections**: Close database connections
4. **File Handles**: Close file handles and streams

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [AWS CDK Testing](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test patterns
2. Ensure adequate coverage
3. Use descriptive test names
4. Add appropriate assertions
5. Update this documentation if needed

For questions or issues with testing, please refer to the project's issue tracker or contact the development team.
