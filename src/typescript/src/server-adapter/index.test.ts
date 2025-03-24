import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import {
  StdioClientTransport,
  StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js';

const serverParameters: StdioServerParameters = {
  command: 'node',
  args: ['../../dist/tests/minimal_mcp_server/echo_server.js'],
  cwd: __dirname,
};

test('should start then close cleanly', async () => {
  const client = new StdioClientTransport(serverParameters);
  client.onerror = (error) => {
    throw error;
  };

  let didClose = false;
  client.onclose = () => {
    didClose = true;
  };

  await client.start();
  expect(didClose).toBeFalsy();
  await client.close();
  expect(didClose).toBeTruthy();
});

test('should read messages', async () => {
  const client = new StdioClientTransport(serverParameters);
  client.onerror = (error) => {
    throw error;
  };

  const messages: JSONRPCMessage[] = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    },
    {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    },
  ];

  const readMessages: JSONRPCMessage[] = [];
  const finished = new Promise<void>((resolve) => {
    client.onmessage = (message) => {
      console.log('Received message', message);
      readMessages.push(message);

      if (readMessages.length == 1) {
        resolve();
      }
    };
  });

  await client.start();
  console.log('Sending message 1');
  await client.send(messages[0]);
  console.log('Sending message 2');
  await client.send(messages[1]);
  console.log('Reading messages');
  await finished;

  await client.close();
});
