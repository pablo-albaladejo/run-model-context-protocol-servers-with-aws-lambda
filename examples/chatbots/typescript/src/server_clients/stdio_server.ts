import {
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "./server.js";
import logger from "../logger.js";

/**
 * Manages MCP server connections and tool execution for servers running locally over stdio.
 */
export class StdioServer extends Server {
  /**
   * Initialize the server connection.
   * @throws ValueError if initialization parameters are invalid
   * @throws RuntimeError if server fails to initialize
   */
  async initialize(): Promise<void> {
    if (!this.config.command) {
      throw new Error("The command must be a valid string and cannot be None.");
    }

    const serverParams: StdioServerParameters = {
      command: this.config.command,
      args: this.config.args,
      env: this.config.env ? { ...process.env, ...this.config.env } : undefined,
    };

    const transport = new StdioClientTransport(serverParams);

    try {
      await this.client.connect(transport);
    } catch (e) {
      logger.error(`Error initializing server ${this.name}: ${e}`);
      throw e;
    }
  }
}
