#!/bin/bash

# MCP Demo Infrastructure Deployment Script
set -e

echo "🚀 Starting MCP Demo Infrastructure Deployment..."

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if CDK is installed
    if ! command -v cdk &> /dev/null; then
        print_warning "AWS CDK is not installed globally. Installing..."
        npm install -g aws-cdk
    fi
    
    print_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    cd ../../../
    npm install
    
    # Install infrastructure dependencies
    cd infrastructure/aws
    npm install
    
    print_success "Dependencies installed"
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    # Build shared packages
    cd ../../packages/types
    npm run build
    
    cd ../shared
    npm run build
    
    # Build infrastructure
    cd ../../infrastructure/aws
    npm run build
    
    print_success "Project built successfully"
}

# Bootstrap CDK (if needed)
bootstrap_cdk() {
    print_status "Checking CDK bootstrap status..."
    
    # Get current account and region
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region)
    
    # Check if bootstrap is needed
    if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
        print_warning "CDK bootstrap required. Running bootstrap..."
        npm run bootstrap
        print_success "CDK bootstrap completed"
    else
        print_success "CDK already bootstrapped"
    fi
}

# Deploy the stack
deploy_stack() {
    print_status "Deploying MCP Demo stack..."
    
    # Deploy with progress
    npm run deploy -- --require-approval never
    
    print_success "Stack deployed successfully"
}

# Get deployment outputs
get_outputs() {
    print_status "Getting deployment outputs..."
    
    # Get stack outputs
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name MCPDemoStack \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    echo ""
    echo "📋 Deployment Outputs:"
    echo "======================"
    
    echo $OUTPUTS | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'
    
    echo ""
    print_success "Deployment completed successfully!"
    print_status "You can now access your application at the WebsiteUrl above"
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "   MCP Demo Infrastructure Deployment"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    install_dependencies
    build_project
    bootstrap_cdk
    deploy_stack
    get_outputs
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Access your web application using the WebsiteUrl"
    echo "2. Test the chat functionality"
    echo "3. Monitor logs in CloudWatch"
    echo ""
    echo "To destroy the stack, run: npm run destroy"
}

# Run main function
main "$@" 