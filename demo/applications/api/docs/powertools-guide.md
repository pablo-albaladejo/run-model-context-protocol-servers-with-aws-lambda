# AWS Lambda PowerTools Implementation Guide

## Overview

This guide covers the implementation of AWS Lambda PowerTools in the MCP Demo API project. PowerTools provides structured logging, custom metrics, distributed tracing, and validation for serverless applications.

## Features Implemented

### ✅ Structured Logging

- **Correlation IDs** for request tracking
- **Structured JSON logs** with context
- **Log levels** (DEBUG, INFO, WARN, ERROR)
- **Automatic request/response logging**

### ✅ Custom Metrics

- **Business metrics** (messages sent, sessions created)
- **Performance metrics** (request duration, database query time)
- **Error metrics** (validation, authentication, database errors)
- **MCP service metrics** (calls, success, errors)

### ✅ Distributed Tracing

- **X-Ray integration** for request tracing
- **Database operation tracing**
- **MCP service call tracing**
- **HTTP request tracing**

### ✅ Error Tracking

- **Categorized error metrics**
- **Automatic error logging**
- **Error correlation with requests**

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Lambda Function│───▶│   PowerTools    │
│                 │    │                 │    │   Middleware    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   DynamoDB      │    │   CloudWatch    │
                       │   (Data)        │    │   (Logs/Metrics)│
                       └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

```bash
# PowerTools Configuration
POWERTOOLS_SERVICE_NAME=mcp-demo-api
POWERTOOLS_METRICS_NAMESPACE=MCPDemo
POWERTOOLS_LOGGER_LOG_EVENT=true
POWERTOOLS_LOGGER_SAMPLE_RATE=1
POWERTOOLS_TRACER_CAPTURE_RESPONSE=true
POWERTOOLS_TRACER_CAPTURE_ERROR=true

# Environment
STAGE=dev
AWS_REGION=us-east-1
LOG_LEVEL=INFO
```

### Dependencies

```json
{
  "@aws-lambda-powertools/logger": "^2.0.0",
  "@aws-lambda-powertools/metrics": "^2.0.0",
  "@aws-lambda-powertools/tracer": "^2.0.0"
}
```

## Usage Examples

### 1. Basic Logging

```typescript
import { logger } from "../infrastructure/middleware/powertools-middleware";

// Structured logging with context
logger.info("User action completed", {
  userId: "user123",
  action: "message_sent",
  sessionId: "session456",
  correlationId: logger.getCorrelationId(),
});
```

### 2. Custom Metrics

```typescript
import { trackBusinessMetric } from "../infrastructure/middleware/powertools-middleware";

// Track business metrics
trackBusinessMetric.messageSent();
trackBusinessMetric.sessionCreated();
trackBusinessMetric.mcpServiceCall("weather-alerts");
```

### 3. Error Tracking

```typescript
import { trackBusinessMetric } from "../infrastructure/middleware/powertools-middleware";

try {
  // Your code here
} catch (error) {
  trackBusinessMetric.databaseError();
  logger.error("Database operation failed", {
    error: error.message,
    operation: "save_message",
    correlationId: logger.getCorrelationId(),
  });
}
```

### 4. Tracing

```typescript
import { traceDatabaseOperation } from "../infrastructure/middleware/tracing-middleware";

class ChatMessageRepository {
  @traceDatabaseOperation("save", "chat-messages")
  async save(message: ChatMessage): Promise<void> {
    // Database operation
  }
}
```

## Middleware Integration

### PowerTools Middleware

```typescript
import { powertoolsMiddleware } from "../infrastructure/middleware/powertools-middleware";

export const handler = middy(async (event) => {
  // Your handler logic
}).use(powertoolsMiddleware());
```

### Authentication Middleware

```typescript
import { authMiddleware } from "../infrastructure/middleware/auth-middleware";

export const protectedHandler = middy(async (event) => {
  // Protected handler logic
}).use(authMiddleware());
```

## Monitoring and Alerting

### CloudWatch Dashboards

The implementation includes automatic creation of CloudWatch dashboards with:

- **Business Metrics**: Messages sent, sessions created, user logins
- **Performance Metrics**: Request duration, database query time
- **Error Metrics**: Validation, authentication, database errors
- **User Engagement**: Active users, total sessions

### CloudWatch Alarms

Automatic alarms are created for:

- **High Error Rate**: >5% error rate
- **High Latency**: >5 seconds average response time
- **Database Errors**: Any database error
- **MCP Service Errors**: Any MCP service error
- **Authentication Failures**: >5 auth failures

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @aws-lambda-powertools/logger @aws-lambda-powertools/metrics @aws-lambda-powertools/tracer
```

### 2. Run Setup Script

```bash
./scripts/setup-powertools.sh dev
```

### 3. Deploy

```bash
./deploy-powertools.sh
```

### 4. Monitor

```bash
./monitor-powertools.sh
```

## Best Practices

### 1. Logging

- ✅ Use structured logging with context
- ✅ Include correlation IDs in all logs
- ✅ Use appropriate log levels
- ❌ Don't log sensitive information
- ❌ Don't use console.log

### 2. Metrics

- ✅ Track business-relevant metrics
- ✅ Use consistent naming conventions
- ✅ Add dimensions for filtering
- ❌ Don't track too many metrics
- ❌ Don't use high-cardinality dimensions

### 3. Tracing

- ✅ Trace external service calls
- ✅ Trace database operations
- ✅ Add meaningful annotations
- ❌ Don't trace internal operations unnecessarily
- ❌ Don't add sensitive data to traces

### 4. Error Handling

- ✅ Categorize errors appropriately
- ✅ Include context in error logs
- ✅ Track error metrics
- ❌ Don't swallow errors
- ❌ Don't log stack traces in production

## Troubleshooting

### Common Issues

1. **Metrics not appearing in CloudWatch**

   - Check namespace configuration
   - Verify metric publishing
   - Check IAM permissions

2. **Logs not structured**

   - Ensure PowerTools logger is used
   - Check log level configuration
   - Verify middleware is applied

3. **Tracing not working**
   - Check X-Ray permissions
   - Verify tracer configuration
   - Ensure decorators are applied correctly

### Debug Commands

```bash
# View recent logs
aws logs tail /aws/lambda/MCPDemoStack-dev-api --since 1h

# View metrics
aws cloudwatch get-metric-statistics \
  --namespace "MCPDemo" \
  --metric-name "MessagesSent" \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Sum

# View alarms
aws cloudwatch describe-alarms --alarm-name-prefix "MCPDemo"
```

## Performance Considerations

### Memory Usage

- PowerTools adds minimal memory overhead
- Metrics are batched and published automatically
- Logs are structured but lightweight

### Cold Start Impact

- PowerTools initialization is fast
- Middleware is applied efficiently
- No significant cold start impact

### Cost Optimization

- Log retention is set to 30 days
- Metrics are aggregated appropriately
- Tracing samples can be configured

## Security

### IAM Permissions

Required permissions for PowerTools:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
      "Resource": "*"
    }
  ]
}
```

### Data Privacy

- No sensitive data is logged
- Correlation IDs are randomly generated
- Metrics are aggregated and anonymized
- Traces can be filtered for sensitive data

## Future Enhancements

### Planned Features

1. **Custom Validators**: Zod integration with PowerTools
2. **Advanced Tracing**: Custom trace segments for business logic
3. **Metric Aggregation**: Custom aggregations for business insights
4. **Alert Integration**: SNS/Slack integration for alerts
5. **Performance Profiling**: Detailed performance analysis

### Monitoring Improvements

1. **Real-time Dashboards**: Live monitoring dashboards
2. **Anomaly Detection**: ML-based anomaly detection
3. **Cost Monitoring**: PowerTools cost tracking
4. **Health Checks**: Automated health check endpoints

## Support and Resources

### Documentation

- [PowerTools Documentation](https://awslabs.github.io/aws-lambda-powertools-typescript/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)

### Community

- [PowerTools GitHub](https://github.com/awslabs/aws-lambda-powertools-typescript)
- [AWS Lambda Community](https://aws.amazon.com/lambda/community/)
- [Serverless Framework](https://www.serverless.com/)

### Tools

- [PowerTools CLI](https://github.com/awslabs/aws-lambda-powertools-typescript/tree/main/packages/cli)
- [CloudWatch Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html)
- [X-Ray Console](https://console.aws.amazon.com/xray/)
