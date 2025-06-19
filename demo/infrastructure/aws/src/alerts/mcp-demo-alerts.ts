import {
  Alarm,
  ComparisonOperator,
  Metric,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export interface MCPDemoAlertsProps {
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
  notificationEmail?: string;
}

export class MCPDemoAlerts extends Construct {
  public readonly notificationTopic: Topic;

  constructor(scope: Construct, id: string, props: MCPDemoAlertsProps) {
    super(scope, id);

    // Create SNS topic for notifications
    this.notificationTopic = new Topic(this, "MCPDemoAlertsTopic", {
      topicName: `${props.stage}-mcp-demo-alerts`,
      displayName: `MCP Demo Alerts - ${props.stage}`,
    });

    // Add email subscription if provided
    if (props.notificationEmail) {
      this.notificationTopic.addSubscription(
        new EmailSubscription(props.notificationEmail)
      );
    }

    // API Gateway Alarms
    this.createAPIGatewayAlarms(props);

    // Lambda Function Alarms
    this.createLambdaAlarms(props);

    // DynamoDB Alarms
    this.createDynamoDBAlarms(props);

    // WebSocket Alarms
    this.createWebSocketAlarms(props);

    // Custom Application Alarms
    this.createCustomAlarms(props);
  }

  private createAPIGatewayAlarms(props: MCPDemoAlertsProps): void {
    // High Error Rate Alarm
    new Alarm(this, "HighErrorRate", {
      alarmName: `${props.stage}-high-error-rate`,
      alarmDescription: "API Gateway error rate is too high",
      metric: new Metric({
        namespace: "AWS/ApiGateway",
        metricName: "5XXError",
        dimensionsMap: {
          ApiName: `${props.stage}-mcp-demo-api`,
        },
        statistic: "Sum",
        period: 300, // 5 minutes
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // High Latency Alarm
    new Alarm(this, "HighLatency", {
      alarmName: `${props.stage}-high-latency`,
      alarmDescription: "API Gateway latency is too high",
      metric: new Metric({
        namespace: "AWS/ApiGateway",
        metricName: "Latency",
        dimensionsMap: {
          ApiName: `${props.stage}-mcp-demo-api`,
        },
        statistic: "Average",
        period: 300,
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // High 4XX Error Rate Alarm
    new Alarm(this, "High4XXErrorRate", {
      alarmName: `${props.stage}-high-4xx-error-rate`,
      alarmDescription: "API Gateway 4XX error rate is too high",
      metric: new Metric({
        namespace: "AWS/ApiGateway",
        metricName: "4XXError",
        dimensionsMap: {
          ApiName: `${props.stage}-mcp-demo-api`,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });
  }

  private createLambdaAlarms(props: MCPDemoAlertsProps): void {
    // Lambda Error Rate Alarms
    Object.entries(props.lambdaFunctions).forEach(([name, functionName]) => {
      new Alarm(this, `${name}ErrorRate`, {
        alarmName: `${props.stage}-${name}-error-rate`,
        alarmDescription: `${name} Lambda function error rate is too high`,
        metric: new Metric({
          namespace: "AWS/Lambda",
          metricName: "Errors",
          dimensionsMap: {
            FunctionName: functionName,
          },
          statistic: "Sum",
          period: 300,
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmActions: [new SnsAction(this.notificationTopic)],
      });

      // Lambda Duration Alarm
      new Alarm(this, `${name}Duration`, {
        alarmName: `${props.stage}-${name}-duration`,
        alarmDescription: `${name} Lambda function duration is too high`,
        metric: new Metric({
          namespace: "AWS/Lambda",
          metricName: "Duration",
          dimensionsMap: {
            FunctionName: functionName,
          },
          statistic: "Average",
          period: 300,
        }),
        threshold: 25000, // 25 seconds
        evaluationPeriods: 2,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmActions: [new SnsAction(this.notificationTopic)],
      });

      // Lambda Throttle Alarm
      new Alarm(this, `${name}Throttles`, {
        alarmName: `${props.stage}-${name}-throttles`,
        alarmDescription: `${name} Lambda function is being throttled`,
        metric: new Metric({
          namespace: "AWS/Lambda",
          metricName: "Throttles",
          dimensionsMap: {
            FunctionName: functionName,
          },
          statistic: "Sum",
          period: 300,
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmActions: [new SnsAction(this.notificationTopic)],
      });
    });
  }

  private createDynamoDBAlarms(props: MCPDemoAlertsProps): void {
    // DynamoDB Throttled Requests Alarm
    new Alarm(this, "DynamoDBThrottledRequests", {
      alarmName: `${props.stage}-dynamodb-throttled-requests`,
      alarmDescription: "DynamoDB tables are being throttled",
      metric: new Metric({
        namespace: "AWS/DynamoDB",
        metricName: "ThrottledRequests",
        dimensionsMap: {
          TableName: props.chatTableName,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // DynamoDB System Errors Alarm
    new Alarm(this, "DynamoDBSystemErrors", {
      alarmName: `${props.stage}-dynamodb-system-errors`,
      alarmDescription: "DynamoDB system errors detected",
      metric: new Metric({
        namespace: "AWS/DynamoDB",
        metricName: "SystemErrors",
        dimensionsMap: {
          TableName: props.chatTableName,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // DynamoDB User Errors Alarm
    new Alarm(this, "DynamoDBUserErrors", {
      alarmName: `${props.stage}-dynamodb-user-errors`,
      alarmDescription: "DynamoDB user errors detected",
      metric: new Metric({
        namespace: "AWS/DynamoDB",
        metricName: "UserErrors",
        dimensionsMap: {
          TableName: props.chatTableName,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });
  }

  private createWebSocketAlarms(props: MCPDemoAlertsProps): void {
    // WebSocket Client Errors Alarm
    new Alarm(this, "WebSocketClientErrors", {
      alarmName: `${props.stage}-websocket-client-errors`,
      alarmDescription: "WebSocket API client errors detected",
      metric: new Metric({
        namespace: "AWS/ApiGatewayV2",
        metricName: "ClientError",
        dimensionsMap: {
          ApiId: props.websocketApiId,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // WebSocket Server Errors Alarm
    new Alarm(this, "WebSocketServerErrors", {
      alarmName: `${props.stage}-websocket-server-errors`,
      alarmDescription: "WebSocket API server errors detected",
      metric: new Metric({
        namespace: "AWS/ApiGatewayV2",
        metricName: "ServerError",
        dimensionsMap: {
          ApiId: props.websocketApiId,
        },
        statistic: "Sum",
        period: 300,
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });
  }

  private createCustomAlarms(props: MCPDemoAlertsProps): void {
    // Application Error Rate Alarm
    new Alarm(this, "ApplicationErrorRate", {
      alarmName: `${props.stage}-application-error-rate`,
      alarmDescription: "Application error rate is too high",
      metric: new Metric({
        namespace: "MCPDemo",
        metricName: "ErrorRate",
        statistic: "Average",
        period: 300,
      }),
      threshold: 0.05, // 5%
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // MCP Server Response Time Alarm
    new Alarm(this, "MCPServerResponseTime", {
      alarmName: `${props.stage}-mcp-server-response-time`,
      alarmDescription: "MCP server response time is too high",
      metric: new Metric({
        namespace: "MCPDemo",
        metricName: "MCPServerResponseTime",
        statistic: "Average",
        period: 300,
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });

    // Active Users Drop Alarm
    new Alarm(this, "ActiveUsersDrop", {
      alarmName: `${props.stage}-active-users-drop`,
      alarmDescription: "Active users have dropped significantly",
      metric: new Metric({
        namespace: "MCPDemo",
        metricName: "ActiveUsers",
        statistic: "Average",
        period: 300,
      }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      alarmActions: [new SnsAction(this.notificationTopic)],
    });
  }
}
