import { MCPServerConfig, MCPTool } from "@demo/types";

export class MCPUtils {
  static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMCPServerConfig(
    name: string,
    functionName: string,
    region: string,
    tools: MCPTool[]
  ): MCPServerConfig {
    return {
      name,
      functionName,
      region,
      tools,
    };
  }

  static createWeatherTool(): MCPTool {
    return {
      name: "get_weather_alerts",
      description: "Get weather alerts and current conditions for a location",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get weather for",
          },
        },
        required: ["location"],
      },
      outputSchema: {
        type: "object",
        properties: {
          location: { type: "string" },
          temperature: { type: "number" },
          condition: { type: "string" },
          alerts: { type: "array", items: { type: "string" } },
        },
      },
    };
  }

  static createTimeTool(): MCPTool {
    return {
      name: "get_current_time",
      description: "Get current time for a specific timezone",
      inputSchema: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              "The timezone to get time for (e.g., UTC, America/New_York)",
          },
        },
        required: ["timezone"],
      },
      outputSchema: {
        type: "object",
        properties: {
          timezone: { type: "string" },
          currentTime: { type: "string" },
          utcOffset: { type: "number" },
          isDST: { type: "boolean" },
        },
      },
    };
  }

  static extractLocationFromMessage(message: string): string | null {
    // Simple location extraction - in production, use NLP
    const locationPatterns = [
      /(?:weather|clima)\s+(?:in|en|para)\s+([A-Za-z\s]+)/i,
      /(?:weather|clima)\s+([A-Za-z\s]+)/i,
      /([A-Za-z\s]+)\s+(?:weather|clima)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  static extractTimezoneFromMessage(message: string): string | null {
    // Simple timezone extraction
    const timezonePatterns = [
      /(?:time|hora)\s+(?:in|en)\s+([A-Za-z\/_]+)/i,
      /(?:time|hora)\s+([A-Za-z\/_]+)/i,
      /([A-Za-z\/_]+)\s+(?:time|hora)/i,
    ];

    for (const pattern of timezonePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  static shouldUseWeatherTool(message: string): boolean {
    const weatherKeywords = [
      "weather",
      "clima",
      "temperature",
      "temperatura",
      "rain",
      "lluvia",
    ];
    const lowerMessage = message.toLowerCase();
    return weatherKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static shouldUseTimeTool(message: string): boolean {
    const timeKeywords = [
      "time",
      "hora",
      "clock",
      "reloj",
      "schedule",
      "horario",
    ];
    const lowerMessage = message.toLowerCase();
    return timeKeywords.some((keyword) => lowerMessage.includes(keyword));
  }
}
