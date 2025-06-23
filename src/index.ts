import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

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

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
    };

    console.log(`📄 Arquivo processado: ${fileName} (${fileType})`);

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

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema Tributário 100% IA - Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      status: '/api/status',
      upload: '/api/upload',
      documents: '/api/documents',
      icmsAnalyze: '/api/icms/analyze',
      federalAnalyze: '/api/federal/analyze'
    }
  });
});

// Middleware de tratamento de erro
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Inicialização do servidor
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Status: http://localhost:${PORT}/api/status`);
  });
}

export default app;