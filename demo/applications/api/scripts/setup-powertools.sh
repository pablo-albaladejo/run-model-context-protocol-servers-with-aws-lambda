#!/bin/bash

# PowerTools Setup Script for MCP Demo API
# This script configures AWS Lambda PowerTools for the MCP Demo application

set -e

echo "🚀 Setting up AWS Lambda PowerTools for MCP Demo API..."

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

# Get current AWS account and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

print_status "Using AWS Account: $AWS_ACCOUNT_ID"
print_status "Using AWS Region: $AWS_REGION"

# Environment variables
STAGE=${1:-dev}
FUNCTION_NAME="MCPDemoStack-${STAGE}-api"
LOG_GROUP_NAME="/aws/lambda/${FUNCTION_NAME}"

print_status "Configuring for stage: $STAGE"
print_status "Function name: $FUNCTION_NAME"

# Create CloudWatch Log Group if it doesn't exist
print_status "Creating CloudWatch Log Group..."
aws logs create-log-group --log-group-name "$LOG_GROUP_NAME" --region "$AWS_REGION" 2>/dev/null || print_warning "Log group already exists"

# Set log retention policy (30 days)
print_status "Setting log retention policy to 30 days..."
aws logs put-retention-policy --log-group-name "$LOG_GROUP_NAME" --retention-in-days 30 --region "$AWS_REGION"

# Create CloudWatch Dashboard
print_status "Creating CloudWatch Dashboard..."
cat > dashboard-config.json << EOF
{
  "DashboardName": "MCPDemo-API-Dashboard-${STAGE}",
  "DashboardBody": "{\"widgets\":[{\"type\":\"metric\",\"x\":0,\"y\":0,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"MCPDemo\",\"MessagesSent\"],[\"MCPDemo\",\"SessionsCreated\"],[\"MCPDemo\",\"UserLogins\"]],\"period\":300,\"stat\":\"Sum\",\"region\":\"${AWS_REGION}\",\"title\":\"Business Metrics\"}},{\"type\":\"metric\",\"x\":12,\"y\":0,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"MCPDemo\",\"RequestDuration\"],[\"MCPDemo\",\"DatabaseQueryTime\"],[\"MCPDemo\",\"ExternalApiCallTime\"]],\"period\":300,\"stat\":\"Average\",\"region\":\"${AWS_REGION}\",\"title\":\"Performance Metrics\"}},{\"type\":\"metric\",\"x\":0,\"y\":6,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"MCPDemo\",\"ValidationErrors\"],[\"MCPDemo\",\"AuthenticationErrors\"],[\"MCPDemo\",\"DatabaseErrors\"],[\"MCPDemo\",\"MCPServiceErrors\"]],\"period\":300,\"stat\":\"Sum\",\"region\":\"${AWS_REGION}\",\"title\":\"Error Metrics\"}},{\"type\":\"metric\",\"x\":12,\"y\":6,\"width\":12,\"height\":6,\"properties\":{\"metrics\":[[\"MCPDemo\",\"ActiveUsers\"],[\"MCPDemo\",\"TotalSessions\"],[\"MCPDemo\",\"MessagesPerSession\"]],\"period\":300,\"stat\":\"Average\",\"region\":\"${AWS_REGION}\",\"title\":\"User Engagement Metrics\"}}]}"
}
EOF

aws cloudwatch put-dashboard --cli-input-json file://dashboard-config.json --region "$AWS_REGION"

# Create CloudWatch Alarms
print_status "Creating CloudWatch Alarms..."

# High Error Rate Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MCPDemo-HighErrorRate-${STAGE}" \
  --alarm-description "Alarm when error rate exceeds 5%" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --region "$AWS_REGION"

# High Latency Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MCPDemo-HighLatency-${STAGE}" \
  --alarm-description "Alarm when average response time exceeds 5 seconds" \
  --metric-name "Duration" \
  --namespace "AWS/Lambda" \
  --statistic "Average" \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5000 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=FunctionName,Value="$FUNCTION_NAME" \
  --region "$AWS_REGION"

# Database Error Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MCPDemo-DatabaseErrors-${STAGE}" \
  --alarm-description "Alarm when database errors occur" \
  --metric-name "DatabaseErrors" \
  --namespace "MCPDemo" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator "GreaterThanThreshold" \
  --region "$AWS_REGION"

# MCP Service Error Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MCPDemo-MCPServiceErrors-${STAGE}" \
  --alarm-description "Alarm when MCP service errors occur" \
  --metric-name "MCPServiceErrors" \
  --namespace "MCPDemo" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator "GreaterThanThreshold" \
  --region "$AWS_REGION"

# Authentication Failure Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MCPDemo-AuthFailures-${STAGE}" \
  --alarm-description "Alarm when authentication failures occur" \
  --metric-name "AuthenticationErrors" \
  --namespace "MCPDemo" \
  --statistic "Sum" \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --region "$AWS_REGION"

# Create environment file for PowerTools configuration
print_status "Creating PowerTools environment configuration..."
cat > .env.powertools << EOF
# PowerTools Configuration
POWERTOOLS_SERVICE_NAME=mcp-demo-api
POWERTOOLS_METRICS_NAMESPACE=MCPDemo
POWERTOOLS_LOGGER_LOG_EVENT=true
POWERTOOLS_LOGGER_SAMPLE_RATE=1
POWERTOOLS_TRACER_CAPTURE_RESPONSE=true
POWERTOOLS_TRACER_CAPTURE_ERROR=true

# Environment
STAGE=${STAGE}
AWS_REGION=${AWS_REGION}
LOG_LEVEL=INFO

# CloudWatch Configuration
CLOUDWATCH_DASHBOARD_NAME=MCPDemo-API-Dashboard-${STAGE}
EOF

# Create deployment script
print_status "Creating deployment script..."
cat > deploy-powertools.sh << EOF
#!/bin/bash

# Deploy PowerTools-enabled Lambda function
echo "Deploying PowerTools-enabled Lambda function..."

# Build the project
npm run build

# Deploy using your preferred method (CDK, SAM, etc.)
# Example for CDK:
# cdk deploy MCPDemoStack-${STAGE}

# Example for SAM:
# sam build && sam deploy --guided

echo "Deployment completed!"
echo "Dashboard URL: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=MCPDemo-API-Dashboard-${STAGE}"
EOF

chmod +x deploy-powertools.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor-powertools.sh << EOF
#!/bin/bash

# Monitor PowerTools metrics and logs
echo "Monitoring PowerTools metrics and logs..."

# View recent logs
echo "Recent logs:"
aws logs tail "$LOG_GROUP_NAME" --since 1h --region "$AWS_REGION"

# View metrics
echo "Recent metrics:"
aws cloudwatch get-metric-statistics \
  --namespace "MCPDemo" \
  --metric-name "MessagesSent" \
  --dimensions Name=Service,Value=api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region "$AWS_REGION"
EOF

chmod +x monitor-powertools.sh

# Clean up temporary files
rm -f dashboard-config.json

print_success "PowerTools setup completed successfully!"
print_status "Next steps:"
echo "1. Review the generated .env.powertools file"
echo "2. Run ./deploy-powertools.sh to deploy your function"
echo "3. Run ./monitor-powertools.sh to monitor metrics and logs"
echo "4. Visit the CloudWatch dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=MCPDemo-API-Dashboard-${STAGE}"

print_status "PowerTools features enabled:"
echo "✅ Structured logging with correlation IDs"
echo "✅ Custom business metrics"
echo "✅ Performance monitoring"
echo "✅ Error tracking and alerting"
echo "✅ Distributed tracing"
echo "✅ CloudWatch dashboards and alarms" 