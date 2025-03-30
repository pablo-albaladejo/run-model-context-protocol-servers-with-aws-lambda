import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Role } from "aws-cdk-lib/aws-iam";
import * as path from "path";

export class WeatherAlertsMcpServer extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Package local module as a layer for testing
    const mcpLambdaLayer = new LayerVersion(this, "McpLambdaLayer", {
      code: Code.fromAsset(path.join(__dirname, "../../../../src/typescript"), {
        bundling: {
          image: Runtime.NODEJS_22_X.bundlingImage,
          command: [
            "bash",
            "-c",
            [
              "mkdir -p /asset-output/nodejs/node_modules/mcp-lambda",
              `cp -r /asset-input/* /asset-output/nodejs/node_modules/mcp-lambda/`,
            ].join(" && "),
          ],
        },
      }),
      compatibleRuntimes: [Runtime.NODEJS_22_X],
    });

    new NodejsFunction(this, "function", {
      functionName: "mcp-server-weather-alerts",
      role: Role.fromRoleName(this, "role", "mcp-lambda-example-servers"),
      memorySize: 2048,
      runtime: Runtime.NODEJS_22_X,
      environment: {
        LOG_LEVEL: "DEBUG",
      },
      layers: [mcpLambdaLayer],
      bundling: {
        nodeModules: ["openapi-mcp-server"],
        externalModules: ["mcp-lambda"],
        commandHooks: {
          beforeBundling(inputDir: string, outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [`cp ${inputDir}/weather-alerts-openapi.json ${outputDir}/`];
          },
          beforeInstall(inputDir: string, outputDir: string) {
            return [];
          },
        },
      },
    });
  }
}

const app = new cdk.App();
new WeatherAlertsMcpServer(app, "LambdaMcpServer-WeatherAlerts", {
  env: { account: process.env["CDK_DEFAULT_ACCOUNT"], region: "us-east-2" },
});
app.synth();
