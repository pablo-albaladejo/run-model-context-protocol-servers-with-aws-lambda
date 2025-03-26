import { ClientSession, StdioServerParameters, stdioClient } from '@modelcontextprotocol/sdk';
import { Server } from './server.js';
import { which } from 'node:child_process';
import { promisify } from 'node:util';
import logger from '../logger.js';

const whichPromise = promisify(which);

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
    let command = this.config.command;
    
    // Handle npx specially
    if (command === 'npx') {
      try {
        command = await whichPromise('npx');
      } catch (e) {
        throw new Error('The npx command was not found in PATH');
      }
    }
    
    if (!command) {
      throw new Error('The command must be a valid string and cannot be None.');
    }

    const serverParams: StdioServerParameters = {
      command,
      args: this.config.args,
      env: this.config.env ? { ...process.env, ...this.config.env } : undefined,
    };

    try {
      this._client = stdioClient(serverParams);
      const { read, write } = await this._client.open();
      this.session = new ClientSession(read, write);
      await this.session.initialize();
    } catch (e) {
      logger.error(`Error initializing server ${this.name}: ${e}`);
      throw e;
    }
  }
}
