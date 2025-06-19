# MCP Demo Application

A comprehensive demonstration of Model Context Protocol (MCP) servers running on AWS Lambda, featuring a modern web application with real-time chat capabilities, MCP server integration, and enterprise-grade security and performance features.

## 🚀 Features

### Core Functionality

- **Real-time Chat**: WebSocket-based chat application with message history
- **MCP Server Integration**: Connect to external MCP servers for enhanced functionality
- **User Management**: AWS Cognito integration for authentication and authorization
- **Session Management**: Persistent chat sessions with DynamoDB storage

### Security Features

- **Rate Limiting**: Multi-tier rate limiting (auth, API, chat, user, IP-based)
- **Input Validation**: Comprehensive validation with sanitization and custom rules
- **Security Headers**: Complete security header implementation (CSP, HSTS, XSS protection)
- **Authentication**: JWT token validation with AWS Cognito
- **Data Protection**: Encryption at rest and in transit
- **Audit Logging**: Comprehensive security event logging

### Performance Features

- **Caching Strategy**: Multi-layer caching (application, CDN, database)
- **Connection Pooling**: Optimized database connections
- **Lambda Optimization**: Cold start reduction and memory optimization
- **Monitoring**: Real-time performance metrics and alerting

### Observability

- **CloudWatch Dashboards**: Comprehensive monitoring dashboards
- **Alerting System**: Multi-level alerts (critical, warning, informational)
- **Structured Logging**: JSON logging with correlation IDs
- **Custom Metrics**: Application-specific performance metrics
- **Tracing**: Distributed tracing with AWS X-Ray

## 🏗️ Architecture

The application follows a hexagonal architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Application                          │
├─────────────────────────────────────────────────────────────┤
│  React + TypeScript + Vite + Tailwind CSS                  │
│  Real-time WebSocket communication                         │
│  Responsive design with modern UI/UX                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway                              │
│  HTTPS endpoints with rate limiting                        │
│  WebSocket API for real-time communication                 │
│  Security headers and CORS configuration                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Lambda Functions                            │
│  ├─ Authentication & Authorization                        │
│  ├─ Chat Message Processing                               │
│  ├─ MCP Server Integration                                │
│  ├─ Session Management                                    │
│  └─ Admin Operations                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                AWS Services                                │
│  ├─ DynamoDB (Data Storage)                               │
│  ├─ Cognito (User Management)                             │
│  ├─ CloudWatch (Monitoring)                               │
│  ├─ SNS (Notifications)                                   │
│  └─ CloudFront (CDN)                                      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
demo/
├── applications/
│   ├── api/                    # Backend API application
│   │   ├── src/
│   │   │   ├── adapters/       # Lambda handlers
│   │   │   ├── application/    # Use cases and business logic
│   │   │   ├── controllers/    # HTTP controllers
│   │   │   ├── domain/         # Domain entities and repositories
│   │   │   ├── infrastructure/ # AWS services and middleware
│   │   │   │   ├── middleware/ # Security, validation, logging
│   │   │   │   ├── services/   # Cache, metrics, external services
│   │   │   │   └── repositories/ # Data access layer
│   │   │   └── shared/         # Shared schemas and utilities
│   │   └── tests/              # Unit and integration tests
│   └── web/                    # Frontend React application
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom React hooks
│       │   └── utils/          # Utility functions
│       └── tests/              # Frontend tests
├── infrastructure/
│   └── aws/                    # CDK infrastructure code
│       ├── src/
│       │   ├── alerts/         # CloudWatch alerts
│       │   ├── dashboards/     # Monitoring dashboards
│       │   ├── functions/      # Lambda function definitions
│       │   └── stacks/         # CDK stacks
│       └── tests/              # Infrastructure tests
├── docs/                       # Documentation
│   ├── architecture-diagrams.md
│   ├── development-guide.md
│   ├── monitoring-guide.md
│   ├── security-performance-guide.md
│   └── testing-guide.md
└── packages/
    └── shared/                 # Shared utilities and types
```

## 🛠️ Technology Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Vitest** for testing
- **WebSocket** for real-time communication

### Backend

- **Node.js** with TypeScript
- **AWS Lambda** for serverless functions
- **Express.js** for API framework
- **AWS SDK v3** for AWS services
- **Jest** for testing

### Infrastructure

- **AWS CDK** for infrastructure as code
- **TypeScript** for CDK definitions
- **CloudWatch** for monitoring and alerting
- **DynamoDB** for data storage
- **Cognito** for user management

### Security & Performance

- **Rate Limiting** with configurable rules
- **Input Validation** with sanitization
- **Security Headers** (CSP, HSTS, XSS protection)
- **Caching** with multiple backends
- **Structured Logging** with correlation IDs
- **Custom Metrics** for monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- AWS CDK installed globally
- Docker (for local development)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd demo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your AWS configuration
   ```

4. **Deploy infrastructure**

   ```bash
   cd infrastructure/aws
   npm run deploy
   ```

5. **Start development servers**

   ```bash
   # Start backend
   npm run dev:api

   # Start frontend (in another terminal)
   npm run dev:web
   ```

### Development

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npm run type-check

# Build for production
npm run build
```

## 📚 Documentation

### Architecture & Design

- [Architecture Diagrams](docs/architecture-diagrams.md) - System architecture and data flow
- [Development Guide](docs/development-guide.md) - Setup, development workflow, and debugging

### Security & Performance

- [Security & Performance Guide](docs/security-performance-guide.md) - Security measures and performance optimizations
- [Monitoring Guide](docs/monitoring-guide.md) - Observability, dashboards, and alerting

### Testing & Quality

- [Testing Guide](docs/testing-guide.md) - Testing strategy, coverage, and best practices

### Infrastructure

- [AWS Infrastructure README](infrastructure/aws/README.md) - Infrastructure setup and deployment

## 🔒 Security Features

### Rate Limiting

- **Authentication endpoints**: 5 attempts per 15 minutes
- **API endpoints**: 100 requests per 15 minutes
- **Chat messages**: 30 messages per minute
- **Per-user limits**: 1000 requests per 15 minutes
- **IP-based limits**: 500 requests per 15 minutes

### Input Validation

- **Comprehensive validation** for all inputs
- **Sanitization** to prevent injection attacks
- **Custom validation rules** for business logic
- **Type checking** and format validation

### Security Headers

- **Content Security Policy** (CSP) to prevent XSS
- **HTTP Strict Transport Security** (HSTS) for HTTPS enforcement
- **X-XSS-Protection** for additional XSS protection
- **X-Frame-Options** to prevent clickjacking
- **Referrer Policy** for privacy protection

### Authentication & Authorization

- **AWS Cognito** integration for user management
- **JWT token validation** with proper expiration
- **Role-based access control** (RBAC)
- **Session management** with secure invalidation

## ⚡ Performance Features

### Caching Strategy

- **Multi-layer caching**: Application, CDN, and database
- **Cache patterns**: Cache-aside, write-through, and invalidation
- **TTL management** with environment-specific configurations
- **Cache statistics** and monitoring

### Database Optimization

- **Connection pooling** for DynamoDB
- **Query optimization** with proper indexes
- **Batch operations** for improved throughput
- **Read replicas** for read-heavy workloads

### Lambda Optimization

- **Cold start reduction** with connection reuse
- **Memory optimization** based on workload
- **Concurrent execution** limits
- **Performance monitoring** and alerting

## 📊 Monitoring & Observability

### CloudWatch Dashboards

- **API Gateway metrics**: Request count, latency, errors
- **Lambda metrics**: Duration, memory usage, errors
- **DynamoDB metrics**: Read/write capacity, throttling
- **WebSocket metrics**: Connection count, message rate
- **Custom application metrics**: User activity, cache performance

### Alerting System

- **Critical alerts**: Service failures, high error rates
- **Warning alerts**: Performance degradation, capacity issues
- **Informational alerts**: Usage patterns, security events
- **SNS integration** for notifications

### Structured Logging

- **JSON logging** with correlation IDs
- **Log levels** and filtering
- **Performance metrics** in logs
- **Security event logging**

## 🧪 Testing

### Test Coverage

- **Unit tests**: 90%+ coverage for business logic
- **Integration tests**: API endpoints and database operations
- **Frontend tests**: Component testing with React Testing Library
- **Infrastructure tests**: CDK stack validation

### Test Types

- **Unit tests**: Individual functions and classes
- **Integration tests**: API endpoints and external services
- **E2E tests**: Complete user workflows
- **Performance tests**: Load testing and benchmarking

## 🚀 Deployment

### Environments

- **Development**: Local development with hot reloading
- **Staging**: Pre-production testing environment
- **Production**: Live application with full monitoring

### CI/CD Pipeline

- **Automated testing** on every commit
- **Security scanning** for vulnerabilities
- **Infrastructure validation** before deployment
- **Blue-green deployments** for zero downtime

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the established code style and patterns
- Write tests for new features
- Update documentation as needed
- Ensure security and performance considerations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Lambda team for serverless computing
- Model Context Protocol community
- Open source contributors and maintainers

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the documentation in the `docs/` folder
- Review the troubleshooting guides

---

**Note**: This is a demonstration application. For production use, ensure all security measures are properly configured and tested.
