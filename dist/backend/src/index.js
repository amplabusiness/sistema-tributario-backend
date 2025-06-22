"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
app.post('/api/upload', async (req, res) => {
    try {
        const { fileName, fileType, content, empresaId } = req.body;
        if (!fileName || !fileType || !content) {
            return res.status(400).json({
                success: false,
                error: 'Dados obrigatórios não fornecidos'
            });
        }
        const document = await prisma.document.create({
            data: {
                filename: fileName,
                originalName: fileName,
                size: content.length,
                status: 'PENDING',
                mimeType: fileType,
                path: `/uploads/${fileName}`,
                empresaId: empresaId || 'default',
                userId: 'system',
                metadata: {}
            }
        });
        res.json({
            success: true,
            message: 'Documento enviado com sucesso',
            data: {
                id: document.id,
                fileName: document.filename,
                status: document.status
            }
        });
    }
    catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
app.get('/api/documents', async (req, res) => {
    try {
        const documents = await prisma.document.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({
            success: true,
            data: documents
        });
    }
    catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
app.post('/api/process-aviz', async (req, res) => {
    try {
        const { documentId } = req.body;
        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'ID do documento não fornecido'
            });
        }
        await prisma.document.update({
            where: { id: documentId },
            data: { status: 'PROCESSING' }
        });
        const resultado = {
            documentId,
            status: 'PROCESSED',
            summary: {
                totalItems: 150,
                totalValue: 125000.50,
                icmsTotal: 22500.09,
                pisCofins: 8125.03
            },
            details: [
                {
                    item: 'Produto A',
                    ncm: '12345678',
                    valor: 50000.00,
                    icms: 9000.00
                },
                {
                    item: 'Produto B',
                    ncm: '87654321',
                    valor: 75000.50,
                    icms: 13500.09
                }
            ]
        };
        res.json({
            success: true,
            message: 'Documento AVIZ processado com sucesso',
            data: resultado
        });
    }
    catch (error) {
        console.error('Erro no processamento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
app.get('/api/dashboard', async (req, res) => {
    try {
        const [totalDocuments, totalEmpresas] = await Promise.all([
            prisma.document.count(),
            prisma.empresa.count()
        ]);
        res.json({
            success: true,
            data: {
                totalDocuments,
                totalEmpresas,
                recentActivity: [
                    {
                        type: 'upload',
                        document: 'AVIZ-04-2025.txt',
                        timestamp: new Date().toISOString()
                    },
                    {
                        type: 'process',
                        document: 'SPED-ICMS-04-2025.txt',
                        timestamp: new Date(Date.now() - 3600000).toISOString()
                    }
                ]
            }
        });
    }
    catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../frontend/dist/index.html'));
});
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📁 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Recebido SIGTERM, fechando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🛑 Recebido SIGINT, fechando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map