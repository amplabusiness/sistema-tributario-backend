// Application Configuration Types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  upload: {
    maxFileSize: number;
    uploadPath: string;
  };
  logging: {
    level: string;
    file: string;
  };
  security: {
    bcryptRounds: number;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
  monitoring: {
    prometheusPort: number;
    grafanaPort: number;
  };
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'USER' | 'AUDITOR';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN' | 'USER' | 'AUDITOR';
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'USER' | 'AUDITOR';
  isActive?: boolean;
}

// Authentication Types
export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Document Types
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  userId: string;
  empresaId?: string;
  type: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentCreateData {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  userId: string;
  empresaId?: string;
  type: string;
}

// Empresa Types
export interface Empresa {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  ie?: string;
  im?: string;
  cnae?: string;
  endereco?: string;
  regimeTributario?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Cache Types
export interface CacheConfig {
  ttl?: number;
  prefix?: string;
}

// Processing Types
export interface ProcessingJob {
  id: string;
  type: string;
  data: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Express Types Extension
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
