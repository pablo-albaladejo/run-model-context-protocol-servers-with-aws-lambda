import { ClientSession } from '@modelcontextprotocol/sdk';
import { Tool } from './tool.js';
import logger from '../logger.js';

/**
 * Abstract base class for communicating with an MCP server.
 */
export abstract class Server {
  name: string;
  config: Record<string, any>;
  protected _client: any;
  protected session: ClientSession | null = null;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
    this._client = null;
  }

  /**
   * Async context manager entry
   */
  async initialize(): Promise<void> {
    // To be implemented by subclasses
  }

  /**
   * Async context manager exit
   */
  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
    }
    if (this._client) {
      await this._client.close();
    }
  }

  /**
   * List available tools from the server.
   * @returns A list of available tools.
   * @throws RuntimeError if the server is not initialized.
   */
  async listTools(): Promise<Tool[]> {
    if (!this.session) {
      throw new Error(`Server ${this.name} not initialized`);
    }

    const toolsResponse = await this.session.listTools();
    const tools: Tool[] = [];

    for (const item of toolsResponse) {
      if (Array.isArray(item) && item[0] === 'tools') {
        for (const tool of item[1]) {
          tools.push(new Tool(tool.name, tool.description, tool.inputSchema));
        }
      }
    }

    return tools;
  }

  /**
   * Execute a tool with retry mechanism.
   * @param toolName Name of the tool to execute.
   * @param toolUseId ID assigned by Bedrock Converse API.
   * @param arguments Tool arguments.
   * @param retries Number of retry attempts.
   * @param delay Delay between retries in seconds.
   * @returns Tool execution result.
   * @throws RuntimeError if server is not initialized.
   */
  async executeTool(
    toolName: string,
    toolUseId: string,
    args: Record<string, any>,
    retries: number = 2,
    delay: number = 1.0
  ): Promise<Record<string, any>> {
    if (!this.session) {
      throw new Error(`Server ${this.name} not initialized`);
    }

    let attempt = 0;
    while (attempt < retries) {
      try {
        logger.info(`Executing ${toolName}...`);
        const result = await this.session.callTool(toolName, args);

        return {
          toolUseId: toolUseId,
          content: [{ text: String(result) }],
          status: 'success',
        };
      } catch (e) {
        attempt += 1;
        logger.warn(`Error executing tool: ${e}. Attempt ${attempt} of ${retries}.`);
        if (attempt < retries) {
          logger.info(`Retrying in ${delay} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        } else {
          logger.error('Max retries reached. Failing.');
          return {
            toolUseId: toolUseId,
            content: [{ text: `Error executing tool: ${String(e)}` }],
            status: 'error',
          };
        }
      }
    }

    // This should never be reached due to the loop above
    throw new Error('Unexpected error in executeTool');
  }
}
