"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentParserAgent = exports.DocumentParserAgent = void 0;
const openai_service_1 = require("@/services/openai-service");
const queue_1 = require("@/services/queue");
const PARSER_CONFIG = {
    maxFileSize: 50 * 1024 * 1024,
    supportedFormats: ['xml', 'txt', 'csv'],
    batchSize: 10,
    timeout: 30000,
    retryAttempts: 3,
};
const processedCache = new Map();
class DocumentParserAgent {
    constructor() {
        this.isRunning = false;
        this.processingQueue = [];
    }
    async start() {
        if (this.isRunning) {
            console.log('Agente de parsing já está em execução');
            return;
        }
        this.isRunning = true;
        console.log('🚀 Iniciando Agente de Parsing de Documentos', {
            config: PARSER_CONFIG,
        });
        this.startProcessing();
    }
    async stop() {
        this.isRunning = false;
        console.log('🛑 Agente de Parsing parado');
    }
    async processarDocumento(arquivoPath, tipo, empresa, cnpj, periodo) {
        const documentoId = this.generateDocumentId(arquivoPath, tipo, empresa, periodo);
        if (processedCache.has(documentoId)) {
            console.log('Documento já processado anteriormente', { documentoId });
            return this.getDocumentFromCache(documentoId);
        }
        this.processingQueue.push(documentoId);
        const documento = {
            id: documentoId,
            tipo,
            empresa,
            cnpj,
            periodo,
            dataProcessamento: new Date(),
            status: 'pendente',
            dados: {},
            erros: [],
            observacoes: '',
        };
        try {
            console.log('Iniciando processamento de documento', {
                documentoId,
                tipo,
                empresa,
                arquivoPath,
            });
            const conteudo = await this.lerArquivo(arquivoPath);
            if (conteudo.length > PARSER_CONFIG.maxFileSize) {
                throw new Error(`Arquivo muito grande: ${conteudo.length} bytes`);
            }
            const dadosProcessados = await this.processarPorTipo(conteudo, tipo);
            const validacao = await this.validarDadosComIA(dadosProcessados, tipo);
            documento.dados = dadosProcessados;
            documento.status = 'concluido';
            documento.observacoes = validacao.success ? 'Documento processado com sucesso' : 'Documento processado com avisos';
            await this.salvarNoBanco(documento);
            processedCache.set(documentoId, true);
            console.log('Documento processado com sucesso', {
                documentoId,
                tipo,
                quantidadeItens: dadosProcessados.itens?.length || 0,
                quantidadeImpostos: dadosProcessados.impostos?.length || 0,
            });
            await (0, queue_1.addToQueue)({
                documentId: documentoId,
                userId: 'system',
                filePath: 'processed'
            });
            return documento;
        }
        catch (error) {
            console.error('Erro ao processar documento', {
                documentoId,
                tipo,
                empresa,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            documento.status = 'erro';
            documento.erros.push(error instanceof Error ? error.message : 'Erro desconhecido');
            await this.salvarNoBanco(documento);
            return documento;
        }
        finally {
            const index = this.processingQueue.indexOf(documentoId);
            if (index > -1) {
                this.processingQueue.splice(index, 1);
            }
        }
    }
    async processarPorTipo(conteudo, tipo) {
        switch (tipo) {
            case 'XML':
                return await this.processarXML(conteudo);
            case 'SPED':
                return await this.processarSPED(conteudo);
            case 'ECD':
                return await this.processarECD(conteudo);
            case 'ECF':
                return await this.processarECF(conteudo);
            case 'CIAP':
                return await this.processarCIAP(conteudo);
            case 'INVENTARIO':
                return await this.processarInventario(conteudo);
            case 'PGDAS':
                return await this.processarPGDAS(conteudo);
            default:
                throw new Error(`Tipo de documento não suportado: ${tipo}`);
        }
    }
    async processarXML(conteudo) {
        try {
            const analiseIA = await (0, openai_service_1.analisarXML)(conteudo, 'XML');
            if (!analiseIA.success) {
                throw new Error('Falha na análise IA do XML');
            }
            const dados = this.extrairDadosXML(conteudo);
            return {
                ...dados,
                analiseIA: analiseIA.content,
                tipoDocumento: this.identificarTipoXML(conteudo),
            };
        }
        catch (error) {
            console.error('Erro ao processar XML', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarSPED(conteudo) {
        try {
            const analiseIA = await (0, openai_service_1.analisarXML)(conteudo, 'SPED');
            if (!analiseIA.success) {
                throw new Error('Falha na análise IA do SPED');
            }
            const dados = this.extrairDadosSPED(conteudo);
            return {
                ...dados,
                analiseIA: analiseIA.content,
                tipoSPED: this.identificarTipoSPED(conteudo),
            };
        }
        catch (error) {
            console.error('Erro ao processar SPED', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarECD(conteudo) {
        try {
            const linhas = conteudo.split('\n');
            const dados = {
                tipo: 'ECD',
                registros: [],
                totais: {
                    debitos: 0,
                    creditos: 0,
                },
            };
            for (const linha of linhas) {
                if (linha.trim()) {
                    const registro = this.processarRegistroECD(linha);
                    if (registro) {
                        dados.registros.push(registro);
                    }
                }
            }
            return dados;
        }
        catch (error) {
            console.error('Erro ao processar ECD', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarECF(conteudo) {
        try {
            const linhas = conteudo.split('\n');
            const dados = {
                tipo: 'ECF',
                registros: [],
                totais: {
                    receitas: 0,
                    custos: 0,
                    lucro: 0,
                },
            };
            for (const linha of linhas) {
                if (linha.trim()) {
                    const registro = this.processarRegistroECF(linha);
                    if (registro) {
                        dados.registros.push(registro);
                    }
                }
            }
            return dados;
        }
        catch (error) {
            console.error('Erro ao processar ECF', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarCIAP(conteudo) {
        try {
            const linhas = conteudo.split('\n');
            const dados = {
                tipo: 'CIAP',
                registros: [],
                totais: {
                    creditos: 0,
                    utilizacoes: 0,
                    saldo: 0,
                },
            };
            for (const linha of linhas) {
                if (linha.trim()) {
                    const registro = this.processarRegistroCIAP(linha);
                    if (registro) {
                        dados.registros.push(registro);
                    }
                }
            }
            return dados;
        }
        catch (error) {
            console.error('Erro ao processar CIAP', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarInventario(conteudo) {
        try {
            const linhas = conteudo.split('\n');
            const dados = {
                tipo: 'INVENTARIO',
                itens: [],
                totais: {
                    quantidade: 0,
                    valor: 0,
                },
            };
            for (const linha of linhas) {
                if (linha.trim()) {
                    const item = this.processarItemInventario(linha);
                    if (item) {
                        dados.itens.push(item);
                    }
                }
            }
            return dados;
        }
        catch (error) {
            console.error('Erro ao processar Inventário', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async processarPGDAS(conteudo) {
        try {
            const linhas = conteudo.split('\n');
            const dados = {
                tipo: 'PGDAS',
                guias: [],
                totais: {
                    receitas: 0,
                    impostos: 0,
                },
            };
            for (const linha of linhas) {
                if (linha.trim()) {
                    const guia = this.processarGuiaPGDAS(linha);
                    if (guia) {
                        dados.guias.push(guia);
                    }
                }
            }
            return dados;
        }
        catch (error) {
            console.error('Erro ao processar PGDAS', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async validarDadosComIA(dados, tipo) {
        try {
            const validacao = await (0, openai_service_1.validarDadosFiscais)(dados, tipo);
            return validacao;
        }
        catch (error) {
            console.error('Erro na validação IA', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return { success: false, error: 'Falha na validação IA' };
        }
    }
    extrairDadosXML(conteudo) {
        const dados = {
            emitente: {},
            destinatario: {},
            itens: [],
            impostos: [],
            totais: {},
        };
        const cnpjMatch = conteudo.match(/<CNPJ>([^<]+)<\/CNPJ>/);
        if (cnpjMatch) {
            dados.emitente.cnpj = cnpjMatch[1];
        }
        const valorMatch = conteudo.match(/<vNF>([^<]+)<\/vNF>/);
        if (valorMatch) {
            dados.totais.valor = parseFloat(valorMatch[1]);
        }
        return dados;
    }
    extrairDadosSPED(conteudo) {
        const linhas = conteudo.split('\n');
        const dados = {
            registros: [],
            totais: {},
        };
        for (const linha of linhas) {
            if (linha.trim()) {
                const registro = this.processarRegistroSPED(linha);
                if (registro) {
                    dados.registros.push(registro);
                }
            }
        }
        return dados;
    }
    processarRegistroSPED(linha) {
        const campos = linha.split('|');
        if (campos.length < 2)
            return null;
        const tipo = campos[1];
        switch (tipo) {
            case '0000':
                return {
                    tipo: '0000',
                    cnpj: campos[4],
                    nome: campos[5],
                    periodo: `${campos[6]}/${campos[7]}`,
                };
            case 'C100':
                return {
                    tipo: 'C100',
                    chave: campos[4],
                    data: campos[6],
                    valor: parseFloat(campos[7] || '0'),
                    cfop: campos[8],
                };
            case 'C170':
                return {
                    tipo: 'C170',
                    codigo: campos[3],
                    descricao: campos[4],
                    ncm: campos[5],
                    cfop: campos[6],
                    cst: campos[7],
                    aliquota: parseFloat(campos[8] || '0'),
                    valor: parseFloat(campos[9] || '0'),
                };
            default:
                return null;
        }
    }
    processarRegistroECD(linha) {
        const campos = linha.split('|');
        if (campos.length < 2)
            return null;
        const tipo = campos[1];
        if (tipo === 'I150') {
            return {
                tipo: 'I150',
                conta: campos[2],
                descricao: campos[3],
                saldo: parseFloat(campos[4] || '0'),
            };
        }
        return null;
    }
    processarRegistroECF(linha) {
        const campos = linha.split('|');
        if (campos.length < 2)
            return null;
        const tipo = campos[1];
        if (tipo === 'M100') {
            return {
                tipo: 'M100',
                codigo: campos[2],
                valor: parseFloat(campos[3] || '0'),
            };
        }
        return null;
    }
    processarRegistroCIAP(linha) {
        const campos = linha.split('|');
        if (campos.length < 2)
            return null;
        const tipo = campos[1];
        if (tipo === 'G001') {
            return {
                tipo: 'G001',
                codigo: campos[2],
                descricao: campos[3],
                valor: parseFloat(campos[4] || '0'),
            };
        }
        return null;
    }
    processarItemInventario(linha) {
        const campos = linha.split('|');
        if (campos.length < 3)
            return null;
        return {
            codigo: campos[0],
            descricao: campos[1],
            quantidade: parseFloat(campos[2] || '0'),
            valor: parseFloat(campos[3] || '0'),
        };
    }
    processarGuiaPGDAS(linha) {
        const campos = linha.split('|');
        if (campos.length < 3)
            return null;
        return {
            periodo: campos[0],
            receitas: parseFloat(campos[1] || '0'),
            impostos: parseFloat(campos[2] || '0'),
        };
    }
    identificarTipoXML(conteudo) {
        if (conteudo.includes('<NFe>'))
            return 'NFe';
        if (conteudo.includes('<CTe>'))
            return 'CTe';
        if (conteudo.includes('<MDFe>'))
            return 'MDFe';
        if (conteudo.includes('<NFSe>'))
            return 'NFSe';
        return 'XML';
    }
    identificarTipoSPED(conteudo) {
        if (conteudo.includes('|0000|'))
            return 'SPED Fiscal';
        if (conteudo.includes('|0001|'))
            return 'SPED Contribuições';
        return 'SPED';
    }
    generateDocumentId(arquivoPath, tipo, empresa, periodo) {
        const timestamp = Date.now();
        const hash = arquivoPath.split('/').pop()?.split('.')[0] || 'doc';
        return `${tipo}_${empresa}_${periodo}_${hash}_${timestamp}`;
    }
    async lerArquivo(arquivoPath) {
        const fs = require('fs').promises;
        return await fs.readFile(arquivoPath, 'utf-8');
    }
    async salvarNoBanco(documento) {
        console.log('Salvando documento no banco', {
            documentoId: documento.id,
            tipo: documento.tipo,
            status: documento.status,
        });
    }
    getDocumentFromCache(documentoId) {
        return {
            id: documentoId,
            tipo: 'XML',
            empresa: '',
            cnpj: '',
            periodo: '',
            dataProcessamento: new Date(),
            status: 'concluido',
            dados: {},
            erros: [],
            observacoes: 'Documento já processado anteriormente',
        };
    }
    startProcessing() {
        console.log('Processamento em background iniciado');
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            processingQueue: this.processingQueue.length,
            cacheSize: processedCache.size,
            config: PARSER_CONFIG,
        };
    }
}
exports.DocumentParserAgent = DocumentParserAgent;
exports.documentParserAgent = new DocumentParserAgent();
//# sourceMappingURL=document-parser-agent.js.map