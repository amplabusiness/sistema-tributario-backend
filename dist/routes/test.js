"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRoutes = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const document_processor_1 = require("../services/document-processor");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
const router = express_1.default.Router();
exports.testRoutes = router;
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'test-uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'test-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});
router.post('/pipeline', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }
        const testUserId = 'test-user-' + Date.now();
        const documentProcessor = new document_processor_1.DocumentProcessor();
        (0, logger_1.logInfo)('Iniciando teste do pipeline completo', {
            filename: req.file.originalname,
            filePath: req.file.path,
            userId: testUserId,
        });
        const document = await database_1.prisma.document.create({
            data: {
                filename: req.file.originalname,
                filePath: req.file.path,
                documentType: path_1.default.extname(req.file.originalname).toLowerCase() === '.xml' ? 'XML' : 'PDF',
                status: 'PENDING',
                userId: testUserId,
                empresaId: 'test-empresa',
                metadata: {
                    test: true,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });
        (0, logger_1.logInfo)('Documento criado no banco', { documentId: document.id });
        await documentProcessor.processDocument(document.id, testUserId);
        const results = await getCompleteResults(document.id);
        (0, logger_1.logInfo)('Pipeline de teste concluído com sucesso', {
            documentId: document.id,
            icmsResults: results.icms.length,
            federalResults: results.federal.length,
        });
        res.json({
            success: true,
            message: 'Pipeline de teste executado com sucesso',
            documentId: document.id,
            results,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no teste do pipeline', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            message: 'Erro no teste do pipeline',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/create-test-document', async (req, res) => {
    try {
        const testXml = createTestNFeXML();
        const testDir = path_1.default.join(process.cwd(), 'test-uploads');
        const testFilePath = path_1.default.join(testDir, `test-nfe-${Date.now()}.xml`);
        if (!fs_1.default.existsSync(testDir)) {
            fs_1.default.mkdirSync(testDir, { recursive: true });
        }
        fs_1.default.writeFileSync(testFilePath, testXml);
        (0, logger_1.logInfo)('Documento de teste criado', { filePath: testFilePath });
        res.json({
            success: true,
            message: 'Documento de teste criado',
            filePath: testFilePath,
            content: testXml.substring(0, 500) + '...',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao criar documento de teste', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            message: 'Erro ao criar documento de teste',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/test-agents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { ICMSAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/icms-agent')));
        const { FederalAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/federal-agent')));
        const icmsAgent = new ICMSAgent();
        const federalAgent = new FederalAgent();
        (0, logger_1.logInfo)('Testando agentes de apuração', { documentId });
        const icmsResults = await icmsAgent.processDocument(documentId);
        (0, logger_1.logInfo)('ICMS testado com sucesso', { documentId, count: icmsResults.length });
        const federalResults = await federalAgent.processDocument(documentId);
        (0, logger_1.logInfo)('Federal testado com sucesso', { documentId, count: federalResults.length });
        res.json({
            success: true,
            message: 'Agentes testados com sucesso',
            documentId,
            results: {
                icms: icmsResults.length,
                federal: federalResults.length,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no teste dos agentes', {
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
async function getCompleteResults(documentId) {
    const [document, icmsResults, federalResults] = await Promise.all([
        database_1.prisma.document.findUnique({
            where: { id: documentId },
            include: {
                chunks: true,
                aiResults: true,
            },
        }),
        database_1.prisma.iCMSResult.findMany({
            where: { documentId },
        }),
        database_1.prisma.federalResult.findMany({
            where: { documentId },
        }),
    ]);
    return {
        document: {
            id: document?.id,
            status: document?.status,
            chunks: document?.chunks.length || 0,
            aiResults: document?.aiResults.length || 0,
        },
        icms: icmsResults,
        federal: federalResults,
    };
}
function createTestNFeXML() {
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
//# sourceMappingURL=test.js.map