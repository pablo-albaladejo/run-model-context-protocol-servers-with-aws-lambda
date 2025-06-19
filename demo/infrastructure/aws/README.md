# AWS Infrastructure - MCP Demo

This directory contains the AWS CDK infrastructure code for the MCP Demo application.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   API Gateway   │    │   Lambda        │
│   (Frontend)    │◄──►│   (REST/WS)     │◄──►│   Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3 Bucket     │    │   DynamoDB      │    │   MCP Servers   │
│   (Static Files)│    │   (Storage)     │    │   (Weather/Time)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cognito       │    │   CloudWatch    │    │   X-Ray         │
│   (Auth)        │    │   (Logs/Metrics)│    │   (Tracing)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
infrastructure/aws/
├── src/
│   ├── index.ts                 # CDK app entry point
│   ├── config/
│   │   └── environment.ts       # Environment configuration
│   ├── stacks/
│   │   └── mcp-demo-stack.ts    # Main infrastructure stack
│   └── functions/               # Lambda function definitions
│       ├── weather-alerts/      # Weather alerts MCP server
│       ├── time/                # Time service MCP server
│       ├── websocket/           # WebSocket handler
│       └── create-demo-user/    # User creation function
├── cdk.json                     # CDK configuration
├── package.json                 # Dependencies
├── deploy.sh                    # Deployment script
├── deploy-env.sh               # Environment-specific deployment
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK installed globally: `npm install -g aws-cdk`

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
npx cdk bootstrap
```

### 3. Deploy Infrastructure

```bash
# Deploy to default environment
npm run deploy

# Or deploy to specific environment
./deploy-env.sh dev
./deploy-env.sh staging
./deploy-env.sh production
```

## 🔧 Configuration

### Environment Variables

The infrastructure supports multiple environments with different configurations:

```typescript
// config/environment.ts
export interface EnvironmentConfig {
  stage: string;
  region: string;
  domain?: string;
  certificateArn?: string;
  enableXRay: boolean;
  enableCloudWatchAlarms: boolean;
}
```

### Environment-Specific Settings

| Environment | Stage     | Features                         |
| ----------- | --------- | -------------------------------- |
| Development | `dev`     | Basic setup, no custom domain    |
| Staging     | `staging` | Full features, staging domain    |
| Production  | `prod`    | Full features, production domain |

## 🏗️ Infrastructure Components

### 1. API Gateway

- **REST API**: Handles HTTP requests for chat functionality
- **WebSocket API**: Real-time messaging support
- **Cognito Authorizer**: JWT-based authentication
- **CORS**: Configured for frontend integration

### 2. Lambda Functions

- **API Handler**: Main API logic with PowerTools integration
- **WebSocket Handler**: Real-time message processing
- **MCP Servers**: Weather alerts and time services
- **User Creation**: Automated demo user setup

### 3. DynamoDB Tables

- **Chat Messages**: Stores conversation history
- **User Sessions**: Tracks active user sessions
- **System Metrics**: Performance and usage data

### 4. Cognito User Pool

- **Authentication**: JWT-based user authentication
- **User Groups**: Role-based access control
- **Auto-created Users**: Demo user and admin accounts

### 5. CloudFront & S3

- **Static Hosting**: Frontend application hosting
- **CDN**: Global content delivery
- **HTTPS**: SSL/TLS encryption

### 6. CloudWatch

- **Logs**: Centralized logging for all services
- **Metrics**: Performance and business metrics
- **Alarms**: Automated alerting for issues

## 📊 Monitoring & Observability

### CloudWatch Dashboards

- **Application Metrics**: Request count, error rate, latency
- **Business Metrics**: Messages sent, active users, sessions
- **Infrastructure Metrics**: Lambda invocations, DynamoDB usage

### CloudWatch Alarms

- **High Error Rate**: >5% error rate triggers alert
- **High Latency**: >5 seconds average response time
- **Database Errors**: Any DynamoDB error
- **Authentication Failures**: >5 auth failures

### X-Ray Tracing

- **Request Tracing**: End-to-end request tracking
- **Service Dependencies**: Visual service map
- **Performance Analysis**: Bottleneck identification

## 🔐 Security

### IAM Policies

- **Least Privilege**: Minimal required permissions
- **Service Roles**: Specific roles for each service
- **Cross-Account**: Support for multi-account setups

### Network Security

- **VPC**: Optional VPC deployment
- **Security Groups**: Network access control
- **WAF**: Web Application Firewall (optional)

### Data Protection

- **Encryption at Rest**: All data encrypted
- **Encryption in Transit**: HTTPS/TLS everywhere
- **Secrets Management**: AWS Secrets Manager integration

## 🚀 Deployment Process

### 1. Pre-deployment Checks

```bash
# Validate CDK app
npx cdk synth

# Check for security issues
npx cdk diff
```

### 2. Deploy Infrastructure

```bash
# Deploy with approval
npx cdk deploy --require-approval never

# Deploy specific stack
npx cdk deploy MCPDemoStack
```

### 3. Post-deployment Verification

```bash
# Check CloudFormation status
aws cloudformation describe-stacks --stack-name MCPDemoStack

# Verify Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `MCPDemoStack`)]'
```

## 🧹 Cleanup

### Remove Infrastructure

```bash
# Destroy all resources
npx cdk destroy

# Destroy specific stack
npx cdk destroy MCPDemoStack
```

### Clean Local Files

```bash
# Remove CDK artifacts
rm -rf cdk.out/
rm -rf node_modules/
```

## 🔧 Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**

   ```bash
   npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **Permission Errors**

   - Verify AWS credentials: `aws sts get-caller-identity`
   - Check IAM permissions for CDK

3. **Deployment Failures**
   - Check CloudFormation events
   - Review CloudWatch logs
   - Verify resource limits

### Debug Commands

```bash
# View CDK diff
npx cdk diff

# Check CloudFormation template
npx cdk synth

# View stack outputs
npx cdk list-exports

# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/MCPDemoStack"
```

## 📚 Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK Workshop](https://cdkworkshop.com/)
- [AWS Lambda PowerTools](https://awslabs.github.io/aws-lambda-powertools-typescript/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new infrastructure components
3. Update documentation for any changes
4. Use conventional commits for changes

---

**Built with AWS CDK and TypeScript**
