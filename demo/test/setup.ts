import { vi } from "vitest";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.CHAT_TABLE_NAME = "test-chat-table";
process.env.SESSIONS_TABLE_NAME = "test-sessions-table";
process.env.USER_POOL_ID = "test-user-pool";
process.env.CLIENT_ID = "test-client-id";
process.env.AWS_REGION = "us-east-1";

// Mock AWS SDK
vi.mock("@aws-sdk/client-dynamodb");
vi.mock("@aws-sdk/lib-dynamodb");
vi.mock("@aws-sdk/client-cognito-identity-provider");

// Mock AWS Lambda PowerTools
vi.mock("@aws-lambda-powertools/logger");
vi.mock("@aws-lambda-powertools/metrics");
vi.mock("@aws-lambda-powertools/tracer");

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
console.log = vi.fn();
console.warn = vi.fn();
console.error = vi.fn();
