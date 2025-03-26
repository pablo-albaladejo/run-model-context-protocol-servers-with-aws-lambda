import { ClientSession } from '@modelcontextprotocol/sdk';
import { LambdaFunctionParameters, lambdaFunctionClient } from 'mcp-lambda';
import { Server } from './server.js';
import logger from '../logger.js';

/**
 * Manages MCP server connections and tool execution for servers running in Lambda functions.
 */
export class LambdaFunctionClient extends Server {
  /**
   * Initialize the server connection.
   * @throws ValueError if initialization parameters are invalid
   * @throws RuntimeError if server fails to initialize
   */
  async initialize(): Promise<void> {
    const functionName = this.config.functionName;
    if (!functionName) {
      throw new Error('The functionName must be a valid string and cannot be None.');
    }
    
    const regionName = this.config.region;

    const serverParams: LambdaFunctionParameters = {
      functionName,
      regionName,
    };

    try {
      this._client = lambdaFunctionClient(serverParams);
      const { read, write } = await this._client.open();
      this.session = new ClientSession(read, write);
      await this.session.initialize();
    } catch (e) {
      logger.error(`Error initializing Lambda function client ${this.name}: ${e}`);
      throw e;
    }
  }
}
