#!/bin/bash

# =============================================================================
# MCP Demo Application - Enhanced Setup Script
# =============================================================================
# This script sets up the complete MCP Demo application with all security
# and performance features enabled.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI is not installed. Some features may not work."
    else
        # Check AWS credentials
        if ! aws sts get-caller-identity &> /dev/null; then
            log_warning "AWS credentials not configured. Please run 'aws configure'"
        fi
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        log_warning "AWS CDK is not installed globally. Installing..."
        npm install -g aws-cdk
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        log_info "Docker is available for local development"
    else
        log_warning "Docker is not installed. Local development may be limited."
    fi
    
    log_success "Prerequisites check completed"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$PROJECT_ROOT/env.example" ]; then
            cp "$PROJECT_ROOT/env.example" "$ENV_FILE"
            log_success "Environment file created from template"
        else
            log_error "env.example file not found"
            exit 1
        fi
    else
        log_warning "Environment file already exists. Skipping creation."
    fi
    
    # Generate secure secrets
    generate_secrets
    
    log_success "Environment setup completed"
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "fallback-secret-$(date +%s)")
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || echo "fallback-key-$(date +%s)")
    
    # Update .env file with generated secrets
    if [ -f "$ENV_FILE" ]; then
        # Use sed to update secrets (works on both macOS and Linux)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$ENV_FILE"
            sed -i '' "s/DB_ENCRYPTION_KEY=.*/DB_ENCRYPTION_KEY=$ENCRYPTION_KEY/" "$ENV_FILE"
        else
            # Linux
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$ENV_FILE"
            sed -i "s/DB_ENCRYPTION_KEY=.*/DB_ENCRYPTION_KEY=$ENCRYPTION_KEY/" "$ENV_FILE"
        fi
        
        log_success "Secure secrets generated and updated"
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    npm install
    
    # Install API dependencies
    if [ -d "applications/api" ]; then
        cd applications/api
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    # Install Web dependencies
    if [ -d "applications/web" ]; then
        cd applications/web
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    # Install Infrastructure dependencies
    if [ -d "infrastructure/aws" ]; then
        cd infrastructure/aws
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    # Install shared package dependencies
    if [ -d "packages/shared" ]; then
        cd packages/shared
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    log_success "Dependencies installed successfully"
}

# Setup development tools
setup_dev_tools() {
    log_info "Setting up development tools..."
    
    cd "$PROJECT_ROOT"
    
    # Install development dependencies
    npm install --save-dev @types/node typescript ts-node nodemon
    
    # Setup Git hooks (if git is available)
    if command -v git &> /dev/null; then
        if [ -d ".git" ]; then
            # Install husky for Git hooks
            npm install --save-dev husky lint-staged
            
            # Setup pre-commit hooks
            npx husky install
            npx husky add .husky/pre-commit "npm run lint-staged"
            
            log_success "Git hooks configured"
        fi
    fi
    
    # Setup linting and formatting
    setup_linting
    
    log_success "Development tools setup completed"
}

# Setup linting and formatting
setup_linting() {
    log_info "Setting up linting and formatting..."
    
    cd "$PROJECT_ROOT"
    
    # Install ESLint and Prettier
    npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
    npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
    
    # Create ESLint config if it doesn't exist
    if [ ! -f ".eslintrc.js" ]; then
        cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  env: {
    node: true,
    es6: true
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error'
  }
};
EOF
    fi
    
    # Create Prettier config if it doesn't exist
    if [ ! -f ".prettierrc" ]; then
        cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
EOF
    fi
    
    log_success "Linting and formatting configured"
}

# Setup testing
setup_testing() {
    log_info "Setting up testing environment..."
    
    cd "$PROJECT_ROOT"
    
    # Install testing dependencies
    npm install --save-dev jest @types/jest ts-jest
    npm install --save-dev @testing-library/react @testing-library/jest-dom
    npm install --save-dev supertest @types/supertest
    
    # Create Jest config if it doesn't exist
    if [ ! -f "jest.config.js" ]; then
        cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
EOF
    fi
    
    log_success "Testing environment configured"
}

# Setup security features
setup_security() {
    log_info "Setting up security features..."
    
    # Create security configuration directory
    mkdir -p "$PROJECT_ROOT/config/security"
    
    # Create security policy file
    cat > "$PROJECT_ROOT/config/security/policy.json" << 'EOF'
{
  "rate_limiting": {
    "enabled": true,
    "auth": {
      "window_ms": 900000,
      "max_requests": 5
    },
    "api": {
      "window_ms": 900000,
      "max_requests": 100
    },
    "chat": {
      "window_ms": 60000,
      "max_requests": 30
    }
  },
  "validation": {
    "enabled": true,
    "strict_mode": false
  },
  "headers": {
    "enabled": true,
    "csp": true,
    "hsts": true,
    "xss_protection": true
  }
}
EOF
    
    log_success "Security features configured"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring and observability..."
    
    # Create monitoring configuration directory
    mkdir -p "$PROJECT_ROOT/config/monitoring"
    
    # Create monitoring config
    cat > "$PROJECT_ROOT/config/monitoring/config.json" << 'EOF'
{
  "cloudwatch": {
    "enabled": true,
    "log_group": "/aws/lambda/mcp-demo",
    "metrics_namespace": "MCPDemo"
  },
  "alerts": {
    "enabled": true,
    "critical": {
      "error_rate_threshold": 5,
      "response_time_threshold": 5000
    },
    "warning": {
      "error_rate_threshold": 2,
      "response_time_threshold": 3000
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "correlation_id": true
  }
}
EOF
    
    log_success "Monitoring configured"
}

# Setup performance features
setup_performance() {
    log_info "Setting up performance features..."
    
    # Create performance configuration directory
    mkdir -p "$PROJECT_ROOT/config/performance"
    
    # Create cache configuration
    cat > "$PROJECT_ROOT/config/performance/cache.json" << 'EOF'
{
  "memory": {
    "enabled": true,
    "ttl": 3600,
    "max_size": 1000
  },
  "redis": {
    "enabled": false,
    "url": "redis://localhost:6379",
    "ttl": 3600
  },
  "patterns": {
    "session": {
      "ttl": 1800,
      "prefix": "session:"
    },
    "user": {
      "ttl": 3600,
      "prefix": "user:"
    },
    "messages": {
      "ttl": 900,
      "prefix": "messages:"
    }
  }
}
EOF
    
    log_success "Performance features configured"
}

# Setup local development
setup_local_dev() {
    log_info "Setting up local development environment..."
    
    # Create development scripts
    cat > "$PROJECT_ROOT/scripts/dev.sh" << 'EOF'
#!/bin/bash

# Development script for running the application locally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Starting MCP Demo in development mode..."

# Start API server
cd "$PROJECT_ROOT/applications/api"
npm run dev &
API_PID=$!

# Start Web server
cd "$PROJECT_ROOT/applications/web"
npm run dev &
WEB_PID=$!

echo "Development servers started:"
echo "  API: http://localhost:3001"
echo "  Web: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $API_PID $WEB_PID; exit" INT
wait
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/dev.sh"
    
    # Create Docker Compose for local services
    cat > "$PROJECT_ROOT/docker-compose.dev.yml" << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  dynamodb-local:
    image: amazon/dynamodb-local:latest
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath ./data"
    volumes:
      - dynamodb_data:/home/dynamodblocal/data

volumes:
  redis_data:
  dynamodb_data:
EOF
    
    log_success "Local development environment configured"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run all tests
    npm test
    
    log_success "Tests completed successfully"
}

# Build project
build_project() {
    log_info "Building project..."
    
    cd "$PROJECT_ROOT"
    
    # Build all packages
    npm run build
    
    log_success "Project built successfully"
}

# Display setup summary
display_summary() {
    log_success "Setup completed successfully!"
    echo ""
    echo "=============================================================================="
    echo "MCP Demo Application - Setup Summary"
    echo "=============================================================================="
    echo ""
    echo "✅ Prerequisites checked"
    echo "✅ Environment configured"
    echo "✅ Dependencies installed"
    echo "✅ Development tools configured"
    echo "✅ Security features enabled"
    echo "✅ Monitoring configured"
    echo "✅ Performance features enabled"
    echo "✅ Local development environment ready"
    echo ""
    echo "Next steps:"
    echo "1. Configure AWS credentials: aws configure"
    echo "2. Update .env file with your specific values"
    echo "3. Start development: ./scripts/dev.sh"
    echo "4. Run tests: npm test"
    echo "5. Deploy infrastructure: cd infrastructure/aws && npm run deploy"
    echo ""
    echo "Documentation:"
    echo "- Development Guide: docs/development-guide.md"
    echo "- Security Guide: docs/security-performance-guide.md"
    echo "- Monitoring Guide: docs/monitoring-guide.md"
    echo "- Testing Guide: docs/testing-guide.md"
    echo ""
    echo "=============================================================================="
}

# Main setup function
main() {
    echo "=============================================================================="
    echo "MCP Demo Application - Enhanced Setup"
    echo "=============================================================================="
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    setup_dev_tools
    setup_testing
    setup_security
    setup_monitoring
    setup_performance
    setup_local_dev
    
    # Optional: Run tests and build (can be skipped with --skip-build)
    if [[ "$1" != "--skip-build" ]]; then
        run_tests
        build_project
    fi
    
    display_summary
}

# Run main function with all arguments
main "$@" 