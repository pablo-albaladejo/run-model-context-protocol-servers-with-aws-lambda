import "reflect-metadata";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.CHAT_TABLE_NAME = "test-chat-messages";
process.env.USERS_TABLE_NAME = "test-users";
process.env.SESSIONS_TABLE_NAME = "test-user-sessions";
process.env.COGNITO_USER_POOL_ID = "us-east-1_test";
process.env.COGNITO_CLIENT_ID = "test-client-id";
process.env.WEATHER_ALERTS_FUNCTION_NAME = "test-weather-alerts";
process.env.TIME_FUNCTION_NAME = "test-time";

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
