import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandOutput,
  Message,
  Tool,
} from "@aws-sdk/client-bedrock-runtime";

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
   * @param messages A list of message for the model.
   * @param systemPrompt The system prompt to use.
   * @param tools The list of tools to make available to the model.
   * @returns The LLM's full response.
   */
  async getResponse(
    messages: Message[],
    systemPrompt: string,
    tools: Tool[]
  ): Promise<ConverseCommandOutput> {
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

    return await this.bedrockClient.send(command);
  }
}
