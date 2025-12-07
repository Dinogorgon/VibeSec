import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env.local first (if exists), then .env
const envLocalPath = join(process.cwd(), '.env.local');
const envPath = join(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback to default .env
}

interface EnvConfig {
  databaseUrl: string;
  githubClientId: string;
  githubClientSecret: string;
  githubCallbackUrl: string;
  jwtSecret: string;
  redisUrl: string;
  port: number;
  nodeEnv: string;
  frontendUrl: string;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    console.error(`\n❌ Missing required environment variable: ${name}`);
    console.error(`\nPlease create a .env file in the backend directory.`);
    console.error(`You can copy .env.example to .env and update the values.\n`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: EnvConfig = {
  databaseUrl: getEnvVar('DATABASE_URL'),
  githubClientId: getEnvVar('GITHUB_CLIENT_ID'),
  githubClientSecret: getEnvVar('GITHUB_CLIENT_SECRET'),
  githubCallbackUrl: getEnvVar('GITHUB_CALLBACK_URL', 'http://localhost:3000/api/auth/github/callback'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  port: parseInt(getEnvVar('PORT', '10000'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
};

