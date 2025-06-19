import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import { logger } from "@demo/shared";

export interface MetricData {
  namespace: string;
  metricName: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, string>;
  timestamp?: Date;
}

export interface ApplicationMetrics {
  activeUsers: number;
  messagesSent: number;
  mcpServerCalls: number;
  mcpServerResponseTime: number;
  errorRate: number;
  sessionCount: number;
  averageResponseTime: number;
}

export class MetricsService {
  private cloudWatchClient: CloudWatchClient;
  private namespace: string;
  private stage: string;

  constructor() {
    this.cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
    this.namespace = "MCPDemo";
    this.stage = process.env.STAGE || "dev";
  }

  /**
   * Record a single metric
   */
  async recordMetric(metricData: MetricData): Promise<void> {
    try {
      const command = new PutMetricDataCommand({
        Namespace: metricData.namespace,
        MetricData: [
          {
            MetricName: metricData.metricName,
            Value: metricData.value,
            Unit: metricData.unit || "Count",
            Dimensions: this.buildDimensions(metricData.dimensions),
            Timestamp: metricData.timestamp || new Date(),
          },
        ],
      });

      await this.cloudWatchClient.send(command);

      logger.info("Metric recorded successfully", {
        namespace: metricData.namespace,
        metricName: metricData.metricName,
        value: metricData.value,
        dimensions: metricData.dimensions,
      });
    } catch (error) {
      logger.error("Failed to record metric", {
        error: error instanceof Error ? error.message : String(error),
        metricData,
      });
      // Don't throw error to avoid breaking application flow
    }
  }

  /**
   * Record multiple metrics in a batch
   */
  async recordMetrics(metrics: MetricData[]): Promise<void> {
    if (metrics.length === 0) return;

    try {
      const metricData = metrics.map((metric) => ({
        MetricName: metric.metricName,
        Value: metric.value,
        Unit: metric.unit || "Count",
        Dimensions: this.buildDimensions(metric.dimensions),
        Timestamp: metric.timestamp || new Date(),
      }));

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metricData,
      });

      await this.cloudWatchClient.send(command);

      logger.info("Batch metrics recorded successfully", {
        count: metrics.length,
        metrics: metrics.map((m) => m.metricName),
      });
    } catch (error) {
      logger.error("Failed to record batch metrics", {
        error: error instanceof Error ? error.message : String(error),
        count: metrics.length,
      });
    }
  }

  /**
   * Record application-level metrics
   */
  async recordApplicationMetrics(
    metrics: Partial<ApplicationMetrics>
  ): Promise<void> {
    const metricData: MetricData[] = [];

    if (metrics.activeUsers !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "ActiveUsers",
        value: metrics.activeUsers,
        unit: "Count",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.messagesSent !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "MessagesSent",
        value: metrics.messagesSent,
        unit: "Count",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.mcpServerCalls !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "MCPServerCalls",
        value: metrics.mcpServerCalls,
        unit: "Count",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.mcpServerResponseTime !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "MCPServerResponseTime",
        value: metrics.mcpServerResponseTime,
        unit: "Milliseconds",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.errorRate !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "ErrorRate",
        value: metrics.errorRate,
        unit: "Percent",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.sessionCount !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "SessionCount",
        value: metrics.sessionCount,
        unit: "Count",
        dimensions: { Stage: this.stage },
      });
    }

    if (metrics.averageResponseTime !== undefined) {
      metricData.push({
        namespace: this.namespace,
        metricName: "AverageResponseTime",
        value: metrics.averageResponseTime,
        unit: "Milliseconds",
        dimensions: { Stage: this.stage },
      });
    }

    await this.recordMetrics(metricData);
  }

  /**
   * Record user activity metrics
   */
  async recordUserActivity(
    userId: string,
    action: string,
    duration?: number
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        namespace: this.namespace,
        metricName: "UserActivity",
        value: 1,
        unit: "Count",
        dimensions: {
          Stage: this.stage,
          Action: action,
          UserId: userId,
        },
      },
    ];

    if (duration !== undefined) {
      metrics.push({
        namespace: this.namespace,
        metricName: "UserActivityDuration",
        value: duration,
        unit: "Milliseconds",
        dimensions: {
          Stage: this.stage,
          Action: action,
          UserId: userId,
        },
      });
    }

    await this.recordMetrics(metrics);
  }

  /**
   * Record MCP server performance metrics
   */
  async recordMCPServerMetrics(
    serverName: string,
    operation: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        namespace: this.namespace,
        metricName: "MCPServerCalls",
        value: 1,
        unit: "Count",
        dimensions: {
          Stage: this.stage,
          ServerName: serverName,
          Operation: operation,
          Success: success.toString(),
        },
      },
      {
        namespace: this.namespace,
        metricName: "MCPServerResponseTime",
        value: duration,
        unit: "Milliseconds",
        dimensions: {
          Stage: this.stage,
          ServerName: serverName,
          Operation: operation,
        },
      },
    ];

    await this.recordMetrics(metrics);
  }

  /**
   * Record error metrics
   */
  async recordError(
    errorType: string,
    errorCode: string,
    component: string,
    userId?: string
  ): Promise<void> {
    const dimensions: Record<string, string> = {
      Stage: this.stage,
      ErrorType: errorType,
      ErrorCode: errorCode,
      Component: component,
    };

    if (userId) {
      dimensions.UserId = userId;
    }

    await this.recordMetric({
      namespace: this.namespace,
      metricName: "Errors",
      value: 1,
      unit: "Count",
      dimensions,
    });
  }

  /**
   * Record performance metrics
   */
  async recordPerformance(
    operation: string,
    duration: number,
    component: string,
    userId?: string
  ): Promise<void> {
    const dimensions: Record<string, string> = {
      Stage: this.stage,
      Operation: operation,
      Component: component,
    };

    if (userId) {
      dimensions.UserId = userId;
    }

    await this.recordMetric({
      namespace: this.namespace,
      metricName: "Performance",
      value: duration,
      unit: "Milliseconds",
      dimensions,
    });
  }

  /**
   * Record session metrics
   */
  async recordSessionMetrics(
    action: "created" | "deleted" | "active",
    sessionId: string,
    userId: string
  ): Promise<void> {
    await this.recordMetric({
      namespace: this.namespace,
      metricName: "SessionActivity",
      value: 1,
      unit: "Count",
      dimensions: {
        Stage: this.stage,
        Action: action,
        SessionId: sessionId,
        UserId: userId,
      },
    });
  }

  /**
   * Record message metrics
   */
  async recordMessageMetrics(
    messageType: "sent" | "received",
    sessionId: string,
    userId: string,
    messageLength: number
  ): Promise<void> {
    const metrics: MetricData[] = [
      {
        namespace: this.namespace,
        metricName: "MessageActivity",
        value: 1,
        unit: "Count",
        dimensions: {
          Stage: this.stage,
          Type: messageType,
          SessionId: sessionId,
          UserId: userId,
        },
      },
      {
        namespace: this.namespace,
        metricName: "MessageLength",
        value: messageLength,
        unit: "Count",
        dimensions: {
          Stage: this.stage,
          Type: messageType,
          SessionId: sessionId,
          UserId: userId,
        },
      },
    ];

    await this.recordMetrics(metrics);
  }

  /**
   * Build CloudWatch dimensions array
   */
  private buildDimensions(
    dimensions?: Record<string, string>
  ): Array<{ Name: string; Value: string }> {
    if (!dimensions) return [];

    return Object.entries(dimensions).map(([key, value]) => ({
      Name: key,
      Value: value,
    }));
  }

  /**
   * Get current timestamp for metrics
   */
  private getCurrentTimestamp(): Date {
    return new Date();
  }
}
