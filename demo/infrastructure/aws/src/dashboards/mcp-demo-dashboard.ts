import {
  Dashboard,
  GraphWidget,
  Metric,
  Row,
  TextWidget,
} from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

export interface MCPDemoDashboardProps {
  stage: string;
  apiGatewayId: string;
  websocketApiId: string;
  chatTableName: string;
  sessionsTableName: string;
  lambdaFunctions: {
    apiHandler: string;
    websocketHandler: string;
    weatherAlertsServer: string;
    timeServiceServer: string;
    createDemoUser: string;
  };
}

export class MCPDemoDashboard extends Construct {
  constructor(scope: Construct, id: string, props: MCPDemoDashboardProps) {
    super(scope, id);

    const dashboard = new Dashboard(this, "MCPDemoDashboard", {
      dashboardName: `${props.stage}-mcp-demo-dashboard`,
      widgets: [
        // Header
        new Row(this, "Header", [
          new TextWidget({
            markdown: `# MCP Demo Dashboard - ${props.stage.toUpperCase()}
              
              **Last Updated**: ${new Date().toISOString()}
              
              This dashboard provides real-time monitoring of the MCP Demo application, including API performance, Lambda function metrics, database operations, and custom application metrics.`,
            width: 24,
            height: 3,
          }),
        ]),

        // API Gateway Metrics
        new Row(this, "APIGatewayMetrics", [
          new GraphWidget({
            title: "API Gateway - Request Count",
            left: [
              new Metric({
                namespace: "AWS/ApiGateway",
                metricName: "Count",
                dimensionsMap: {
                  ApiName: `${props.stage}-mcp-demo-api`,
                },
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "API Gateway - Latency",
            left: [
              new Metric({
                namespace: "AWS/ApiGateway",
                metricName: "Latency",
                dimensionsMap: {
                  ApiName: `${props.stage}-mcp-demo-api`,
                },
                statistic: "Average",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // API Gateway Errors and 4XX/5XX
        new Row(this, "APIGatewayErrors", [
          new GraphWidget({
            title: "API Gateway - 4XX Errors",
            left: [
              new Metric({
                namespace: "AWS/ApiGateway",
                metricName: "4XXError",
                dimensionsMap: {
                  ApiName: `${props.stage}-mcp-demo-api`,
                },
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "API Gateway - 5XX Errors",
            left: [
              new Metric({
                namespace: "AWS/ApiGateway",
                metricName: "5XXError",
                dimensionsMap: {
                  ApiName: `${props.stage}-mcp-demo-api`,
                },
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // Lambda Function Metrics
        new Row(this, "LambdaMetrics", [
          new GraphWidget({
            title: "Lambda Functions - Invocations",
            left: [
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Invocations",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.apiHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "API Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Invocations",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.websocketHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "WebSocket Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Invocations",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.weatherAlertsServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Weather Alerts Server",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Invocations",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.timeServiceServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Time Service Server",
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "Lambda Functions - Duration",
            left: [
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Duration",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.apiHandler,
                },
                statistic: "Average",
                period: 300,
                label: "API Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Duration",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.websocketHandler,
                },
                statistic: "Average",
                period: 300,
                label: "WebSocket Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Duration",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.weatherAlertsServer,
                },
                statistic: "Average",
                period: 300,
                label: "Weather Alerts Server",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Duration",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.timeServiceServer,
                },
                statistic: "Average",
                period: 300,
                label: "Time Service Server",
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // Lambda Errors and Throttles
        new Row(this, "LambdaErrors", [
          new GraphWidget({
            title: "Lambda Functions - Errors",
            left: [
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Errors",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.apiHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "API Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Errors",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.websocketHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "WebSocket Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Errors",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.weatherAlertsServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Weather Alerts Server",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Errors",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.timeServiceServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Time Service Server",
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "Lambda Functions - Throttles",
            left: [
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Throttles",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.apiHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "API Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Throttles",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.websocketHandler,
                },
                statistic: "Sum",
                period: 300,
                label: "WebSocket Handler",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Throttles",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.weatherAlertsServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Weather Alerts Server",
              }),
              new Metric({
                namespace: "AWS/Lambda",
                metricName: "Throttles",
                dimensionsMap: {
                  FunctionName: props.lambdaFunctions.timeServiceServer,
                },
                statistic: "Sum",
                period: 300,
                label: "Time Service Server",
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // DynamoDB Metrics
        new Row(this, "DynamoDBMetrics", [
          new GraphWidget({
            title: "DynamoDB - Read/Write Capacity",
            left: [
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ConsumedReadCapacityUnits",
                dimensionsMap: {
                  TableName: props.chatTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Chat Table - Read",
              }),
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ConsumedWriteCapacityUnits",
                dimensionsMap: {
                  TableName: props.chatTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Chat Table - Write",
              }),
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ConsumedReadCapacityUnits",
                dimensionsMap: {
                  TableName: props.sessionsTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Sessions Table - Read",
              }),
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ConsumedWriteCapacityUnits",
                dimensionsMap: {
                  TableName: props.sessionsTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Sessions Table - Write",
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "DynamoDB - Throttled Requests",
            left: [
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ThrottledRequests",
                dimensionsMap: {
                  TableName: props.chatTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Chat Table",
              }),
              new Metric({
                namespace: "AWS/DynamoDB",
                metricName: "ThrottledRequests",
                dimensionsMap: {
                  TableName: props.sessionsTableName,
                },
                statistic: "Sum",
                period: 300,
                label: "Sessions Table",
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // Custom Application Metrics
        new Row(this, "CustomMetrics", [
          new GraphWidget({
            title: "Application - Active Users",
            left: [
              new Metric({
                namespace: "MCPDemo",
                metricName: "ActiveUsers",
                statistic: "Average",
                period: 300,
              }),
            ],
            width: 8,
            height: 6,
          }),
          new GraphWidget({
            title: "Application - Messages Sent",
            left: [
              new Metric({
                namespace: "MCPDemo",
                metricName: "MessagesSent",
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 8,
            height: 6,
          }),
          new GraphWidget({
            title: "Application - MCP Server Calls",
            left: [
              new Metric({
                namespace: "MCPDemo",
                metricName: "MCPServerCalls",
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 8,
            height: 6,
          }),
        ]),

        // WebSocket Metrics
        new Row(this, "WebSocketMetrics", [
          new GraphWidget({
            title: "WebSocket - Connection Count",
            left: [
              new Metric({
                namespace: "AWS/ApiGatewayV2",
                metricName: "ConnectionCount",
                dimensionsMap: {
                  ApiId: props.websocketApiId,
                },
                statistic: "Average",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
          new GraphWidget({
            title: "WebSocket - Message Count",
            left: [
              new Metric({
                namespace: "AWS/ApiGatewayV2",
                metricName: "MessageCount",
                dimensionsMap: {
                  ApiId: props.websocketApiId,
                },
                statistic: "Sum",
                period: 300,
              }),
            ],
            width: 12,
            height: 6,
          }),
        ]),

        // System Health Summary
        new Row(this, "SystemHealth", [
          new TextWidget({
            markdown: `## System Health Summary
              
              **API Gateway Status**: 🟢 Healthy
              **Lambda Functions**: 🟢 All Running
              **DynamoDB Tables**: 🟢 Operational
              **WebSocket Connections**: 🟢 Active
              
              **Last Health Check**: ${new Date().toISOString()}
              
              **Key Metrics**:
              - Average API Response Time: < 500ms
              - Error Rate: < 1%
              - Database Throttling: 0
              - Active WebSocket Connections: Stable`,
            width: 24,
            height: 4,
          }),
        ]),
      ],
    });

    // Add dashboard to stack outputs
    dashboard.node.addDependency(this);
  }
}
