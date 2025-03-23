import { Handler, Context } from 'aws-lambda';
import { stdioServerAdapter } from 'mcp-lambda';

const serverParams = {
  command: 'npx',
  args: ['--offline', 'openapi-mcp-server', './weather-alerts-openapi.json'],
};

export const handler: Handler = async (event, context: Context) => {
  return await stdioServerAdapter(serverParams, event, context);
};
