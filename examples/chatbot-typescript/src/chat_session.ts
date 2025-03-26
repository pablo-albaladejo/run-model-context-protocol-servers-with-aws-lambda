import * as readline from 'readline-sync';
import { Server } from './server_clients/server.js';
import { Servers } from './server_clients/servers.js';
import { LLMClient } from './llm_client.js';
import logger from './logger.js';

/**
 * Orchestrates the interaction between user, LLM, and tools.
 */
export class ChatSession {
  private servers: Server[];
  private llmClient: LLMClient;

  constructor(servers: Server[], llmClient: LLMClient) {
    this.servers = servers;
    this.llmClient = llmClient;
  }

  /**
   * Process the LLM response and execute tools if needed.
   * @param serversManager The servers manager.
   * @param llmResponse The response from the Bedrock Converse API.
   * @returns The result of tool execution, if any.
   */
  async executeRequestedTools(
    serversManager: Servers,
    llmResponse: Record<string, any>
  ): Promise<Record<string, any> | null> {
    const stopReason = llmResponse.stopReason;

    if (stopReason === 'tool_use') {
      try {
        const toolResponses = [];
        for (const contentItem of llmResponse.output.message.content) {
          if ('toolUse' in contentItem) {
            logger.info(`Executing tool: ${contentItem.toolUse.name}`);
            logger.info(`With arguments: ${JSON.stringify(contentItem.toolUse.input)}`);
            const response = await serversManager.executeTool(
              contentItem.toolUse.name,
              contentItem.toolUse.toolUseId,
              contentItem.toolUse.input
            );
            toolResponses.push(response);
          }
        }
        return { role: 'user', content: toolResponses };
      } catch (e) {
        throw new Error(`Failed to execute tool: ${e}`);
      }
    } else {
      // Assume this catches stop reasons "end_turn", "stop_sequence", and "max_tokens"
      return null;
    }
  }

  /**
   * Main chat session handler.
   */
  async start(): Promise<void> {
    const serverManager = new Servers(this.servers);
    
    try {
      await serverManager.initialize();
      
      const allTools = await serverManager.listTools();
      const toolsDescription = allTools.map(tool => tool.formatForLLM());

      const systemPrompt = 'You are a helpful assistant.';

      const messages: Record<string, any>[] = [];

      while (true) {
        try {
          const userInput = readline.question('\nYou: ').trim().toLowerCase();
          if (userInput === 'quit' || userInput === 'exit') {
            logger.info('\nExiting...');
            break;
          }

          messages.push({ role: 'user', content: [{ text: userInput }] });

          const llmResponse = await this.llmClient.getResponse(
            messages,
            systemPrompt,
            toolsDescription
          );
          
          logger.debug('\nAssistant: ' + JSON.stringify(llmResponse, null, 2));
          console.log(`\nAssistant: ${llmResponse.output.message.content[0].text}`);
          messages.push(llmResponse.output.message);

          const toolResults = await this.executeRequestedTools(serverManager, llmResponse);

          if (toolResults) {
            logger.debug('\nTool Results: ' + JSON.stringify(toolResults, null, 2));
            messages.push(toolResults);
            const finalResponse = await this.llmClient.getResponse(
              messages,
              systemPrompt,
              toolsDescription
            );
            logger.debug('\nFinal response: ' + JSON.stringify(finalResponse, null, 2));
            console.log(`\nAssistant: ${finalResponse.output.message.content[0].text}`);
            messages.push(finalResponse.output.message);
          }
        } catch (e) {
          logger.error(`Error: ${e}`);
        }
      }
    } finally {
      await serverManager.close();
    }
  }
}
