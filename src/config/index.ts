import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sistema_tributario',
    ssl: process.env.NODE_ENV === 'production',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 8000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  upload: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
  security: {
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  },
  monitoring: {
    prometheusPort: Number(process.env.PROMETHEUS_PORT) || 9090,
    grafanaPort: Number(process.env.GRAFANA_PORT) || 3002,
  },
};

export default config; 