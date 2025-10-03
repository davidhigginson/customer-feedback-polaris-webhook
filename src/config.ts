import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 3000;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`PORT must be a number. Received: ${value}`);
  }
  return parsed;
};

const formatAuthHeader = (rawToken: string): string => {
  const trimmed = rawToken.trim();
  if (trimmed.toLowerCase().startsWith('bearer ') || trimmed.toLowerCase().startsWith('basic ')) {
    return trimmed;
  }
  return `Bearer ${trimmed}`;
};

export interface AppConfig {
  port: number;
  atlBaseUrl: string;
  atlGraphqlUrl: string;
  authorizationHeader: string;
  cloudId: string;
  defaultInsightSource: string;
  webhookSecret?: string;
}

const rawAccessToken =
  process.env.ATLASSIAN_ACCESS_TOKEN ?? process.env.JIRA_ACCESS_TOKEN ?? null;

if (!rawAccessToken) {
  throw new Error('Missing ATLASSIAN_ACCESS_TOKEN (or JIRA_ACCESS_TOKEN) environment variable');
}

const config: AppConfig = {
  port: parsePort(process.env.PORT),
  atlBaseUrl: process.env.ATLASSIAN_API_BASE_URL ?? 'https://api.atlassian.com',
  atlGraphqlUrl: process.env.ATLASSIAN_GRAPHQL_URL ?? 'https://api-private.atlassian.com/graphql',
  authorizationHeader: formatAuthHeader(rawAccessToken),
  cloudId: requiredEnv('ATLASSIAN_CLOUD_ID'),
  defaultInsightSource: process.env.DEFAULT_INSIGHT_SOURCE ?? 'webhook',
  webhookSecret: process.env.WEBHOOK_SHARED_SECRET,
};

export default config;
