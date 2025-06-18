import { logger } from "@demo/shared";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from "aws-lambda";

interface MCPRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface WeatherAlert {
  id: string;
  type: "warning" | "watch" | "advisory";
  severity: "low" | "medium" | "high" | "extreme";
  title: string;
  description: string;
  location: string;
  effectiveTime: string;
  expiryTime: string;
}

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const mcpRequest = body as MCPRequest;

    logger.info("Weather alerts MCP server request", {
      method: mcpRequest.method,
      id: mcpRequest.id,
    });

    let response: MCPResponse;

    switch (mcpRequest.method) {
      case "initialize":
        response = handleInitialize(mcpRequest);
        break;
      case "tools/list":
        response = handleToolsList(mcpRequest);
        break;
      case "tools/call":
        response = await handleToolsCall(mcpRequest);
        break;
      default:
        response = {
          jsonrpc: "2.0",
          id: mcpRequest.id,
          error: {
            code: -32601,
            message: "Method not found",
          },
        };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    logger.error("Error in weather alerts MCP server", { error });
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "error",
        error: {
          code: -32603,
          message: "Internal error",
        },
      }),
    };
  }
};

function handleInitialize(request: MCPRequest): MCPResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "weather-alerts-mcp-server",
        version: "1.0.0",
      },
    },
  };
}

function handleToolsList(request: MCPRequest): MCPResponse {
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      tools: [
        {
          name: "get_weather_alerts",
          description: "Get current weather alerts for a specific location",
          inputSchema: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description:
                  "Location to get weather alerts for (city, state, or region)",
              },
            },
            required: ["location"],
          },
        },
        {
          name: "get_alert_details",
          description:
            "Get detailed information about a specific weather alert",
          inputSchema: {
            type: "object",
            properties: {
              alertId: {
                type: "string",
                description: "ID of the weather alert",
              },
            },
            required: ["alertId"],
          },
        },
      ],
    },
  };
}

async function handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_weather_alerts":
      return await getWeatherAlerts(request.id, args.location);
    case "get_alert_details":
      return await getAlertDetails(request.id, args.alertId);
    default:
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32601,
          message: "Tool not found",
        },
      };
  }
}

async function getWeatherAlerts(
  requestId: string,
  location: string
): Promise<MCPResponse> {
  try {
    // Simulate weather alerts data
    const alerts: WeatherAlert[] = [
      {
        id: "alert_001",
        type: "warning",
        severity: "high",
        title: "Severe Thunderstorm Warning",
        description:
          "Severe thunderstorms with damaging winds and large hail expected.",
        location: location || "Unknown",
        effectiveTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      },
      {
        id: "alert_002",
        type: "watch",
        severity: "medium",
        title: "Flood Watch",
        description: "Heavy rainfall may cause flooding in low-lying areas.",
        location: location || "Unknown",
        effectiveTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      },
    ];

    const alertText = alerts
      .map(
        (alert) =>
          `🚨 ${alert.title} (${alert.severity.toUpperCase()})\n` +
          `📍 Location: ${alert.location}\n` +
          `📝 ${alert.description}\n` +
          `⏰ Effective: ${new Date(alert.effectiveTime).toLocaleString()}\n` +
          `⏰ Expires: ${new Date(alert.expiryTime).toLocaleString()}\n`
      )
      .join("\n");

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        content: [
          {
            type: "text",
            text:
              alertText ||
              `No weather alerts currently active for ${location}.`,
          },
        ],
        isError: false,
      },
    };
  } catch (error) {
    logger.error("Error getting weather alerts", { error, location });
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Failed to retrieve weather alerts",
      },
    };
  }
}

async function getAlertDetails(
  requestId: string,
  alertId: string
): Promise<MCPResponse> {
  try {
    // Simulate detailed alert information
    const alert: WeatherAlert = {
      id: alertId,
      type: "warning",
      severity: "high",
      title: "Severe Thunderstorm Warning",
      description:
        "Severe thunderstorms with damaging winds up to 70 mph and large hail up to 2 inches in diameter are expected. These storms will be capable of producing tornadoes. Take shelter immediately if threatening weather approaches.",
      location: "Central Region",
      effectiveTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    };

    const detailsText =
      `🚨 ${alert.title}\n` +
      `📍 Location: ${alert.location}\n` +
      `⚠️ Severity: ${alert.severity.toUpperCase()}\n` +
      `📝 Description: ${alert.description}\n` +
      `⏰ Effective: ${new Date(alert.effectiveTime).toLocaleString()}\n` +
      `⏰ Expires: ${new Date(alert.expiryTime).toLocaleString()}\n` +
      `🆔 Alert ID: ${alert.id}`;

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        content: [
          {
            type: "text",
            text: detailsText,
          },
        ],
        isError: false,
      },
    };
  } catch (error) {
    logger.error("Error getting alert details", { error, alertId });
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Failed to retrieve alert details",
      },
    };
  }
}
