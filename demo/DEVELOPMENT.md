# 🚀 Development Guide - MCP Demo

This guide will help you set up and develop the MCP Demo project locally.

## 📋 Prerequisites

### Required Software

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 10+** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **AWS CLI** - [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### AWS Setup

1. **Configure AWS CLI**:

   ```bash
   aws configure
   ```

   Enter your AWS Access Key ID, Secret Access Key, default region, and output format.

2. **Verify AWS credentials**:

   ```bash
   aws sts get-caller-identity
   ```

3. **Install AWS CDK globally**:
   ```bash
   npm install -g aws-cdk
   ```

## 🏗️ Project Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd run-model-context-protocol-servers-with-aws-lambda/demo

# Install dependencies
npm install
```

### 2. Environment Configuration

Create environment files for local development:

**Frontend** (`applications/web/.env.local`):

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_IDENTITY_POOL_ID=your-identity-pool-id
```

**API** (`applications/api/.env.local`):

```env
NODE_ENV=development
PORT=3001
AWS_REGION=us-east-1
LOG_LEVEL=debug

# DynamoDB (local or remote)
DYNAMODB_ENDPOINT=http://localhost:8000
CHAT_TABLE_NAME=mcp-demo-chat-dev
SESSIONS_TABLE_NAME=mcp-demo-sessions-dev

# Cognito (for local development)
USER_POOL_ID=your-user-pool-id
CLIENT_ID=your-client-id

# MCP Servers
WEATHER_ALERTS_URL=http://localhost:3002
TIME_SERVICE_URL=http://localhost:3003
```

### 3. Local DynamoDB (Optional)

For local development without AWS:

```bash
# Install DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Create tables
aws dynamodb create-table \
  --table-name mcp-demo-chat-dev \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

aws dynamodb create-table \
  --table-name mcp-demo-sessions-dev \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

## 🚀 Development Workflow

### 1. Start Development Servers

**Terminal 1 - API Server**:

```bash
cd applications/api
npm run dev
```

**Terminal 2 - Frontend**:

```bash
cd applications/web
npm run dev
```

**Terminal 3 - MCP Servers (Optional)**:

```bash
# Weather Alerts Server
cd infrastructure/aws/src/functions/weather-alerts
npm run dev

# Time Service Server
cd infrastructure/aws/src/functions/time
npm run dev
```

### 2. Development URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **Weather Alerts**: http://localhost:3002
- **Time Service**: http://localhost:3003

### 3. Hot Reload

Both frontend and API support hot reload:

- **Frontend**: Vite provides instant hot reload
- **API**: Nodemon restarts server on file changes

## 🧪 Testing

### Run All Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Run Specific Tests

```bash
# Test specific package
npm run test --workspace=@demo/shared

# Test specific file
npm run test -- --testNamePattern="SendMessageUseCase"

# Test with verbose output
npm run test -- --verbose
```

### Test Structure

```
applications/
├── api/
│   ├── src/
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       └── chat/
│   │   │           └── send-message-use-case.test.ts
│   │   └── domain/
│   │       └── entities/
│   │           └── chat-message.test.ts
│   └── tests/
│       ├── setup.ts
│       └── integration/
└── web/
    └── src/
        └── components/
            └── message-bubble.test.tsx
```

## 🔧 Development Tools

### Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

### Build and Deploy

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@demo/shared

# Deploy to AWS (requires AWS setup)
npm run deploy
```

## 🐛 Debugging

### API Debugging

**VS Code Launch Configuration** (`applications/api/.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development",
        "PORT": "3001"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

**Debug with Logs**:

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# View logs in real-time
tail -f logs/app.log
```

### Frontend Debugging

**Browser DevTools**:

- Open Chrome DevTools (F12)
- Check Console for errors
- Use Network tab to debug API calls
- Use React DevTools extension

**VS Code Debugging**:

```json
{
  "name": "Debug Frontend",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/src"
}
```

## 📊 Monitoring Development

### Local Logging

The application uses structured logging:

```typescript
import { logger } from "@demo/shared";

logger.info("User action", {
  userId: "user123",
  action: "message_sent",
  sessionId: "session456",
});
```

### Performance Monitoring

```bash
# Monitor API performance
curl -X GET http://localhost:3001/health

# Check memory usage
node --inspect applications/api/src/index.ts

# Profile CPU usage
node --prof applications/api/src/index.ts
```

## 🔐 Authentication (Local Development)

### Option 1: Mock Authentication

For local development without Cognito:

```typescript
// applications/api/src/infrastructure/middleware/auth-middleware.ts
const mockAuthMiddleware = () => ({
  before: (handler) => {
    handler.event.user = {
      sub: "mock-user-id",
      username: "demo_user",
      email: "demo@example.com",
      role: "user",
    };
  },
});
```

### Option 2: Local Cognito

Set up Cognito locally using LocalStack:

```bash
# Start LocalStack
docker run -p 4566:4566 localstack/localstack

# Create Cognito resources
aws --endpoint-url=http://localhost:4566 cognito-idp create-user-pool \
  --pool-name mcp-demo-local
```

## 🚀 Deployment to AWS

### 1. Deploy Infrastructure

```bash
cd infrastructure/aws

# Deploy to development
./deploy-env.sh dev

# Deploy to staging
./deploy-env.sh staging

# Deploy to production
./deploy-env.sh production
```

### 2. Deploy Applications

```bash
# Build and deploy frontend
cd applications/web
npm run build
npm run deploy

# Deploy API
cd applications/api
npm run build
npm run deploy
```

### 3. Verify Deployment

```bash
# Check CloudFormation status
aws cloudformation describe-stacks --stack-name MCPDemoStack

# Test API endpoints
curl https://your-api-url/health

# Check frontend
open https://your-frontend-url
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```bash
   # Find process using port
   lsof -i :3001

   # Kill process
   kill -9 <PID>
   ```

2. **Node Modules Issues**

   ```bash
   # Clear node modules
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript Errors**

   ```bash
   # Check TypeScript
   npm run type-check

   # Rebuild TypeScript
   npm run build
   ```

4. **AWS Credentials**

   ```bash
   # Verify credentials
   aws sts get-caller-identity

   # Reconfigure if needed
   aws configure
   ```

### Performance Issues

1. **Slow Build Times**

   ```bash
   # Clear Turbo cache
   npx turbo clean

   # Use parallel builds
   npm run build --parallel
   ```

2. **Memory Issues**
   ```bash
   # Increase Node.js memory
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- [Vite Documentation](https://vitejs.dev/)
- [Turbo Documentation](https://turbo.build/)

## 🤝 Contributing

1. **Create Feature Branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**:

   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation

3. **Test Your Changes**:

   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Commit and Push**:

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**:
   - Provide clear description
   - Include screenshots if UI changes
   - Reference related issues

---

**Happy Coding! 🚀**
