import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { MCPDemoStack } from "../src/stacks/mcp-demo-stack";

describe("MCP Demo Stack", () => {
  it("should create all required resources", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStack", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "test-chat-table",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
        {
          AttributeName: "sessionId",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
        {
          AttributeName: "sessionId",
          KeyType: "RANGE",
        },
      ],
    });

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "test-sessions-table",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
    });

    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "test-mcp-demo-user-pool",
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
          RequireUppercase: true,
        },
      },
    });

    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      UserPoolId: {
        Ref: expect.stringMatching(/UserPool/),
      },
      GenerateSecret: false,
      ExplicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH",
      ],
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Timeout: 30,
      MemorySize: 512,
      Environment: {
        Variables: {
          CHAT_TABLE_NAME: "test-chat-table",
          SESSIONS_TABLE_NAME: "test-sessions-table",
          USER_POOL_ID: {
            Ref: expect.stringMatching(/UserPool/),
          },
          CLIENT_ID: {
            Ref: expect.stringMatching(/UserPoolClient/),
          },
          POWERTOOLS_SERVICE_NAME: "mcp-demo-api",
          POWERTOOLS_METRICS_NAMESPACE: "MCPDemo",
          POWERTOOLS_LOGGER_LOG_EVENT: "true",
          POWERTOOLS_TRACER_CAPTURE_RESPONSE: "true",
          POWERTOOLS_TRACER_CAPTURE_ERROR: "true",
        },
      },
    });

    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "test-mcp-demo-api",
      Description: "MCP Demo API Gateway",
    });

    template.hasResourceProperties("AWS::ApiGateway::WebSocketApi", {
      Name: "test-mcp-demo-websocket",
      Description: "MCP Demo WebSocket API",
    });

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: expect.stringMatching(/test-mcp-demo-webapp/),
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Origins: [
          {
            DomainName: expect.stringMatching(/test-mcp-demo-webapp/),
            Id: "S3Origin",
            S3OriginConfig: {
              OriginAccessIdentity: expect.any(String),
            },
          },
        ],
        DefaultCacheBehavior: {
          TargetOriginId: "S3Origin",
          ViewerProtocolPolicy: "redirect-to-https",
          Compress: true,
        },
        Enabled: true,
        HttpVersion: "http2",
        IPV6Enabled: true,
      },
    });
  });

  it("should create CloudWatch alarms when enabled", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackWithAlarms", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-high-error-rate",
      MetricName: "Errors",
      Namespace: "AWS/ApiGateway",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 5,
      ComparisonOperator: "GreaterThanThreshold",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-high-latency",
      MetricName: "Latency",
      Namespace: "AWS/ApiGateway",
      Statistic: "Average",
      Period: 300,
      EvaluationPeriods: 2,
      Threshold: 5000,
      ComparisonOperator: "GreaterThanThreshold",
    });

    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-database-errors",
      MetricName: "SystemErrors",
      Namespace: "AWS/DynamoDB",
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanThreshold",
    });
  });

  it("should not create CloudWatch alarms when disabled", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackWithoutAlarms", {
      stage: "test",
      region: "us-east-1",
      enableXRay: false,
      enableCloudWatchAlarms: false,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.resourceCountIs("AWS::CloudWatch::Alarm", 0);
  });

  it("should create IAM roles with least privilege", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackIAM", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
          },
        ],
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          {
            Effect: "Allow",
            Action: [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
              "dynamodb:Scan",
            ],
            Resource: expect.arrayContaining([
              {
                "Fn::GetAtt": [expect.stringMatching(/ChatTable/), "Arn"],
              },
              {
                "Fn::GetAtt": [expect.stringMatching(/SessionsTable/), "Arn"],
              },
            ]),
          },
        ]),
      },
    });
  });

  it("should create CloudWatch dashboard", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackDashboard", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::CloudWatch::Dashboard", {
      DashboardName: "test-mcp-demo-dashboard",
      DashboardBody: expect.stringContaining("MCP Demo Dashboard"),
    });
  });

  it("should create X-Ray tracing when enabled", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackXRay", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: expect.objectContaining({
          POWERTOOLS_TRACER_CAPTURE_RESPONSE: "true",
          POWERTOOLS_TRACER_CAPTURE_ERROR: "true",
        }),
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          {
            Effect: "Allow",
            Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
            Resource: "*",
          },
        ]),
      },
    });
  });

  it("should create outputs for frontend configuration", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackOutputs", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasOutput("ApiUrl", {
      Description: "API Gateway URL",
      Value: {
        "Fn::Sub": expect.stringContaining("https://"),
      },
    });

    template.hasOutput("WebSocketUrl", {
      Description: "WebSocket API URL",
      Value: {
        "Fn::Sub": expect.stringContaining("wss://"),
      },
    });

    template.hasOutput("UserPoolId", {
      Description: "Cognito User Pool ID",
      Value: {
        Ref: expect.stringMatching(/UserPool/),
      },
    });

    template.hasOutput("UserPoolClientId", {
      Description: "Cognito User Pool Client ID",
      Value: {
        Ref: expect.stringMatching(/UserPoolClient/),
      },
    });

    template.hasOutput("WebAppBucket", {
      Description: "S3 Bucket for web app",
      Value: {
        Ref: expect.stringMatching(/WebAppBucket/),
      },
    });

    template.hasOutput("WebAppDistributionId", {
      Description: "CloudFront Distribution ID",
      Value: {
        Ref: expect.stringMatching(/WebAppDistribution/),
      },
    });
  });

  it("should create MCP server Lambda functions", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackMCPServers", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "test-weather-alerts-mcp-server",
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Timeout: 30,
      MemorySize: 256,
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "test-time-service-mcp-server",
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Timeout: 30,
      MemorySize: 256,
    });

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "test-create-demo-user",
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Timeout: 60,
      MemorySize: 256,
    });
  });

  it("should create WebSocket handler", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackWebSocket", {
      stage: "test",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "test-websocket-handler",
      Runtime: "nodejs18.x",
      Handler: "index.handler",
      Timeout: 30,
      MemorySize: 512,
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      IntegrationType: "AWS_PROXY",
      IntegrationUri: {
        "Fn::Sub": expect.stringContaining("websocket-handler"),
      },
    });
  });

  it("should create proper resource naming with stage prefix", () => {
    // Given
    const app = new App();
    const stack = new MCPDemoStack(app, "TestMCPDemoStackNaming", {
      stage: "production",
      region: "us-east-1",
      enableXRay: true,
      enableCloudWatchAlarms: true,
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "production-chat-table",
    });

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "production-sessions-table",
    });

    template.hasResourceProperties("AWS::Cognito::UserPool", {
      UserPoolName: "production-mcp-demo-user-pool",
    });

    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "production-mcp-demo-api",
    });

    template.hasResourceProperties("AWS::ApiGateway::WebSocketApi", {
      Name: "production-mcp-demo-websocket",
    });

    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketName: expect.stringMatching(/production-mcp-demo-webapp/),
    });
  });
});
