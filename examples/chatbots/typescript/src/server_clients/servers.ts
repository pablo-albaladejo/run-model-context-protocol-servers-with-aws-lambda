import { Server } from "./server.js";
import { Tool } from "./tool.js";
import logger from "../logger.js";
import { ContentBlock } from "@aws-sdk/client-bedrock-runtime";

/**
 * Class for managing multiple MCP servers.
 */
export class Servers {
  private servers: Server[];

  constructor(servers: Server[]) {
    this.servers = servers;
  }

  /**
   * Initialize all servers
   */
  async initialize(): Promise<void> {
    logger.info("Starting servers");
    for (const server of this.servers) {
      logger.info(`Starting server: ${server.name}`);
      await server.initialize();
    }
  }

  /**
   * Close all servers
   */
  async close(): Promise<void> {
    logger.info("Stopping servers");
    for (const server of [...this.servers].reverse()) {
      logger.info(`Stopping server: ${server.name}`);
      await server.close();
    }
  }

  /**
   * List all tools from all servers
   */
  async listTools(): Promise<Tool[]> {
    const tools: Tool[] = [];
    for (const server of this.servers) {
      const serverTools = await server.listTools();
      tools.push(...serverTools);
    }
    return tools;
  }

  /**
   * Find the server that has the given tool
   */
  async findServerWithTool(toolName: string): Promise<Server> {
    for (const server of this.servers) {
      const tools = await server.listTools();
      if (tools.some((tool) => tool.name === toolName)) {
        return server;
      }
    }
    throw new Error(`Tool ${toolName} not found in any server`);
  }

  /**
   * Execute the given tool on the appropriate server
   */
  async executeTool(
    toolName: string,
    toolUseId: string,
    arguments_: Record<string, any>
  ): Promise<ContentBlock> {
    try {
      const server = await this.findServerWithTool(toolName);

      const result = await server.executeTool(toolName, toolUseId, arguments_);

      return { toolResult: result };
    } catch (e) {
      return {
        toolResult: {
          toolUseId,
          content: [{ text: `No server found with tool: ${toolName}` }],
          status: "error",
        },
      };
    }
  }
}
