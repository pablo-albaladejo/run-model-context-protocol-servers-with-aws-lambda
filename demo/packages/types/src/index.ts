// Chat message types
export interface ChatMessage {
  id: string;
  type: "user" | "bot" | "system" | "error";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// WebSocket message types
export interface WebSocketMessage {
  type: "chat" | "system" | "error" | "typing" | "connected";
  payload: any;
  timestamp: string;
}

// User session types
export interface UserSession {
  connectionId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  lastActivity: string;
  preferences?: {
    language?: string;
    timezone?: string;
    theme?: "light" | "dark";
  };
}

// MCP Tool types
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
}

// MCP Server configuration
export interface MCPServerConfig {
  name: string;
  functionName: string;
  region: string;
  tools: MCPTool[];
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Weather data types
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  alerts?: string[];
}

// Time data types
export interface TimeData {
  timezone: string;
  currentTime: string;
  utcOffset: number;
  isDST: boolean;
}

// Bedrock response types
export interface BedrockResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

// Environment configuration
export interface EnvironmentConfig {
  region: string;
  stage: string;
  websocketUrl: string;
  apiUrl: string;
  bedrockModelId: string;
}
