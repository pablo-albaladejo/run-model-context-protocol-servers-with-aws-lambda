# MCP Demo - Model Context Protocol with AWS Lambda

A full-stack demonstration of the Model Context Protocol (MCP) using AWS Lambda, featuring a React web application with real-time chat capabilities and an admin dashboard.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   API Gateway   │    │   Lambda        │
│   (Frontend)    │◄──►│   (REST/WS)     │◄──►│   Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cognito       │    │   DynamoDB      │    │   MCP Servers   │
│   (Auth)        │    │   (Storage)     │    │   (Weather/Time)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React app with Vite, Tailwind CSS, and AWS Amplify UI
- **Backend**: Express.js API with WebSocket support
- **Authentication**: AWS Cognito with auto-created admin user
- **Database**: DynamoDB for chat messages and user sessions
- **MCP Servers**: Lambda functions for weather alerts and time services
- **Admin Dashboard**: Real-time monitoring and analytics

## 🚀 Features

### Chat Interface

- Real-time messaging with WebSocket support
- Integration with MCP servers (weather alerts, time)
- Message history persistence
- User session management

### Admin Dashboard

- **System Overview**: Real-time metrics and health status
- **User Analytics**: Active sessions, message counts, response times
- **Database Monitoring**: Connection status and performance
- **Request Analytics**: Weather and time service usage
- **Session Management**: View active user sessions

### Authentication

- AWS Cognito integration
- Two separate user roles:
  - **`demo_user`**: Chat functionality only (no admin access)
  - **`demo_admin`**: Admin dashboard only (no chat access)
- Both users share the same email: `pablo.albaladejo.mestre+mcp@gmail.com`
- Auto-created during deployment with passwords emailed
- Protected routes with role-based access control

## 📁 Project Structure

```
demo/
├── apps/
│   ├── api/                 # Express.js API backend
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── chat.controller.ts
│   │   │   │   ├── websocket.controller.ts
│   │   │   │   └── admin.controller.ts      # Admin endpoints
│   │   │   ├── middleware/
│   │   │   │   └── auth.middleware.ts       # Cognito auth
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/                 # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── ChatApp.tsx
│       │   │   ├── AdminDashboard.tsx       # Admin interface
│       │   │   ├── Header.tsx
│       │   │   └── Login.tsx
│       │   ├── hooks/
│       │   │   └── useWebSocket.ts
│       │   ├── utils/
│       │   │   └── cn.ts
│       │   └── App.tsx
│       └── package.json
├── infrastructure/
│   └── aws/                 # CDK infrastructure
│       ├── src/
│       │   ├── stacks/
│       │   │   └── mcp-demo-stack.ts
│       │   └── functions/
│       │       ├── weather-alerts/
│       │       ├── time/
│       │       ├── websocket/
│       │       └── create-demo-user/
│       └── package.json
├── packages/
│   ├── shared/              # Shared utilities
│   └── types/               # TypeScript types
└── .github/
    └── workflows/
        └── deploy.yml       # CI/CD pipeline
```

## 🛠️ Setup & Deployment

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK installed globally

### 1. Install Dependencies

```bash
cd demo
npm install
```

### 2. Configure AWS

```bash
aws configure
```

### 3. Bootstrap CDK (first time only)

```bash
cd infrastructure/aws
npm install
npx cdk bootstrap
```

### 4. Deploy Infrastructure

```bash
# Deploy all stacks
npm run deploy

# Or deploy specific environment
./deploy-env.sh dev
```

### 5. Deploy Applications

```bash
# Build and deploy API
cd apps/api
npm run build

# Build and deploy frontend
cd apps/web
npm run build
```

## 🔧 Development

### Local Development

```bash
# Start API server
cd apps/api
npm run dev

# Start frontend
cd apps/web
npm run dev
```

### Environment Variables

Create `.env` files in each app directory:

**Frontend** (`apps/web/.env`):

```env
VITE_API_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_USER_POOL_ID=your-user-pool-id
VITE_CLIENT_ID=your-client-id
VITE_IDENTITY_POOL_ID=your-identity-pool-id
```

**API** (`apps/api/.env`):

```env
PORT=3001
CHAT_TABLE_NAME=your-chat-table
SESSIONS_TABLE_NAME=your-sessions-table
USER_POOL_ID=your-user-pool-id
CLIENT_ID=your-client-id
```

## 📊 Admin Dashboard

The admin dashboard provides comprehensive monitoring of the MCP system:

### Overview Tab

- **System Status**: Real-time health indicators
- **Key Metrics**: Total users, active sessions, messages, response times
- **Today's Activity**: Message counts and service usage
- **System Health**: Database, API, and WebSocket status

### Sessions Tab

- **Active Sessions**: List of current user sessions
- **Session Details**: Creation time, last activity, message count
- **Real-time Updates**: Auto-refresh every 30 seconds

### Analytics Tab

- **Coming Soon**: Advanced analytics and reporting
- **Usage Patterns**: User behavior analysis
- **Performance Metrics**: Detailed performance monitoring

### Access Control

- **Authentication Required**: All routes protected by Cognito
- **Role-Based Access**:
  - `demo_user`: Can only access chat functionality
  - `demo_admin`: Can only access admin dashboard
- **Route Protection**: Automatic redirection based on user role
- **Secure Endpoints**: JWT token verification for all requests

## 🔐 Security

- **Cognito Authentication**: JWT-based user authentication
- **API Gateway Authorization**: Cognito authorizer for REST endpoints
- **Admin Route Protection**: Middleware-based access control
- **Environment Variables**: Secure configuration management
- **HTTPS Only**: All production traffic encrypted

## 🚀 CI/CD Pipeline

The GitHub Actions pipeline automatically:

1. **Lint & Test**: Code quality checks
2. **Build**: Compile TypeScript and build applications
3. **Deploy Infrastructure**: CDK deployment to AWS
4. **Deploy Frontend**: S3 and CloudFront deployment
5. **Create Users**: Auto-create both `demo_user` and `demo_admin`
6. **Update Environment**: Inject API URLs into frontend

## 📈 Monitoring & Analytics

### Real-time Metrics

- User session tracking
- Message volume monitoring
- Response time analysis
- Service usage statistics

### Database Monitoring

- DynamoDB connection status
- Table performance metrics
- Query optimization insights

### System Health

- Lambda function status
- API Gateway performance
- WebSocket connection monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For issues and questions:

- Check the [documentation](../README.md)
- Review [examples](../examples/)
- Open an issue on GitHub

---

**Built with ❤️ using AWS CDK, React, and the Model Context Protocol**
