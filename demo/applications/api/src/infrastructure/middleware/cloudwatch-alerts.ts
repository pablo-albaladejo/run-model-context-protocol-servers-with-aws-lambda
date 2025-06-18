import {
  CloudWatchClient,
  PutMetricAlarmCommand,
} from "@aws-sdk/client-cloudwatch";
import { logger } from "./powertools-middleware";

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// CloudWatch Alarms Configuration
export const cloudWatchAlarms = {
  // High Error Rate Alarm
  highErrorRate: {
    AlarmName: "MCPDemo-HighErrorRate",
    AlarmDescription: "Alarm when error rate exceeds 5%",
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Statistic: "Sum",
    Period: 300, // 5 minutes
    EvaluationPeriods: 2,
    Threshold: 5,
    ComparisonOperator: "GreaterThanThreshold",
    TreatMissingData: "notBreaching",
  },

  // High Latency Alarm
  highLatency: {
    AlarmName: "MCPDemo-HighLatency",
    AlarmDescription: "Alarm when average response time exceeds 5 seconds",
    MetricName: "Duration",
    Namespace: "AWS/Lambda",
    Statistic: "Average",
    Period: 300, // 5 minutes
    EvaluationPeriods: 2,
    Threshold: 5000, // 5 seconds in milliseconds
    ComparisonOperator: "GreaterThanThreshold",
    TreatMissingData: "notBreaching",
  },

  // Database Error Alarm
  databaseErrors: {
    AlarmName: "MCPDemo-DatabaseErrors",
    AlarmDescription: "Alarm when database errors occur",
    MetricName: "DatabaseErrors",
    Namespace: "MCPDemo",
    Statistic: "Sum",
    Period: 300, // 5 minutes
    EvaluationPeriods: 1,
    Threshold: 1,
    ComparisonOperator: "GreaterThanThreshold",
    TreatMissingData: "notBreaching",
  },

  // MCP Service Error Alarm
  mcpServiceErrors: {
    AlarmName: "MCPDemo-MCPServiceErrors",
    AlarmDescription: "Alarm when MCP service errors occur",
    MetricName: "MCPServiceErrors",
    Namespace: "MCPDemo",
    Statistic: "Sum",
    Period: 300, // 5 minutes
    EvaluationPeriods: 1,
    Threshold: 1,
    ComparisonOperator: "GreaterThanThreshold",
    TreatMissingData: "notBreaching",
  },

  // Authentication Failure Alarm
  authFailures: {
    AlarmName: "MCPDemo-AuthFailures",
    AlarmDescription: "Alarm when authentication failures occur",
    MetricName: "AuthenticationErrors",
    Namespace: "MCPDemo",
    Statistic: "Sum",
    Period: 300, // 5 minutes
    EvaluationPeriods: 1,
    Threshold: 5,
    ComparisonOperator: "GreaterThanThreshold",
    TreatMissingData: "notBreaching",
  },
};

// Function to create CloudWatch alarms
export const createCloudWatchAlarms = async (functionName: string) => {
  try {
    const alarms = [
      {
        ...cloudWatchAlarms.highErrorRate,
        Dimensions: [{ Name: "FunctionName", Value: functionName }],
      },
      {
        ...cloudWatchAlarms.highLatency,
        Dimensions: [{ Name: "FunctionName", Value: functionName }],
      },
      cloudWatchAlarms.databaseErrors,
      cloudWatchAlarms.mcpServiceErrors,
      cloudWatchAlarms.authFailures,
    ];

    for (const alarm of alarms) {
      await cloudWatchClient.send(new PutMetricAlarmCommand(alarm));
      logger.info("CloudWatch alarm created", {
        alarmName: alarm.AlarmName,
        functionName,
        correlationId: logger.getCorrelationId(),
      });
    }

    logger.info("All CloudWatch alarms created successfully", {
      functionName,
      alarmCount: alarms.length,
      correlationId: logger.getCorrelationId(),
    });
  } catch (error) {
    logger.error("Error creating CloudWatch alarms", {
      error: error instanceof Error ? error.message : String(error),
      functionName,
      correlationId: logger.getCorrelationId(),
    });
    throw error;
  }
};

// Dashboard configuration
export const cloudWatchDashboard = {
  DashboardName: "MCPDemo-API-Dashboard",
  DashboardBody: JSON.stringify({
    widgets: [
      {
        type: "metric",
        x: 0,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["MCPDemo", "MessagesSent"],
            ["MCPDemo", "SessionsCreated"],
            ["MCPDemo", "UserLogins"],
          ],
          period: 300,
          stat: "Sum",
          region: process.env.AWS_REGION || "us-east-1",
          title: "Business Metrics",
        },
      },
      {
        type: "metric",
        x: 12,
        y: 0,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["MCPDemo", "RequestDuration"],
            ["MCPDemo", "DatabaseQueryTime"],
            ["MCPDemo", "ExternalApiCallTime"],
          ],
          period: 300,
          stat: "Average",
          region: process.env.AWS_REGION || "us-east-1",
          title: "Performance Metrics",
        },
      },
      {
        type: "metric",
        x: 0,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["MCPDemo", "ValidationErrors"],
            ["MCPDemo", "AuthenticationErrors"],
            ["MCPDemo", "DatabaseErrors"],
            ["MCPDemo", "MCPServiceErrors"],
          ],
          period: 300,
          stat: "Sum",
          region: process.env.AWS_REGION || "us-east-1",
          title: "Error Metrics",
        },
      },
      {
        type: "metric",
        x: 12,
        y: 6,
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ["MCPDemo", "ActiveUsers"],
            ["MCPDemo", "TotalSessions"],
            ["MCPDemo", "MessagesPerSession"],
          ],
          period: 300,
          stat: "Average",
          region: process.env.AWS_REGION || "us-east-1",
          title: "User Engagement Metrics",
        },
      },
    ],
  }),
};

// Function to create CloudWatch dashboard
export const createCloudWatchDashboard = async () => {
  try {
    const { PutDashboardCommand } = await import("@aws-sdk/client-cloudwatch");

    await cloudWatchClient.send(new PutDashboardCommand(cloudWatchDashboard));

    logger.info("CloudWatch dashboard created successfully", {
      dashboardName: cloudWatchDashboard.DashboardName,
      correlationId: logger.getCorrelationId(),
    });
  } catch (error) {
    logger.error("Error creating CloudWatch dashboard", {
      error: error instanceof Error ? error.message : String(error),
      correlationId: logger.getCorrelationId(),
    });
    throw error;
  }
};
