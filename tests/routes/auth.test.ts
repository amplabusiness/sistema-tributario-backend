/// <reference types="jest" />
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../../src/routes/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock do bcryptjs
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as any;

// Mock do jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as any;

// Criar app de teste
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'novo@teste.com',
        password: 'password123',
        name: 'Test User',
        company: 'Test Company',
      };

      // Mock do bcryptjs
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Usuário criado com sucesso');
      expect(response.body).toHaveProperty('data.user');
      expect(response.body).toHaveProperty('data.token');
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 409 if user already exists', async () => {
      const userData = {
        email: 'admin@test.com',
        password: 'password123',
        name: 'Test User',
        company: 'Test Company',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 422 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
        company: 'Test Company',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 422 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        company: 'Test Company',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'password123',
      };

      // Prisma mock global já retorna um usuário válido para findUnique
      // Mock do bcryptjs
      mockBcrypt.compare.mockResolvedValue(true as never);
      // Mock do JWT
      mockJwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('data.token', 'mock-jwt-token');
      expect(response.body).toHaveProperty('data.user');
      expect(response.body.data.user).toHaveProperty('email', loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Prisma mock global já retorna null para findUnique

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Prisma mock global já retorna um usuário válido para findUnique
      // Mock do bcryptjs - senha incorreta
      mockBcrypt.compare.mockResolvedValue(false as never);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
    });
  });

  // describe('POST /auth/refresh', () => {
  //   it('should refresh token successfully', async () => {
  //     const mockUser = {
  //       id: 1,
  //       email: 'test@example.com',
  //       name: 'Test User',
  //     };

  //     // Mock do JWT
  //     mockJwt.verify.mockReturnValue({ userId: 1 } as any);
  //     mockJwt.sign.mockReturnValue('new-mock-jwt-token');

  //     const response = await request(app)
  //       .post('/auth/refresh')
  //       .set('Authorization', 'Bearer old-token')
  //       .expect(200);

  //     expect(response.body).toHaveProperty('data.token', 'new-mock-jwt-token');
  //     expect(response.body).toHaveProperty('data.user');
  //   });

  //   it('should return 401 for invalid token', async () => {
  //     // Mock do JWT - token inválido
  //     mockJwt.verify.mockImplementation(() => {
  //       throw new Error('Invalid token');
  //     });

  //     const response = await request(app)
  //       .post('/auth/refresh')
  //       .set('Authorization', 'Bearer invalid-token')
  //       .expect(401);

  //     expect(response.body).toHaveProperty('error', 'Token inválido');
  //   });
  // });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout realizado com sucesso');
    });
  });
});