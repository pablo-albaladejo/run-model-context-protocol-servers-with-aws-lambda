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

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const mcpRequest = body as MCPRequest;

    logger.info("Time MCP server request", {
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
    logger.error("Error in time MCP server", { error });
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
        name: "time-mcp-server",
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
          name: "get_current_time",
          description: "Get the current time in a specific timezone",
          inputSchema: {
            type: "object",
            properties: {
              timezone: {
                type: "string",
                description:
                  "Timezone to get time for (e.g., UTC, America/New_York, Europe/London)",
                default: "UTC",
              },
            },
          },
        },
        {
          name: "get_time_info",
          description:
            "Get detailed time information including date, day of week, and timezone details",
          inputSchema: {
            type: "object",
            properties: {
              timezone: {
                type: "string",
                description: "Timezone to get information for",
                default: "UTC",
              },
            },
          },
        },
        {
          name: "convert_time",
          description: "Convert time from one timezone to another",
          inputSchema: {
            type: "object",
            properties: {
              time: {
                type: "string",
                description: "Time to convert (ISO 8601 format)",
              },
              fromTimezone: {
                type: "string",
                description: "Source timezone",
              },
              toTimezone: {
                type: "string",
                description: "Target timezone",
              },
            },
            required: ["time", "fromTimezone", "toTimezone"],
          },
        },
      ],
    },
  };
}

async function handleToolsCall(request: MCPRequest): Promise<MCPResponse> {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_current_time":
      return await getCurrentTime(request.id, args.timezone);
    case "get_time_info":
      return await getTimeInfo(request.id, args.timezone);
    case "convert_time":
      return await convertTime(
        request.id,
        args.time,
        args.fromTimezone,
        args.toTimezone
      );
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

async function getCurrentTime(
  requestId: string,
  timezone: string = "UTC"
): Promise<MCPResponse> {
  try {
    const now = new Date();
    const timeString = now.toLocaleString("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        content: [
          {
            type: "text",
            text: `🕐 Current time in ${timezone}: ${timeString}`,
          },
        ],
        isError: false,
      },
    };
  } catch (error) {
    logger.error("Error getting current time", { error, timezone });
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Failed to get current time",
      },
    };
  }
}

async function getTimeInfo(
  requestId: string,
  timezone: string = "UTC"
): Promise<MCPResponse> {
  try {
    const now = new Date();
    const utcTime = now.toISOString();

    const timeInfo = {
      date: now.toLocaleDateString("en-US", { timeZone: timezone }),
      time: now.toLocaleTimeString("en-US", { timeZone: timezone }),
      dayOfWeek: now.toLocaleDateString("en-US", {
        timeZone: timezone,
        weekday: "long",
      }),
      timezone: timezone,
      utc: utcTime,
      timestamp: now.getTime(),
    };

    const infoText =
      `📅 Date: ${timeInfo.date}\n` +
      `🕐 Time: ${timeInfo.time}\n` +
      `📆 Day: ${timeInfo.dayOfWeek}\n` +
      `🌍 Timezone: ${timeInfo.timezone}\n` +
      `⏰ UTC: ${timeInfo.utc}\n` +
      `🔢 Timestamp: ${timeInfo.timestamp}`;

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        content: [
          {
            type: "text",
            text: infoText,
          },
        ],
        isError: false,
      },
    };
  } catch (error) {
    logger.error("Error getting time info", { error, timezone });
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Failed to get time information",
      },
    };
  }
}

async function convertTime(
  requestId: string,
  time: string,
  fromTimezone: string,
  toTimezone: string
): Promise<MCPResponse> {
  try {
    // Parse the input time
    const inputDate = new Date(time);
    if (isNaN(inputDate.getTime())) {
      throw new Error("Invalid time format. Please use ISO 8601 format.");
    }

    // Create a date object in the source timezone
    const sourceTime = inputDate.toLocaleString("en-US", {
      timeZone: fromTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    // Convert to target timezone
    const targetTime = inputDate.toLocaleString("en-US", {
      timeZone: toTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    const conversionText =
      `🔄 Time Conversion:\n` +
      `📤 From: ${sourceTime} (${fromTimezone})\n` +
      `📥 To: ${targetTime} (${toTimezone})\n` +
      `⏰ Original: ${inputDate.toISOString()}`;

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        content: [
          {
            type: "text",
            text: conversionText,
          },
        ],
        isError: false,
      },
    };
  } catch (error) {
    logger.error("Error converting time", {
      error,
      time,
      fromTimezone,
      toTimezone,
    });
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: `Failed to convert time: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
    };
  }
}
