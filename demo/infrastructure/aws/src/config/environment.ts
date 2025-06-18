export interface EnvironmentConfig {
  readonly account: string;
  readonly region: string;
  readonly environment: string;
  readonly domainName?: string;
  readonly certificateArn?: string;
}

export const environments: { [key: string]: EnvironmentConfig } = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "",
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    environment: "dev",
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "",
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    environment: "staging",
  },
  prod: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "",
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    environment: "prod",
  },
};

export function getEnvironmentConfig(env: string): EnvironmentConfig {
  const config = environments[env];
  if (!config) {
    throw new Error(`Environment '${env}' not found in configuration`);
  }
  return config;
}
