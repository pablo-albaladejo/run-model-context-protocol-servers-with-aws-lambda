#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { getEnvironmentConfig } from "./config/environment";
import { MCPDemoStack } from "./stacks/mcp-demo-stack";

const app = new cdk.App();

// Get environment from context or default to dev
const environment = app.node.tryGetContext("environment") || "dev";
const config = getEnvironmentConfig(environment);

new MCPDemoStack(app, "MCPDemoStack", {
  config,
  env: {
    account: config.account,
    region: config.region,
  },
  description: `MCP Demo Stack (${config.environment}) with WebSocket API, Lambda Functions, and DynamoDB`,
});
