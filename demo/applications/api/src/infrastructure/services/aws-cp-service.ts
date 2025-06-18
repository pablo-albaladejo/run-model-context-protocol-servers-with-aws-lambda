import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { logger } from "@demo/shared";
import { MCPService } from "../../domain/services/mcp-service";

export class AWSCPService implements MCPService {
  private readonly lambdaClient: LambdaClient;
  private readonly weatherAlertsFunctionName: string;
  private readonly timeFunctionName: string;

  constructor() {
    this.lambdaClient = new LambdaClient({});
    this.weatherAlertsFunctionName =
      process.env["WEATHER_ALERTS_FUNCTION_NAME"] ||
      "MCPDemoStack-dev-weather-alerts";
    this.timeFunctionName =
      process.env["TIME_FUNCTION_NAME"] || "MCPDemoStack-dev-time";
  }

  async processMessage(message: string): Promise<string> {
    try {
      // Simple logic to determine which MCP service to use
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("weather") ||
        lowerMessage.includes("climate") ||
        lowerMessage.includes("temperature")
      ) {
        const location = this.extractLocation(message);
        return await this.getWeatherAlerts(location);
      }

      if (
        lowerMessage.includes("time") ||
        lowerMessage.includes("date") ||
        lowerMessage.includes("hour")
      ) {
        const timezone = this.extractTimezone(message);
        return await this.getTimeInfo(timezone);
      }

      // Default response for other messages
      return `I understand you said: "${message}". I can help you with weather information and time queries. Try asking about the weather in a specific location or the current time in a timezone.`;
    } catch (error) {
      logger.error("Error processing message with MCP", { error, message });
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  }

  async getWeatherAlerts(location: string): Promise<string> {
    try {
      const payload = {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: "get_weather_alerts",
          arguments: {
            location: location || "New York",
          },
        },
      };

      const command = new InvokeCommand({
        FunctionName: this.weatherAlertsFunctionName,
        Payload: JSON.stringify(payload),
      });

      const response = await this.lambdaClient.send(command);
      const responsePayload = JSON.parse(
        new TextDecoder().decode(response.Payload)
      );

      if (responsePayload.error) {
        logger.error("Weather alerts MCP error", {
          error: responsePayload.error,
        });
        return `Sorry, I couldn't get weather information for ${location}. Please try again.`;
      }

      return (
        responsePayload.result?.content ||
        `Weather information for ${location}: No alerts currently.`
      );
    } catch (error) {
      logger.error("Error getting weather alerts", { error, location });
      return `Sorry, I couldn't get weather information for ${location}. Please try again.`;
    }
  }

  async getTimeInfo(timezone: string): Promise<string> {
    try {
      const payload = {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: "get_time",
          arguments: {
            timezone: timezone || "UTC",
          },
        },
      };

      const command = new InvokeCommand({
        FunctionName: this.timeFunctionName,
        Payload: JSON.stringify(payload),
      });

      const response = await this.lambdaClient.send(command);
      const responsePayload = JSON.parse(
        new TextDecoder().decode(response.Payload)
      );

      if (responsePayload.error) {
        logger.error("Time MCP error", { error: responsePayload.error });
        return `Sorry, I couldn't get time information for ${timezone}. Please try again.`;
      }

      return (
        responsePayload.result?.content ||
        `Current time in ${timezone}: ${new Date().toLocaleString()}`
      );
    } catch (error) {
      logger.error("Error getting time info", { error, timezone });
      return `Sorry, I couldn't get time information for ${timezone}. Please try again.`;
    }
  }

  private extractLocation(message: string): string {
    // Simple location extraction logic
    const locationPatterns = [
      /(?:in|at|for)\s+([A-Za-z\s,]+?)(?:\?|\.|$)/i,
      /weather\s+(?:in|at|for)\s+([A-Za-z\s,]+?)(?:\?|\.|$)/i,
      /temperature\s+(?:in|at|for)\s+([A-Za-z\s,]+?)(?:\?|\.|$)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return "New York"; // Default location
  }

  private extractTimezone(message: string): string {
    // Simple timezone extraction logic
    const timezonePatterns = [
      /(?:in|at)\s+([A-Z]{3,4})(?:\?|\.|$)/i,
      /time\s+(?:in|at)\s+([A-Z]{3,4})(?:\?|\.|$)/i,
      /(UTC|GMT|EST|PST|CST|MST)(?:\?|\.|$)/i,
    ];

    for (const pattern of timezonePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
    }

    return "UTC"; // Default timezone
  }
}
