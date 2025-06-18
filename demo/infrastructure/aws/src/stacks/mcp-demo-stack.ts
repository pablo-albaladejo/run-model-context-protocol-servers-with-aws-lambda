import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as path from "path";

export interface MCPDemoStackProps extends cdk.StackProps {
  domainName?: string;
  certificateArn?: string;
}

export class MCPDemoStack extends cdk.Stack {
  public readonly webSocketApi: apigateway.WebSocketApi;
  public readonly webSocketStage: apigateway.WebSocketStage;
  public readonly chatTable: dynamodb.Table;
  public readonly sessionsTable: dynamodb.Table;
  public readonly createSessionFunction: lambda.Function;
  public readonly getSessionFunction: lambda.Function;
  public readonly processMessageFunction: lambda.Function;
  public readonly getChatHistoryFunction: lambda.Function;
  public readonly processMessageWithMCPServersFunction: lambda.Function;
  public readonly healthCheckFunction: lambda.Function;
  public readonly webSocketHandler: lambda.Function;
  public readonly weatherAlertsFunction: lambda.Function;
  public readonly timeFunction: lambda.Function;
  public readonly distribution: cloudfront.Distribution;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: MCPDemoStackProps) {
    super(scope, id, props);

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${id}-user-pool`,
      selfSignUpEnabled: false,
      signInAliases: {
        username: true,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `${id}-client`,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        callbackUrls: ["http://localhost:3000", "https://localhost:3000"],
        logoutUrls: ["http://localhost:3000", "https://localhost:3000"],
      },
    });

    // Cognito Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `${id}-identity-pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // IAM Role for authenticated users
    const authenticatedRole = new iam.Role(this, "CognitoAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.identityPool.ref,
        roles: {
          authenticated: authenticatedRole.roleArn,
        },
      }
    );

    // DynamoDB Tables
    this.chatTable = new dynamodb.Table(this, "ChatTable", {
      tableName: `${id}-chat-messages`,
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    this.sessionsTable = new dynamodb.Table(this, "SessionsTable", {
      tableName: `${id}-user-sessions`,
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, "SharedLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../../packages/shared")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: "Shared utilities and types for MCP demo",
      layerVersionName: `${id}-shared-layer`,
    });

    // Weather Alerts MCP Server Lambda
    this.weatherAlertsFunction = new lambda.Function(
      this,
      "WeatherAlertsFunction",
      {
        functionName: `${id}-weather-alerts`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../functions/weather-alerts")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          POWERTOOLS_SERVICE_NAME: "weather-alerts-mcp-server",
          LOG_LEVEL: "INFO",
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // Time MCP Server Lambda
    this.timeFunction = new lambda.Function(this, "TimeFunction", {
      functionName: `${id}-time`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../functions/time")),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: "time-mcp-server",
        LOG_LEVEL: "INFO",
      },
      layers: [sharedLayer],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Individual Lambda Functions for each handler
    this.createSessionFunction = new lambda.Function(
      this,
      "CreateSessionFunction",
      {
        functionName: `${id}-create-session`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.createSessionHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../applications/api")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          POWERTOOLS_SERVICE_NAME: "mcp-demo-create-session",
          LOG_LEVEL: "INFO",
          CHAT_TABLE_NAME: this.chatTable.tableName,
          SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
          WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
          TIME_FUNCTION_NAME: this.timeFunction.functionName,
          USER_POOL_ID: this.userPool.userPoolId,
          CLIENT_ID: this.userPoolClient.userPoolClientId,
          IDENTITY_POOL_ID: this.identityPool.ref,
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    this.getSessionFunction = new lambda.Function(this, "GetSessionFunction", {
      functionName: `${id}-get-session`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.getSessionHandler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../applications/api")
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: "mcp-demo-get-session",
        LOG_LEVEL: "INFO",
        CHAT_TABLE_NAME: this.chatTable.tableName,
        SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
        WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
        TIME_FUNCTION_NAME: this.timeFunction.functionName,
        USER_POOL_ID: this.userPool.userPoolId,
        CLIENT_ID: this.userPoolClient.userPoolClientId,
        IDENTITY_POOL_ID: this.identityPool.ref,
      },
      layers: [sharedLayer],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    this.processMessageFunction = new lambda.Function(
      this,
      "ProcessMessageFunction",
      {
        functionName: `${id}-process-message`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.processMessageHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../applications/api")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 1024,
        environment: {
          POWERTOOLS_SERVICE_NAME: "mcp-demo-process-message",
          LOG_LEVEL: "INFO",
          CHAT_TABLE_NAME: this.chatTable.tableName,
          SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
          WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
          TIME_FUNCTION_NAME: this.timeFunction.functionName,
          USER_POOL_ID: this.userPool.userPoolId,
          CLIENT_ID: this.userPoolClient.userPoolClientId,
          IDENTITY_POOL_ID: this.identityPool.ref,
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    this.getChatHistoryFunction = new lambda.Function(
      this,
      "GetChatHistoryFunction",
      {
        functionName: `${id}-get-chat-history`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.getChatHistoryHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../applications/api")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        environment: {
          POWERTOOLS_SERVICE_NAME: "mcp-demo-get-chat-history",
          LOG_LEVEL: "INFO",
          CHAT_TABLE_NAME: this.chatTable.tableName,
          SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
          WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
          TIME_FUNCTION_NAME: this.timeFunction.functionName,
          USER_POOL_ID: this.userPool.userPoolId,
          CLIENT_ID: this.userPoolClient.userPoolClientId,
          IDENTITY_POOL_ID: this.identityPool.ref,
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    this.processMessageWithMCPServersFunction = new lambda.Function(
      this,
      "ProcessMessageWithMCPServersFunction",
      {
        functionName: `${id}-process-message-with-mcp-servers`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.processMessageWithMCPServersHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../applications/api")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 1024,
        environment: {
          POWERTOOLS_SERVICE_NAME: "mcp-demo-process-message-with-mcp-servers",
          LOG_LEVEL: "INFO",
          CHAT_TABLE_NAME: this.chatTable.tableName,
          SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
          WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
          TIME_FUNCTION_NAME: this.timeFunction.functionName,
          USER_POOL_ID: this.userPool.userPoolId,
          CLIENT_ID: this.userPoolClient.userPoolClientId,
          IDENTITY_POOL_ID: this.identityPool.ref,
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    this.healthCheckFunction = new lambda.Function(
      this,
      "HealthCheckFunction",
      {
        functionName: `${id}-health-check`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.healthHandler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../applications/api")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          POWERTOOLS_SERVICE_NAME: "mcp-demo-health-check",
          LOG_LEVEL: "INFO",
        },
        layers: [sharedLayer],
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // Grant permissions to all functions
    this.chatTable.grantReadWriteData(this.createSessionFunction);
    this.sessionsTable.grantReadWriteData(this.createSessionFunction);
    this.weatherAlertsFunction.grantInvoke(this.createSessionFunction);
    this.timeFunction.grantInvoke(this.createSessionFunction);

    this.chatTable.grantReadWriteData(this.getSessionFunction);
    this.sessionsTable.grantReadWriteData(this.getSessionFunction);
    this.weatherAlertsFunction.grantInvoke(this.getSessionFunction);
    this.timeFunction.grantInvoke(this.getSessionFunction);

    this.chatTable.grantReadWriteData(this.processMessageFunction);
    this.sessionsTable.grantReadWriteData(this.processMessageFunction);
    this.weatherAlertsFunction.grantInvoke(this.processMessageFunction);
    this.timeFunction.grantInvoke(this.processMessageFunction);

    this.chatTable.grantReadWriteData(this.getChatHistoryFunction);
    this.sessionsTable.grantReadWriteData(this.getChatHistoryFunction);
    this.weatherAlertsFunction.grantInvoke(this.getChatHistoryFunction);
    this.timeFunction.grantInvoke(this.getChatHistoryFunction);

    this.chatTable.grantReadWriteData(
      this.processMessageWithMCPServersFunction
    );
    this.sessionsTable.grantReadWriteData(
      this.processMessageWithMCPServersFunction
    );
    this.weatherAlertsFunction.grantInvoke(
      this.processMessageWithMCPServersFunction
    );
    this.timeFunction.grantInvoke(this.processMessageWithMCPServersFunction);

    // WebSocket Handler Lambda
    this.webSocketHandler = new lambda.Function(this, "WebSocketHandler", {
      functionName: `${id}-websocket-handler`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../functions/websocket")
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        POWERTOOLS_SERVICE_NAME: "mcp-demo-websocket",
        LOG_LEVEL: "INFO",
        CHAT_TABLE_NAME: this.chatTable.tableName,
        SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
        WEATHER_ALERTS_FUNCTION_NAME: this.weatherAlertsFunction.functionName,
        TIME_FUNCTION_NAME: this.timeFunction.functionName,
        USER_POOL_ID: this.userPool.userPoolId,
        USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
        IDENTITY_POOL_ID: this.identityPool.ref,
      },
      layers: [sharedLayer],
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions to WebSocket handler
    this.chatTable.grantReadWriteData(this.webSocketHandler);
    this.sessionsTable.grantReadWriteData(this.webSocketHandler);
    this.weatherAlertsFunction.grantInvoke(this.webSocketHandler);
    this.timeFunction.grantInvoke(this.webSocketHandler);

    // WebSocket API
    this.webSocketApi = new apigateway.WebSocketApi(this, "WebSocketApi", {
      apiName: `${id}-websocket-api`,
      connectRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration(
          "ConnectHandler",
          this.webSocketHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration(
          "DisconnectHandler",
          this.webSocketHandler
        ),
      },
      defaultRouteOptions: {
        integration: new apigateway.WebSocketLambdaIntegration(
          "DefaultHandler",
          this.webSocketHandler
        ),
      },
    });

    this.webSocketStage = new apigateway.WebSocketStage(
      this,
      "WebSocketStage",
      {
        webSocketApi: this.webSocketApi,
        stageName: "prod",
        autoDeploy: true,
      }
    );

    // Cognito Authorizer for REST API
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [this.userPool],
      }
    );

    // REST API Gateway
    const restApi = new apigateway.RestApi(this, "RestApi", {
      restApiName: `${id}-rest-api`,
      description: "MCP Demo REST API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    // API Gateway Lambda integrations for each function
    const createSessionIntegration = new apigateway.LambdaIntegration(
      this.createSessionFunction
    );
    const getSessionIntegration = new apigateway.LambdaIntegration(
      this.getSessionFunction
    );
    const processMessageIntegration = new apigateway.LambdaIntegration(
      this.processMessageFunction
    );
    const getChatHistoryIntegration = new apigateway.LambdaIntegration(
      this.getChatHistoryFunction
    );
    const processMessageWithMCPServersIntegration =
      new apigateway.LambdaIntegration(
        this.processMessageWithMCPServersFunction
      );
    const healthCheckIntegration = new apigateway.LambdaIntegration(
      this.healthCheckFunction
    );

    // Chat endpoints (protected)
    const chatResource = restApi.root.addResource("chat");

    // POST /chat/sessions - Create session
    const chatSessionsResource = chatResource.addResource("sessions");
    chatSessionsResource.addMethod("POST", createSessionIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /chat/sessions/{sessionId} - Get session
    const chatSessionResource = chatSessionsResource.addResource("{sessionId}");
    chatSessionResource.addMethod("GET", getSessionIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // GET /chat/sessions/{sessionId}/messages - Get chat history
    const chatSessionMessagesResource =
      chatSessionResource.addResource("messages");
    chatSessionMessagesResource.addMethod("GET", getChatHistoryIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /chat/messages - Process message
    const chatMessagesResource = chatResource.addResource("messages");
    chatMessagesResource.addMethod("POST", processMessageIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // POST /chat/mcp - Process message with MCP servers
    const chatMcpResource = chatResource.addResource("mcp");
    chatMcpResource.addMethod("POST", processMessageWithMCPServersIntegration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Health check endpoint (public)
    const healthResource = restApi.root.addResource("health");
    healthResource.addMethod("GET", healthCheckIntegration);

    // S3 Bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: `${id.toLowerCase()}-website-${this.account}`,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Lambda to create demo user
    const createDemoUserFunction = new lambda.Function(
      this,
      "CreateDemoUserFunction",
      {
        functionName: `${id}-create-demo-user`,
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../functions/create-demo-user")
        ),
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          USER_POOL_ID: this.userPool.userPoolId,
          DEMO_USER_EMAIL: "pablo.albaladejo.mestre+mcp@gmail.com",
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // Grant permissions to create users
    this.userPool.grant(
      createDemoUserFunction,
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminSetUserPassword"
    );

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: restApi.url,
      description: "REST API URL",
      exportName: `${id}-api-url`,
    });

    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: this.webSocketStage.url,
      description: "WebSocket API URL",
      exportName: `${id}-websocket-url`,
    });

    new cdk.CfnOutput(this, "WebAppBucket", {
      value: websiteBucket.bucketName,
      description: "S3 Bucket for Web App",
      exportName: `${id}-webapp-bucket`,
    });

    new cdk.CfnOutput(this, "WebAppDistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront Distribution ID for Web App",
      exportName: `${id}-webapp-distribution-id`,
    });

    new cdk.CfnOutput(this, "WebsiteUrl", {
      value: this.distribution.distributionDomainName,
      description: "Website URL",
      exportName: `${id}-website-url`,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${id}-user-pool-id`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${id}-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      description: "Cognito Identity Pool ID",
      exportName: `${id}-identity-pool-id`,
    });
  }
}
