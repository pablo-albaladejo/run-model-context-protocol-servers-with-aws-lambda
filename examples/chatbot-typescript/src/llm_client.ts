import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Manages communication with Bedrock.
 */
export class LLMClient {
  private bedrockClient: BedrockRuntimeClient;
  private modelId: string;

  constructor(bedrockClient: BedrockRuntimeClient, modelId: string) {
    this.bedrockClient = bedrockClient;
    this.modelId = modelId;
  }

  /**
   * Get a response from the LLM, using the Bedrock Converse API.
   * @param messages A list of message dictionaries.
   * @param systemPrompt The system prompt to use.
   * @param tools The list of tools to make available to the model.
   * @returns The LLM's full response.
   */
  async getResponse(
    messages: Record<string, any>[],
    systemPrompt: string,
    tools: Record<string, any>[]
  ): Promise<Record<string, any>> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1,
      },
      toolConfig: { tools },
    });

    const response = await this.bedrockClient.send(command);
    return response as Record<string, any>;
  }
}
