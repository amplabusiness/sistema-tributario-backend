import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import multiEmpresaRouter from './routes/multi-empresa';
import { authRoutes } from './routes/auth';
import { documentsRoutes } from './routes/documents';

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
    version: '1.0.0',
    message: 'Sistema Tributário funcionando!'
  });
});

// Registrar todas as rotas
app.use('/api/auth', authRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/multi-empresa', multiEmpresaRouter);

// Rota básica de upload para AVIZ
app.post('/api/upload', (req, res) => {
  try {
    const { fileName, fileType, content, empresaId } = req.body;
    
    if (!fileName || !fileType || !content) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios: fileName, fileType, content'
      });
    }

    // Simular processamento
    const processedData = {
      id: Date.now().toString(),
      fileName,
      fileType,
      empresaId: empresaId || 'default',
      status: 'processed',
      processedAt: new Date().toISOString(),
      summary: {
        totalItems: content.length || 0,
        documentType: fileType,
        processingTime: Math.random() * 1000
      }
    };    console.log(`📄 Arquivo processado: ${fileName} (${fileType})`);

    return res.json({
      success: true,
      message: 'Arquivo processado com sucesso!',
      data: processedData
    });
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para listar documentos
app.get('/api/documents', (req, res) => {
  const mockDocuments = [
    {
      id: '1',
      fileName: 'AVIZ-ICMS-04-2025.txt',
      fileType: 'AVIZ',
      empresaId: 'empresa-1',
      status: 'processed',
      processedAt: '2025-01-15T10:30:00Z',
      summary: {
        totalItems: 1250,
        documentType: 'AVIZ',
        processingTime: 450
      }
    },
    {
      id: '2',
      fileName: 'SPED-FISCAL-04-2025.txt',
      fileType: 'SPED',
      empresaId: 'empresa-1',
      status: 'processed',
      processedAt: '2025-01-15T11:15:00Z',
      summary: {
        totalItems: 890,
        documentType: 'SPED',
        processingTime: 320
      }
    }
  ];

  res.json({
    success: true,
    data: mockDocuments
  });
});

// Rota para analise ICMS
app.post('/api/icms/analyze', (req, res) => {
  try {
    const { empresaId, periodo } = req.body;

    // Simular analise ICMS
    const analiseICMS = {
      empresaId: empresaId || 'default',
      periodo: periodo || '04/2025',
      resultado: {
        totalICMS: 125000.50,
        totalProtege: 25000.00,
        totalDIFAL: 15000.00,
        totalBaseReduzida: 8000.00,
        totalCreditoOutorgado: 12000.00,
        status: 'aprovado'
      },
      detalhes: [
        {
          produto: 'Produto A',
          ncm: '12345678',
          icms: 15000.00,
          protege: 3000.00,
          difal: 1800.00
        },
        {
          produto: 'Produto B',
          ncm: '87654321',
          icms: 20000.00,
          protege: 4000.00,
          difal: 2400.00
        }
      ],
      processadoEm: new Date().toISOString()
    };

    console.log(`📊 Análise ICMS processada para empresa ${empresaId}`);

    res.json({
      success: true,
      message: 'Análise ICMS concluída!',
      data: analiseICMS
    });

  } catch (error) {
    console.error('❌ Erro na analise ICMS:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na analise ICMS'
    });
  }
});

// Rota para analise Federal
app.post('/api/federal/analyze', (req, res) => {
  try {
    const { empresaId, periodo } = req.body;

    // Simular analise Federal
    const analiseFederal = {
      empresaId: empresaId || 'default',
      periodo: periodo || '04/2025',
      resultado: {
        totalPIS: 8500.00,
        totalCOFINS: 39200.00,
        totalIRPJ: 25000.00,
        totalCSLL: 9000.00,
        status: 'aprovado'
      },
      detalhes: [
        {
          produto: 'Produto A',
          pis: 1200.00,
          cofins: 5520.00,
          irpj: 3500.00,
          csll: 1260.00
        },
        {
          produto: 'Produto B',
          pis: 1500.00,
          cofins: 6900.00,
          irpj: 4500.00,
          csll: 1620.00
        }
      ],
      processadoEm: new Date().toISOString()
    };

    console.log(`📊 Análise Federal processada para empresa ${empresaId}`);

    res.json({
      success: true,
      message: 'Análise Federal concluída!',
      data: analiseFederal
    });

  } catch (error) {
    console.error('❌ Erro na analise Federal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na analise Federal'
    });
  }
});

// Rota para dashboard
app.get('/api/dashboard', (req, res) => {
  const dashboard = {
    empresas: [
      {
        id: 'empresa-1',
        nome: 'Empresa Teste LTDA',
        cnpj: '12.345.678/0001-90',
        documentos: 15,
        ultimaAtualizacao: '2025-01-15T12:00:00Z'
      }
    ],
    estatisticas: {
      totalDocumentos: 15,
      documentosProcessados: 12,
      documentosPendentes: 3,
      totalICMS: 125000.50,
      totalFederal: 82700.00
    },
    alertas: [
      {
        tipo: 'info',
        mensagem: 'Sistema funcionando normalmente',
        timestamp: new Date().toISOString()
      }
    ]
  };

  res.json({
    success: true,
    data: dashboard
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Sistema Tributário - Backend Funcionando!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      upload: '/api/upload',
      documents: '/api/documents',
      icms: '/api/icms/analyze',
      federal: '/api/federal/analyze',
      dashboard: '/api/dashboard'
    },
    status: 'online'
  });
});

// Iniciar servidor SOMENTE se não estiver em ambiente de teste/importação
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📄 Upload: http://localhost:${PORT}/api/upload`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, fechando servidor...');
    process.exit(0);
  });
}

export default app;