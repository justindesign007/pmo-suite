import { resolve } from 'node:path';

export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3000),
    dbPath: env.PMO_DB_PATH || resolve(process.cwd(), 'data/pmo-suite.sqlite'),
    sessionTtlMs: Number(env.PMO_SESSION_TTL_MS || 1000 * 60 * 60 * 8),
    logLevel: env.LOG_LEVEL || 'info',
  };
}

export const config = loadConfig();
