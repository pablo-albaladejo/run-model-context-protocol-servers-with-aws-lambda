import { Tool as BedrockTool } from "@aws-sdk/client-bedrock-runtime";

/**
 * Represents a tool with its properties and formatting.
 */
export class Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;

  constructor(
    name: string,
    description: string,
    inputSchema: Record<string, any>
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Format tool information for the Bedrock Converse API.
   * @returns A tool specification dictionary.
   */
  formatForLLM(): BedrockTool {
    return {
      toolSpec: {
        name: this.name,
        description: this.description,
        inputSchema: {
          json: this.inputSchema,
        },
      },
    };
  }
}
