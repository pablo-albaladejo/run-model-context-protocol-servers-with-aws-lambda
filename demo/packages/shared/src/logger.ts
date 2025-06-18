import { ChatMessage, WebSocketMessage } from "@demo/types";

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = (process.env["LOG_LEVEL"] as LogLevel) || LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, context));
    }
  }

  // Specialized logging methods
  logChatMessage(message: ChatMessage): void {
    this.debug("Chat message", {
      id: message.id,
      type: message.type,
      contentLength: message.content.length,
      timestamp: message.timestamp,
    });
  }

  logWebSocketMessage(message: WebSocketMessage): void {
    this.debug("WebSocket message", {
      type: message.type,
      payloadSize: JSON.stringify(message.payload).length,
      timestamp: message.timestamp,
    });
  }

  logMCPServerCall(
    serverName: string,
    toolName: string,
    duration: number
  ): void {
    this.info("MCP Server call", {
      server: serverName,
      tool: toolName,
      duration: `${duration}ms`,
    });
  }
}

export const logger = Logger.getInstance();
