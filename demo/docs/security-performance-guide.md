# Security and Performance Guide

This guide covers the security measures and performance optimizations implemented in the MCP Demo application.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation](#input-validation)
4. [Security Headers](#security-headers)
5. [Authentication & Authorization](#authentication--authorization)
6. [Data Protection](#data-protection)
7. [Performance Optimizations](#performance-optimizations)
8. [Caching Strategy](#caching-strategy)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Best Practices](#best-practices)
11. [Security Checklist](#security-checklist)

## Security Overview

The application implements a multi-layered security approach:

- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Input Validation**: Sanitizes and validates all user inputs
- **Security Headers**: Protects against common web vulnerabilities
- **Authentication**: AWS Cognito integration for user management
- **Authorization**: Role-based access control
- **Data Encryption**: At-rest and in-transit encryption
- **Audit Logging**: Comprehensive security event logging

## Rate Limiting

### Implementation

Rate limiting is implemented using the `RateLimitMiddleware` with configurable rules:

```typescript
import {
  createRateLimit,
  RateLimitConfigs,
} from "../middleware/rate-limit-middleware";

// Apply different rate limits to different endpoints
app.use("/auth", createRateLimit(RateLimitConfigs.auth).middleware());
app.use("/api", createRateLimit(RateLimitConfigs.api).middleware());
app.use("/chat", createRateLimit(RateLimitConfigs.chat).middleware());
```

### Rate Limit Configurations

| Endpoint Type  | Window | Max Requests | Purpose                     |
| -------------- | ------ | ------------ | --------------------------- |
| Authentication | 15 min | 5            | Prevent brute force attacks |
| API General    | 15 min | 100          | General API protection      |
| Chat Messages  | 1 min  | 30           | Prevent spam                |
| Per User       | 15 min | 1000         | User-specific limits        |
| Per IP         | 15 min | 500          | IP-based protection         |

### Rate Limit Headers

The API returns rate limit information in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 900
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later.",
  "retryAfter": 900
}
```

## Input Validation

### Validation Middleware

All inputs are validated using the `ValidationMiddleware`:

```typescript
import {
  ValidationMiddleware,
  ValidationSchemas,
} from "../middleware/validation-middleware";

const validator = new ValidationMiddleware();

// Apply validation to routes
app.post(
  "/chat/message",
  validator.validate(ValidationSchemas.chatMessage),
  chatController.sendMessage
);
```

### Validation Schemas

#### Chat Message Validation

```typescript
chatMessage: {
  body: [
    {
      field: "content",
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 1000,
      sanitize: (value: string) => value.trim(),
    },
    {
      field: "sessionId",
      type: "string",
      required: true,
      pattern: /^[a-zA-Z0-9-]+$/,
    },
  ],
}
```

#### User Authentication Validation

```typescript
authenticate: {
  body: [
    {
      field: "username",
      type: "string",
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/,
      sanitize: (value: string) => value.toLowerCase().trim(),
    },
    {
      field: "password",
      type: "string",
      required: true,
      minLength: 8,
      maxLength: 128,
    },
  ],
}
```

### Sanitization Functions

Common sanitization functions are available:

```typescript
import { Sanitizers } from "../middleware/validation-middleware";

// Remove HTML tags
sanitize: Sanitizers.stripHtml;

// Normalize email
sanitize: Sanitizers.normalizeEmail;

// Limit string length
sanitize: Sanitizers.truncate(100);
```

### Custom Validation

```typescript
{
  field: "email",
  type: "string",
  custom: Validators.isValidEmail,
}
```

## Security Headers

### Implementation

Security headers are automatically added to all responses:

```typescript
import { createSecurityHeadersForEnvironment } from "../middleware/security-headers.middleware";

const securityHeaders = createSecurityHeadersForEnvironment(
  process.env.NODE_ENV
);
app.use(securityHeaders.middleware());
```

### Security Headers Applied

| Header                    | Value                             | Purpose                            |
| ------------------------- | --------------------------------- | ---------------------------------- |
| Content-Security-Policy   | `default-src 'self'`              | Prevents XSS and injection attacks |
| Strict-Transport-Security | `max-age=31536000`                | Enforces HTTPS                     |
| X-XSS-Protection          | `1; mode=block`                   | Additional XSS protection          |
| X-Content-Type-Options    | `nosniff`                         | Prevents MIME type sniffing        |
| X-Frame-Options           | `DENY`                            | Prevents clickjacking              |
| Referrer-Policy           | `strict-origin-when-cross-origin` | Controls referrer information      |
| Permissions-Policy        | `camera=(), microphone=()`        | Restricts browser features         |

### CORS Configuration

```typescript
cors: {
  origin: ["http://localhost:3000", "https://yourdomain.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
}
```

### Environment-Specific Configurations

#### Development

- HSTS disabled
- Permissive CSP for development tools
- Local origins allowed

#### Production

- HSTS enabled with preload
- Strict CSP policy
- Specific origins only
- Upgrade insecure requests

## Authentication & Authorization

### AWS Cognito Integration

```typescript
// User authentication
const user = await cognitoService.authenticateUser(username, password);

// Token validation
const decodedToken = await cognitoService.validateToken(token);

// User registration
await cognitoService.registerUser(username, email, password);
```

### JWT Token Validation

```typescript
// Middleware for protected routes
app.use("/api", authMiddleware.validateToken);

// Role-based access
app.use("/admin", authMiddleware.requireRole("admin"));
```

### Session Management

```typescript
// Create user session
const session = await sessionService.createSession(userId, sessionData);

// Validate session
const isValid = await sessionService.validateSession(sessionId);

// Invalidate session
await sessionService.invalidateSession(sessionId);
```

## Data Protection

### Encryption

#### At-Rest Encryption

- DynamoDB tables encrypted with AWS KMS
- S3 buckets with server-side encryption
- Database backups encrypted

#### In-Transit Encryption

- TLS 1.2+ for all communications
- API Gateway with HTTPS only
- WebSocket connections over WSS

### Data Sanitization

```typescript
// Remove sensitive data from logs
logger.info("User action", {
  userId: user.id,
  action: "login",
  // password and tokens are automatically excluded
});
```

### PII Protection

```typescript
// Mask sensitive data
const maskedEmail = maskEmail(user.email);
const maskedPhone = maskPhone(user.phone);

// Anonymize data for analytics
const anonymizedData = anonymizeUserData(userData);
```

## Performance Optimizations

### Caching Strategy

#### Cache Service Implementation

```typescript
import { CacheServiceFactory } from "../services/cache-service";

const cacheService = CacheServiceFactory.createForEnvironment(
  process.env.NODE_ENV
);

// Cache user data
const user = await cacheService.getOrSet(
  `user:${userId}`,
  () => userRepository.findById(userId),
  3600 // 1 hour TTL
);

// Cache session data
const session = await cacheService.getOrSet(
  `session:${sessionId}`,
  () => sessionService.getSession(sessionId),
  1800 // 30 minutes TTL
);
```

#### Cache Invalidation

```typescript
// Invalidate user cache on update
await cacheService.delete(`user:${userId}`);

// Invalidate all session caches
await cacheService.invalidate("session:*");
```

### Database Optimization

#### Connection Pooling

```typescript
// DynamoDB connection optimization
const dynamoConfig = {
  maxRetries: 3,
  httpOptions: {
    timeout: 5000,
    connectTimeout: 3000,
  },
  region: process.env.AWS_REGION,
};
```

#### Query Optimization

```typescript
// Use indexes for efficient queries
const messages = await chatMessageRepository.findBySessionId(sessionId, {
  limit: 50,
  scanIndexForward: false,
});

// Batch operations
const results = await Promise.all([
  userRepository.findById(userId1),
  userRepository.findById(userId2),
  userRepository.findById(userId3),
]);
```

### Lambda Optimization

#### Cold Start Reduction

```typescript
// Keep connections alive
const dynamoClient = new DynamoDBClient(dynamoConfig);
const cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);

// Reuse clients across invocations
export const handler = async (event: APIGatewayProxyEvent) => {
  // Use existing clients
  const user = await getUser(dynamoClient, event);
  return formatResponse(user);
};
```

#### Memory Configuration

```typescript
// Optimize memory allocation
const memoryConfig = {
  development: 512, // MB
  staging: 1024, // MB
  production: 2048, // MB
};
```

## Caching Strategy

### Cache Layers

1. **Application Cache** (Memory/Redis)

   - User sessions
   - Frequently accessed data
   - API responses

2. **CDN Cache** (CloudFront)

   - Static assets
   - API responses
   - WebSocket connections

3. **Database Cache** (DynamoDB DAX)
   - Query results
   - Session data
   - User profiles

### Cache Patterns

#### Cache-Aside Pattern

```typescript
async function getUser(userId: string): Promise<User> {
  // Try cache first
  let user = await cacheService.get<User>(`user:${userId}`);

  if (!user) {
    // Cache miss - fetch from database
    user = await userRepository.findById(userId);

    // Store in cache
    if (user) {
      await cacheService.set(`user:${userId}`, user, 3600);
    }
  }

  return user;
}
```

#### Write-Through Pattern

```typescript
async function updateUser(
  userId: string,
  userData: Partial<User>
): Promise<User> {
  // Update database
  const updatedUser = await userRepository.update(userId, userData);

  // Update cache immediately
  await cacheService.set(`user:${userId}`, updatedUser, 3600);

  return updatedUser;
}
```

#### Cache Invalidation Patterns

```typescript
// Time-based invalidation
await cacheService.set(key, value, 3600); // Expires in 1 hour

// Event-based invalidation
eventBus.on("user.updated", async (userId: string) => {
  await cacheService.delete(`user:${userId}`);
});

// Pattern-based invalidation
await cacheService.invalidate("user:*"); // Clear all user caches
```

## Monitoring & Alerting

### Security Monitoring

#### Rate Limit Alerts

```typescript
// Alert on rate limit violations
if (rateLimitExceeded) {
  await metricsService.recordError(
    "RATE_LIMIT_EXCEEDED",
    "429",
    "rate_limiter",
    userId
  );
}
```

#### Security Event Logging

```typescript
// Log security events
logger.warn("Security event", {
  event: "failed_login",
  userId,
  ipAddress,
  userAgent,
  timestamp: new Date().toISOString(),
});
```

### Performance Monitoring

#### Cache Performance

```typescript
// Monitor cache hit rates
const stats = await cacheService.getStats();
await metricsService.recordMetric("CacheHitRate", stats.hitRate, "Percent");

// Monitor cache latency
const startTime = Date.now();
const result = await cacheService.get(key);
const duration = Date.now() - startTime;
await metricsService.recordMetric("CacheLatency", duration, "Milliseconds");
```

#### API Performance

```typescript
// Monitor API response times
const startTime = Date.now();
const response = await processRequest(request);
const duration = Date.now() - startTime;

await metricsService.recordMetric("ApiResponseTime", duration, "Milliseconds");
```

## Best Practices

### Security Best Practices

1. **Principle of Least Privilege**

   - Use IAM roles with minimal permissions
   - Implement role-based access control
   - Regular permission audits

2. **Defense in Depth**

   - Multiple security layers
   - Fail-secure defaults
   - Comprehensive logging

3. **Input Validation**

   - Validate all inputs
   - Sanitize user data
   - Use parameterized queries

4. **Secure Communication**
   - Use HTTPS everywhere
   - Implement certificate pinning
   - Regular security updates

### Performance Best Practices

1. **Caching Strategy**

   - Cache frequently accessed data
   - Use appropriate TTL values
   - Implement cache invalidation

2. **Database Optimization**

   - Use indexes effectively
   - Implement connection pooling
   - Monitor query performance

3. **Lambda Optimization**

   - Reuse connections
   - Optimize memory allocation
   - Minimize cold starts

4. **Monitoring**
   - Set up comprehensive monitoring
   - Define performance baselines
   - Regular performance reviews

## Security Checklist

### Pre-Deployment Checklist

- [ ] Rate limiting configured for all endpoints
- [ ] Input validation implemented for all inputs
- [ ] Security headers configured
- [ ] CORS policy defined
- [ ] Authentication middleware active
- [ ] Authorization rules implemented
- [ ] Data encryption enabled
- [ ] Audit logging configured
- [ ] Error handling secure
- [ ] Dependencies updated

### Runtime Security Checklist

- [ ] Monitor rate limit violations
- [ ] Review security event logs
- [ ] Check for suspicious activity
- [ ] Validate authentication tokens
- [ ] Monitor API usage patterns
- [ ] Review access logs
- [ ] Check for data breaches
- [ ] Validate security headers
- [ ] Monitor performance metrics
- [ ] Review error rates

### Performance Checklist

- [ ] Cache hit rates > 80%
- [ ] API response times < 500ms
- [ ] Database query times < 100ms
- [ ] Lambda cold starts < 1s
- [ ] Memory usage optimized
- [ ] Connection pooling active
- [ ] CDN configured
- [ ] Monitoring alerts set
- [ ] Performance baselines defined
- [ ] Regular performance reviews

## Configuration Examples

### Environment Variables

```bash
# Security Configuration
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATE_LIMIT_ENABLED=true
SECURITY_HEADERS_ENABLED=true

# Cache Configuration
CACHE_TTL=3600
CACHE_PREFIX=mcp-demo
REDIS_URL=redis://localhost:6379

# Performance Configuration
LAMBDA_MEMORY=2048
DB_CONNECTION_POOL_SIZE=10
API_TIMEOUT=30000
```

### AWS Configuration

```typescript
// CloudFormation template snippets
const securityGroup = new ec2.SecurityGroup(this, "ApiSecurityGroup", {
  vpc,
  description: "Security group for API Gateway",
  allowAllOutbound: false,
});

securityGroup.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  "Allow HTTPS traffic"
);
```

## Troubleshooting

### Common Security Issues

1. **Rate Limit Too Strict**

   - Adjust rate limit configurations
   - Monitor legitimate traffic patterns
   - Implement whitelist for trusted IPs

2. **CORS Errors**

   - Verify allowed origins configuration
   - Check preflight request handling
   - Validate credentials settings

3. **Authentication Failures**
   - Verify Cognito configuration
   - Check token expiration
   - Validate user permissions

### Common Performance Issues

1. **High Cache Miss Rate**

   - Review cache TTL settings
   - Implement cache warming
   - Optimize cache key strategy

2. **Slow API Responses**

   - Check database query performance
   - Review Lambda memory allocation
   - Implement connection pooling

3. **High Memory Usage**
   - Optimize Lambda memory settings
   - Review cache memory usage
   - Implement memory monitoring

## Conclusion

This security and performance guide provides a comprehensive overview of the implemented measures. Regular reviews and updates are essential to maintain security and performance standards.

For additional information, refer to:

- [AWS Security Best Practices](https://aws.amazon.com/security/security-learning/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Performance Best Practices](https://aws.amazon.com/architecture/well-architected/)
