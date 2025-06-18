#!/bin/bash

# MCP Demo Environment Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [dev|staging|prod] [deploy|destroy|diff]"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy the stack"
    echo "  destroy  - Destroy the stack"
    echo "  diff     - Show differences"
    echo ""
    echo "Examples:"
    echo "  $0 dev deploy    - Deploy to development environment"
    echo "  $0 staging diff  - Show differences for staging"
    echo "  $0 prod destroy  - Destroy production stack"
    exit 1
}

# Check if environment is valid
validate_environment() {
    local env=$1
    case $env in
        dev|staging|prod)
            return 0
            ;;
        *)
            print_error "Invalid environment: $env"
            print_error "Valid environments: dev, staging, prod"
            return 1
            ;;
    esac
}

# Check if command is valid
validate_command() {
    local cmd=$1
    case $cmd in
        deploy|destroy|diff)
            return 0
            ;;
        *)
            print_error "Invalid command: $cmd"
            print_error "Valid commands: deploy, destroy, diff"
            return 1
            ;;
    esac
}

# Deploy stack
deploy_stack() {
    local env=$1
    print_status "Deploying to $env environment..."
    
    cd infrastructure/aws
    npm run deploy -- --context environment=$env --require-approval never
    
    print_success "Deployment to $env completed"
}

# Destroy stack
destroy_stack() {
    local env=$1
    print_warning "Destroying $env environment..."
    
    cd infrastructure/aws
    npm run destroy -- --context environment=$env
    
    print_success "Destruction of $env completed"
}

# Show differences
show_diff() {
    local env=$1
    print_status "Showing differences for $env environment..."
    
    cd infrastructure/aws
    npm run diff -- --context environment=$env
}

# Main function
main() {
    # Check arguments
    if [ $# -ne 2 ]; then
        show_usage
    fi
    
    local environment=$1
    local command=$2
    
    # Validate arguments
    validate_environment "$environment" || exit 1
    validate_command "$command" || exit 1
    
    echo "=========================================="
    echo "   MCP Demo Environment Deployment"
    echo "=========================================="
    echo "Environment: $environment"
    echo "Command: $command"
    echo ""
    
    # Execute command
    case $command in
        deploy)
            deploy_stack "$environment"
            ;;
        destroy)
            destroy_stack "$environment"
            ;;
        diff)
            show_diff "$environment"
            ;;
    esac
}

# Run main function
main "$@" 