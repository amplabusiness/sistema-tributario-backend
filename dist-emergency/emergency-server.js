"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Servidor mínimo para deploy de emergência
const express_1 = require("express");
const cors_1 = require("cors");
const helmet_1 = require("helmet");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middlewares básicos
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check para verificar se o servidor está funcionando
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0-emergency'
    });
});
// Status da API
app.get('/api/status', (req, res) => {
    res.status(200).json({
        status: 'API funcionando',
        message: 'Sistema Tributário IA - Build de Emergência',
        timestamp: new Date().toISOString(),
        features: {
            authentication: 'disabled',
            database: 'offline',
            ai: 'offline',
            queue: 'offline'
        }
    });
});
// Rota básica
app.get('/', (req, res) => {
    res.json({
        message: 'Sistema Tributário IA - Build de Emergência',
        status: 'server running',
        timestamp: new Date().toISOString()
    });
});
// Fallback para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de emergência rodando na porta ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Status API: http://localhost:${PORT}/api/status`);
    console.log(`⚠️ Build de emergência - funcionalidades limitadas`);
});
exports.default = app;
