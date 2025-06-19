# Monitoring and Observability Guide

## 📋 Overview

This document provides a comprehensive guide to monitoring and observability in the MCP Demo project. We implement a multi-layered observability strategy using AWS CloudWatch, custom metrics, structured logging, and alerting.

## 🏗️ Observability Strategy

### Observability Pillars

1. **Metrics** - Quantitative data about system performance
2. **Logs** - Structured event data for debugging and analysis
3. **Traces** - Distributed request tracking across services
4. **Alerts** - Proactive notification of issues

### Monitoring Stack

- **AWS CloudWatch** - Central monitoring and alerting
- **Custom Metrics** - Application-specific measurements
- **Structured Logging** - Consistent log format and correlation
- **X-Ray Tracing** - Distributed tracing (optional)
- **SNS Notifications** - Alert delivery

## 📊 CloudWatch Dashboard

### Dashboard Overview

The MCP Demo dashboard provides real-time visibility into:

- **API Gateway Performance** - Request count, latency, errors
- **Lambda Function Metrics** - Invocations, duration, errors, throttles
- **DynamoDB Operations** - Read/write capacity, throttled requests
- **WebSocket Connections** - Connection count, message count
- **Custom Application Metrics** - Active users, messages, MCP server calls

### Dashboard Sections

#### 1. API Gateway Metrics

- **Request Count** - Total API requests per time period
- **Latency** - Average response time
- **4XX Errors** - Client error rate
- **5XX Errors** - Server error rate

#### 2. Lambda Function Metrics

- **Invocations** - Function call frequency
- **Duration** - Execution time
- **Errors** - Function failures
- **Throttles** - Rate limiting events

#### 3. DynamoDB Metrics

- **Read/Write Capacity** - Database consumption
- **Throttled Requests** - Capacity exceeded events
- **System Errors** - Database failures

#### 4. Custom Application Metrics

- **Active Users** - Concurrent user count
- **Messages Sent** - Chat message volume
- **MCP Server Calls** - External service usage

### Accessing the Dashboard

1. **AWS Console**: Navigate to CloudWatch > Dashboards
2. **Direct URL**: `https://console.aws.amazon.com/cloudwatch/home#dashboards:name=STAGE-mcp-demo-dashboard`
3. **Programmatic**: Use AWS CLI or SDK to access metrics

## 🚨 Alerting System

### Alert Categories

#### Critical Alerts (Immediate Action Required)

- **High Error Rate** - 5XX errors > 5 in 5 minutes
- **High Latency** - API response time > 5 seconds
- **Lambda Errors** - Any function error
- **Database Errors** - DynamoDB system errors

#### Warning Alerts (Monitor Closely)

- **4XX Error Rate** - Client errors > 10 in 5 minutes
- **Lambda Throttles** - Function rate limiting
- **Database Throttling** - DynamoDB capacity exceeded
- **High Response Time** - Lambda duration > 25 seconds

#### Informational Alerts (Trend Analysis)

- **Active Users Drop** - User count < 1 for 15 minutes
- **MCP Server Issues** - Response time > 10 seconds
- **Application Error Rate** - Errors > 5%

### Alert Configuration

```typescript
// Example: High Error Rate Alert
new Alarm(this, "HighErrorRate", {
  alarmName: `${stage}-high-error-rate`,
  metric: new Metric({
    namespace: "AWS/ApiGateway",
    metricName: "5XXError",
    statistic: "Sum",
    period: 300, // 5 minutes
  }),
  threshold: 5,
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  alarmActions: [new SnsAction(notificationTopic)],
});
```

### Alert Actions

1. **SNS Notifications** - Email alerts to team
2. **Slack Integration** - Real-time team notifications
3. **PagerDuty** - Escalation for critical issues
4. **Auto Scaling** - Automatic resource scaling

## 📈 Custom Metrics

### Application Metrics

#### User Activity Metrics

```typescript
// Record user activity
await metricsService.recordUserActivity(userId, "message_sent", duration);
```

#### Session Metrics

```typescript
// Record session activity
await metricsService.recordSessionMetrics("created", sessionId, userId);
```

#### MCP Server Metrics

```typescript
// Record MCP server performance
await metricsService.recordMCPServerMetrics(
  "weather-alerts",
  "get_weather",
  duration,
  success
);
```

### Metric Namespaces

- **MCPDemo** - Application-specific metrics
- **AWS/ApiGateway** - API Gateway metrics
- **AWS/Lambda** - Lambda function metrics
- **AWS/DynamoDB** - Database metrics
- **AWS/ApiGatewayV2** - WebSocket metrics

### Metric Dimensions

Common dimensions for filtering and grouping:

- **Stage** - Environment (dev, staging, prod)
- **UserId** - Individual user tracking
- **SessionId** - Chat session tracking
- **ServerName** - MCP server identification
- **Operation** - Specific operation type
- **Component** - System component

## 📝 Structured Logging

### Log Format

All logs follow a consistent JSON structure:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "req_1705312200000_abc123",
  "userId": "user-123",
  "sessionId": "session-456",
  "method": "POST",
  "url": "/api/chat/messages",
  "statusCode": 200,
  "duration": 245,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Levels

- **ERROR** - System errors requiring immediate attention
- **WARN** - Issues that need monitoring
- **INFO** - General application flow
- **DEBUG** - Detailed debugging information

### Correlation IDs

Every request gets a unique correlation ID (`requestId`) that links:

- Request logs
- Response logs
- Database operations
- External service calls
- Error logs

### Log Sanitization

Sensitive data is automatically redacted:

- Authorization headers
- API keys
- Session tokens
- Personal information

## 🔍 Troubleshooting Guide

### Common Issues and Solutions

#### High Error Rate

1. **Check CloudWatch Logs** for error details
2. **Review Lambda Function Logs** for execution errors
3. **Verify Database Connectivity** for DynamoDB issues
4. **Check External Services** for MCP server availability

#### High Latency

1. **Analyze Lambda Duration** metrics
2. **Check Database Performance** for throttling
3. **Review External Service** response times
4. **Monitor Memory Usage** for Lambda functions

#### Database Issues

1. **Check DynamoDB Throttling** metrics
2. **Review Capacity Settings** for tables
3. **Analyze Query Patterns** for optimization
4. **Monitor Connection Limits**

#### WebSocket Issues

1. **Check Connection Count** metrics
2. **Review Message Count** for anomalies
3. **Verify Lambda Function** for WebSocket handler
4. **Check Client Connectivity**

### Debugging Workflow

1. **Start with Alerts** - Identify the issue type
2. **Check Dashboard** - Get overview of system state
3. **Review Logs** - Find detailed error information
4. **Analyze Metrics** - Understand performance patterns
5. **Trace Requests** - Follow request flow through system

## 🛠️ Monitoring Tools

### AWS CloudWatch

#### Metrics

```bash
# Get API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=dev-mcp-demo-api \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 300 \
  --statistics Sum
```

#### Logs

```bash
# Get Lambda function logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/dev-api-handler \
  --start-time 1705312200000 \
  --filter-pattern "ERROR"
```

#### Alarms

```bash
# List active alarms
aws cloudwatch describe-alarms \
  --state-value ALARM
```

### Custom Metrics

#### Recording Metrics

```typescript
// Record custom metric
await metricsService.recordMetric({
  namespace: "MCPDemo",
  metricName: "ActiveUsers",
  value: 25,
  unit: "Count",
  dimensions: { Stage: "dev" },
});
```

#### Querying Metrics

```bash
# Get custom application metrics
aws cloudwatch get-metric-statistics \
  --namespace MCPDemo \
  --metric-name ActiveUsers \
  --dimensions Name=Stage,Value=dev \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 300 \
  --statistics Average
```

## 📊 Performance Baselines

### Expected Performance

#### API Gateway

- **Response Time**: < 500ms average
- **Error Rate**: < 1% 5XX errors
- **Availability**: > 99.9%

#### Lambda Functions

- **Duration**: < 10 seconds average
- **Error Rate**: < 0.1%
- **Throttles**: 0 per day

#### DynamoDB

- **Read Latency**: < 10ms average
- **Write Latency**: < 20ms average
- **Throttled Requests**: 0 per day

#### Application Metrics

- **Active Users**: 10-100 concurrent
- **Message Throughput**: 100-1000 messages/hour
- **MCP Server Response**: < 5 seconds

### SLOs and SLIs

#### Service Level Objectives (SLOs)

- **Availability**: 99.9% uptime
- **Latency**: 95th percentile < 1 second
- **Error Rate**: < 0.1% for 5XX errors

#### Service Level Indicators (SLIs)

- **Request Success Rate**: Successful requests / Total requests
- **Response Time**: Time to complete request
- **Throughput**: Requests per second

## 🔧 Configuration

### Environment Variables

```bash
# Monitoring configuration
POWERTOOLS_SERVICE_NAME=mcp-demo-api
POWERTOOLS_METRICS_NAMESPACE=MCPDemo
POWERTOOLS_LOGGER_LOG_EVENT=true
POWERTOOLS_TRACER_CAPTURE_RESPONSE=true
POWERTOOLS_TRACER_CAPTURE_ERROR=true

# CloudWatch configuration
AWS_REGION=us-east-1
STAGE=dev

# Alerting configuration
ALERT_EMAIL=team@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Dashboard Configuration

```typescript
// Dashboard setup
const dashboard = new MCPDemoDashboard(this, "Dashboard", {
  stage: "dev",
  apiGatewayId: apiGateway.restApiId,
  websocketApiId: websocketApi.apiId,
  chatTableName: chatTable.tableName,
  sessionsTableName: sessionsTable.tableName,
  lambdaFunctions: {
    apiHandler: apiHandler.functionName,
    websocketHandler: websocketHandler.functionName,
    weatherAlertsServer: weatherServer.functionName,
    timeServiceServer: timeServer.functionName,
    createDemoUser: createUser.functionName,
  },
});
```

## 📚 Best Practices

### Monitoring Best Practices

1. **Set Appropriate Thresholds** - Base on historical data
2. **Use Multiple Evaluation Periods** - Avoid false positives
3. **Implement Graduated Alerting** - Different severity levels
4. **Monitor Business Metrics** - Not just technical metrics
5. **Regular Review** - Update thresholds and alerts

### Logging Best Practices

1. **Structured Format** - Use JSON for machine readability
2. **Correlation IDs** - Link related log entries
3. **Appropriate Levels** - Use correct log levels
4. **Sanitize Data** - Remove sensitive information
5. **Performance Impact** - Minimize logging overhead

### Alerting Best Practices

1. **Actionable Alerts** - Include remediation steps
2. **Avoid Alert Fatigue** - Don't over-alert
3. **Escalation Path** - Define who handles what
4. **Documentation** - Document alert meanings
5. **Regular Review** - Update alert configurations

## 🤝 Contributing

When adding new monitoring:

1. **Define Metrics** - What to measure and why
2. **Set Baselines** - Expected performance ranges
3. **Create Alerts** - When to notify
4. **Update Documentation** - Document new monitoring
5. **Test Monitoring** - Verify alerts work correctly

For questions or issues with monitoring, please refer to the project's issue tracker or contact the development team.
