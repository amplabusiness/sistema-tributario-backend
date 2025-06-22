import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentProcessor } from '../services/document-processor';
import { logInfo, logError } from '../utils/logger';
import prisma from '../config/database';

const router = express.Router();

// Configuração do multer para upload de teste
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'test-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'test-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB para testes
  },
});

// Rota para testar o pipeline completo
router.post('/pipeline', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const testUserId = 'test-user-' + Date.now();
    const documentProcessor = new DocumentProcessor();

    logInfo('Iniciando teste do pipeline completo', {
      filename: req.file.originalname,
      filePath: req.file.path,
      userId: testUserId,
    });    // 1. Criar documento no banco
    const document = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        path: req.file.path,
        status: 'PENDING',
        userId: testUserId,
        empresaId: 'test-empresa',
        metadata: {
          test: true,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    logInfo('Documento criado no banco', { documentId: document.id });

    // 2. Processar documento (inclui parsing, chunking, IA e apuracao)
    await documentProcessor.processDocument(document.id, Buffer.from(testUserId, 'utf8'));

    // 3. Buscar resultados completos
    const results = await getCompleteResults(document.id);    logInfo('Pipeline de teste concluído com sucesso', {
      documentId: document.id,
      fiscalResults: results.fiscal.length,
      contribuicoesResults: results.contribuicoes.length,
    });return res.json({
      success: true,
      message: 'Pipeline de teste executado com sucesso',
      documentId: document.id,
      results,
    });

  } catch (error) {
    logError('Erro no teste do pipeline', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.status(500).json({
      success: false,
      message: 'Erro no teste do pipeline',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Rota para criar documento de teste (XML NFe)
router.post('/create-test-document', async (req, res) => {
  try {
    const testXml = createTestNFeXML();
    const testDir = path.join(process.cwd(), 'test-uploads');
    const testFilePath = path.join(testDir, `test-nfe-${Date.now()}.xml`);

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(testFilePath, testXml);

    logInfo('Documento de teste criado', { filePath: testFilePath });

    res.json({
      success: true,
      message: 'Documento de teste criado',
      filePath: testFilePath,
      content: testXml.substring(0, 500) + '...',
    });

  } catch (error) {
    logError('Erro ao criar documento de teste', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Erro ao criar documento de teste',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Rota para testar apenas os agentes de apuracao
router.post('/test-agents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { ICMSAgent } = await import('../services/agents/icms-agent');
    const { FederalAgent } = await import('../services/agents/federal-agent');

    const icmsAgent = new ICMSAgent();
    const federalAgent = new FederalAgent();

    logInfo('Testando agentes de apuracao', { documentId });

    // Testar ICMS
    const icmsResults = await icmsAgent.processDocument(documentId);
    logInfo('ICMS testado com sucesso', { documentId, count: icmsResults.length });

    // Testar Federal
    const federalResults = await federalAgent.processDocument(documentId);
    logInfo('Federal testado com sucesso', { documentId, count: federalResults.length });

    res.json({
      success: true,
      message: 'Agentes testados com sucesso',
      documentId,
      results: {
        icms: icmsResults.length,
        federal: federalResults.length,
      },
    });

  } catch (error) {
    logError('Erro no teste dos agentes', {
      documentId: req.params.documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      message: 'Erro no teste dos agentes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Função para buscar resultados completos
async function getCompleteResults(documentId: string) {
  const [document, spedFiscalItems, spedContribuicoesItems] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      include: {
        aiResults: true,
        spedFiscalItems: true,
        spedContribuicoesItems: true,
      },
    }),
    prisma.spedFiscalItem.findMany({
      where: { documentId },
    }),
    prisma.spedContribuicoesItem.findMany({
      where: { documentId },
    }),
  ]);
  return {
    document: {
      id: document?.id,
      status: document?.status,
      aiResults: document?.aiResults.length || 0,
    },
    fiscal: spedFiscalItems,
    contribuicoes: spedContribuicoesItems,
  };
}

// Função para criar XML de teste (NFe)
function createTestNFeXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe52250400109066000114550010003773041217110708">
      <ide>
        <cUF>52</cUF>
        <cNF>377304</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>377304</nNF>
        <dhEmi>2025-01-15T10:30:00-03:00</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>5208707</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>8</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>00109066000114</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <xFant>EMPRESA TESTE</xFant>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>123</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>5208707</cMun>
          <xMun>GOIANIA</xMun>
          <UF>GO</UF>
          <CEP>74000000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>123456789</IE>
        <CRT>1</CRT>
      </emit>
      <dest>
        <CNPJ>12345678000199</CNPJ>
        <xNome>CLIENTE TESTE LTDA</xNome>
        <enderDest>
          <xLgr>RUA CLIENTE</xLgr>
          <nro>456</nro>
          <xBairro>JARDIM</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01234000</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>
        <IE>987654321</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>PRODUTO TESTE</xProd>
          <NCM>10059000</NCM>
          <CFOP>5102</CFOP>
          <uCom>KG</uCom>
          <qCom>100.0000</qCom>
          <vUnCom>10.00</vUnCom>
          <vProd>1000.00</vProd>
          <cEAN>7891234567890</cEAN>
          <uTrib>KG</uTrib>
          <qTrib>100.0000</qTrib>
          <vUnTrib>10.00</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>0</modBC>
              <vBC>1000.00</vBC>
              <pICMS>17.00</pICMS>
              <vICMS>170.00</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>1000.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>16.50</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>1000.00</vBC>
              <pCOFINS>7.6</pCOFINS>
              <vCOFINS>76.00</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>1000.00</vBC>
          <vICMS>170.00</vICMS>
          <vProd>1000.00</vProd>
          <vNF>1000.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>1</modFrete>
      </transp>
      <cobr>
        <fat>
          <nFat>123456</nFat>
          <vOrig>1000.00</vOrig>
          <vDesc>0.00</vDesc>
          <vLiq>1000.00</vLiq>
        </fat>
      </cobr>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>1.0</verAplic>
      <chNFe>52250400109066000114550010003773041217110708</chNFe>
      <dhRecbto>2025-01-15T10:31:00-03:00</dhRecbto>
      <nProt>352250000000001</nProt>
      <digVal>abc123def456</digVal>
      <cStat>100</cStat>
      <xMotivo>AUTORIZADO O USO DA NF-E</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;
}

export { router as testRoutes }; 