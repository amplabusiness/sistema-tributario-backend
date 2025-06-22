const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Rota básica de upload
app.post('/api/upload', (req, res) => {
  try {
    const { fileName, fileType, content, empresaId } = req.body;
    
    if (!fileName || !fileType || !content) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios não fornecidos'
      });
    }

    // Simular criação de documento
    const document = {
      id: Date.now().toString(),
      filename: fileName,
      originalName: fileName,
      size: content.length,
      status: 'PENDING',
      mimeType: fileType,
      path: `/uploads/${fileName}`,
      empresaId: empresaId || 'default',
      userId: 'system',
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Documento enviado com sucesso',
      data: {
        id: document.id,
        fileName: document.filename,
        status: document.status
      }
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para listar documentos
app.get('/api/documents', (req, res) => {
  try {
    // Simular lista de documentos
    const documents = [
      {
        id: '1',
        filename: 'AVIZ-04-2025.txt',
        originalName: 'AVIZ-04-2025.txt',
        size: 1024000,
        status: 'PROCESSED',
        mimeType: 'text/plain',
        empresaId: 'default',
        userId: 'system',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        filename: 'SPED-ICMS-04-2025.txt',
        originalName: 'SPED-ICMS-04-2025.txt',
        size: 2048000,
        status: 'PENDING',
        mimeType: 'text/plain',
        empresaId: 'default',
        userId: 'system',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para processar documentos AVIZ
app.post('/api/process-aviz', (req, res) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'ID do documento não fornecido'
      });
    }

    // Simular resultado do processamento
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
  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para dashboard
app.get('/api/dashboard', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalDocuments: 2,
        totalEmpresas: 1,
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
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para upload de arquivo AVIZ real
app.post('/api/upload-aviz', (req, res) => {
  try {
    const { fileName, content } = req.body;
    
    if (!fileName || !content) {
      return res.status(400).json({
        success: false,
        error: 'Nome do arquivo e conteúdo são obrigatórios'
      });
    }

    // Simular processamento do arquivo AVIZ
    const lines = content.split('\n');
    const processedData = {
      fileName,
      totalLines: lines.length,
      processedAt: new Date().toISOString(),
      summary: {
        totalItems: Math.floor(Math.random() * 200) + 50,
        totalValue: Math.floor(Math.random() * 500000) + 100000,
        icmsTotal: Math.floor(Math.random() * 90000) + 18000,
        pisCofins: Math.floor(Math.random() * 30000) + 6000
      }
    };

    res.json({
      success: true,
      message: 'Arquivo AVIZ processado com sucesso',
      data: processedData
    });
  } catch (error) {
    console.error('Erro no processamento AVIZ:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Servir arquivos estáticos do frontend (se existir)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Rota fallback para SPA
app.get('*', (req, res) => {
  res.json({
    message: 'Sistema Tributário 100% IA - Backend Funcionando!',
    endpoints: {
      health: '/health',
      upload: '/api/upload',
      documents: '/api/documents',
      processAviz: '/api/process-aviz',
      dashboard: '/api/dashboard',
      uploadAviz: '/api/upload-aviz'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📄 Upload AVIZ: http://localhost:${PORT}/api/upload-aviz`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, fechando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, fechando servidor...');
  process.exit(0);
}); 