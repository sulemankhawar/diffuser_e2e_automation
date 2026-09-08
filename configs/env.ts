import path from 'node:path';
import { config as loadEnv } from 'dotenv';

type FrameworkEnvironment = 'staging' | 'production' | 'local';

interface EnvConfig {
  name: FrameworkEnvironment;
  baseUrl: string;
  headless: boolean;
}

const ENV_FILE_MAP: Record<FrameworkEnvironment, string> = {
  staging: '.env.staging',
  production: '.env.production',
  local: '.env.local',
};

let cachedConfig: EnvConfig | null = null;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.trim().toLowerCase() === 'true';
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const testEnv = (process.env.TEST_ENV as FrameworkEnvironment) || 'staging';
  const envFile = ENV_FILE_MAP[testEnv] || ENV_FILE_MAP.staging;

  loadEnv({
    path: path.resolve(process.cwd(), envFile),
    override: false,
  });

  // .env.local is gitignored and holds local secrets (e.g. SAP test passwords); load it
  // regardless of TEST_ENV so credentials aren't tied to the 'local' environment only.
  loadEnv({
    path: path.resolve(process.cwd(), '.env.local'),
    override: false,
  });

  cachedConfig = {
    name: testEnv,
    baseUrl: process.env.BASE_URL || 'https://playwright.dev',
    headless: parseBoolean(process.env.HEADLESS, true),
  };

  return cachedConfig;
}
