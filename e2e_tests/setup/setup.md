To set up an AWS account for running integration tests on GitHub:

```bash
aws cloudformation deploy \
    --template-file integ-test-authentication.yaml \
    --stack-name github-integ-test-identity-provider \
    --parameter-overrides GitHubOrg=awslabs RepositoryName=run-model-context-protocol-servers-with-aws-lambda \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-2

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

cdk bootstrap \
    aws://$AWS_ACCOUNT_ID/us-east-2 \
    --cloudformation-execution-policies "arn:aws:iam::$AWS_ACCOUNT_ID:policy/mcp-lambda-integ-test-cdk-cfn-execution"
```
