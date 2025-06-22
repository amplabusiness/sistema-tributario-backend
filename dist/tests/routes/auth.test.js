"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../src/routes/auth");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
jest.mock('bcryptjs');
const mockBcrypt = bcryptjs_1.default;
jest.mock('jsonwebtoken');
const mockJwt = jsonwebtoken_1.default;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/auth', auth_1.authRoutes);
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
            mockBcrypt.hash.mockResolvedValue('hashedPassword');
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            mockBcrypt.compare.mockResolvedValue(true);
            mockJwt.sign.mockReturnValue('mock-jwt-token');
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            mockBcrypt.compare.mockResolvedValue(false);
            const response = await (0, supertest_1.default)(app)
                .post('/auth/login')
                .send(loginData)
                .expect(401);
            expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
        });
    });
    describe('POST /auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/auth/logout')
                .expect(200);
            expect(response.body).toHaveProperty('message', 'Logout realizado com sucesso');
        });
    });
});
//# sourceMappingURL=auth.test.js.map