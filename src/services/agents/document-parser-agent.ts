/**
 * Agente 2: Parsing & Leitura dos Documentos
 * Leitura e parser automático de XML, SPED, ECD, ECF
 * Indexação dos dados em banco (PostgreSQL)
 * Validação de CST, CFOP, NCM, CNPJ, natureza da operação
 */


import { formatarDataBR, formatarValorBR, validarCNPJ, validarCPF } from '@/utils/br-utils';
import { analisarXML, validarDadosFiscais } from '@/services/openai-service';
import { addToQueue } from '@/services/queue';

// Tipos para documentos fiscais
export interface DocumentoFiscal {
  id: string;
  tipo: 'XML' | 'SPED' | 'ECD' | 'ECF' | 'CIAP' | 'INVENTARIO' | 'PGDAS';
  empresa: string;
  cnpj: string;
  periodo: string;
  dataProcessamento: Date;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  dados: any;
  erros: string[];
  observacoes: string;
}

export interface ItemFiscal {
  id: string;
  documentoId: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  cst: string;
  aliquota: number;
  baseCalculo: number;
  valor: number;
  quantidade: number;
  unidade: string;
  naturezaOperacao: string;
}

export interface EmitenteDestinatario {
  id: string;
  documentoId: string;
  tipo: 'emitente' | 'destinatario';
  cnpj: string;
  cpf?: string;
  nome: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
}

export interface Imposto {
  id: string;
  documentoId: string;
  itemId?: string;
  tipo: 'ICMS' | 'PIS' | 'COFINS' | 'IPI' | 'ISS' | 'IOF' | 'II' | 'ICMS_ST';
  baseCalculo: number;
  aliquota: number;
  valor: number;
  cst: string;
  cfop: string;
}

// Configurações do agente
const PARSER_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['xml', 'txt', 'csv'],
  batchSize: 10,
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
};

// Cache de documentos já processados
const processedCache = new Map<string, boolean>();

/**
 * Classe principal do Agente de Parsing
 */
export class DocumentParserAgent {
  private isRunning = false;
  private processingQueue: string[] = [];

  /**
   * Inicia o agente de parsing
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Agente de parsing já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Iniciando Agente de Parsing de Documentos', {
      config: PARSER_CONFIG,
    });

    // Iniciar processamento em background
    this.startProcessing();
  }

  /**
   * Para o agente de parsing
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Agente de Parsing parado');
  }

  /**
   * Processa um documento fiscal
   */
  async processarDocumento(
    arquivoPath: string,
    tipo: DocumentoFiscal['tipo'],
    empresa: string,
    cnpj: string,
    periodo: string
  ): Promise<DocumentoFiscal> {
    const documentoId = this.generateDocumentId(arquivoPath, tipo, empresa, periodo);

    // Verificar se já foi processado
    if (processedCache.has(documentoId)) {
      console.log('Documento já processado anteriormente', { documentoId });
      return this.getDocumentFromCache(documentoId);
    }

    // Adicionar à fila de processamento
    this.processingQueue.push(documentoId);

    const documento: DocumentoFiscal = {
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

      // Ler conteúdo do arquivo
      const conteudo = await this.lerArquivo(arquivoPath);
      
      // Validar tamanho do arquivo
      if (conteudo.length > PARSER_CONFIG.maxFileSize) {
        throw new Error(`Arquivo muito grande: ${conteudo.length} bytes`);
      }

      // Processar baseado no tipo
      const dadosProcessados = await this.processarPorTipo(conteudo, tipo);
      
      // Validar dados com IA
      const validacao = await this.validarDadosComIA(dadosProcessados, tipo);
      
      // Atualizar documento com dados processados
      documento.dados = dadosProcessados;
      documento.status = 'concluido';
      documento.observacoes = validacao.success ? 'Documento processado com sucesso' : 'Documento processado com avisos';

      // Salvar no banco de dados
      await this.salvarNoBanco(documento);

      // Adicionar ao cache
      processedCache.set(documentoId, true);

      console.log('Documento processado com sucesso', {
        documentoId,
        tipo,
        quantidadeItens: dadosProcessados.itens?.length || 0,
        quantidadeImpostos: dadosProcessados.impostos?.length || 0,
      });      // Enfileirar para próximo processamento (Agente 3: Apuração)
      await addToQueue({
        documentId: documentoId,
        userId: 'system',
        filePath: 'processed'
      });

      return documento;

    } catch (error) {
      console.error('Erro ao processar documento', {
        documentoId,
        tipo,
        empresa,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      documento.status = 'erro';
      documento.erros.push(error instanceof Error ? error.message : 'Erro desconhecido');

      // Salvar erro no banco
      await this.salvarNoBanco(documento);

      return documento;
    } finally {
      // Remover da fila de processamento
      const index = this.processingQueue.indexOf(documentoId);
      if (index > -1) {
        this.processingQueue.splice(index, 1);
      }
    }
  }

  /**
   * Processa documento baseado no tipo
   */
  private async processarPorTipo(conteudo: string, tipo: DocumentoFiscal['tipo']): Promise<any> {
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

  /**
   * Processa arquivo XML (NFe, CTe, etc.)
   */
  private async processarXML(conteudo: string): Promise<any> {
    try {
      // Usar IA para analise inicial
      const analiseIA = await analisarXML(conteudo, 'XML');
      
      if (!analiseIA.success) {
        throw new Error('Falha na analise IA do XML');
      }

      // Parse manual para extrair dados específicos
      const dados = this.extrairDadosXML(conteudo);
      
      // Combinar dados da IA com parse manual
      return {
        ...dados,
        analiseIA: analiseIA.content,
        tipoDocumento: this.identificarTipoXML(conteudo),
      };

    } catch (error) {
      console.error('Erro ao processar XML', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo SPED
   */
  private async processarSPED(conteudo: string): Promise<any> {
    try {
      // Usar IA para analise inicial
      const analiseIA = await analisarXML(conteudo, 'SPED');
      
      if (!analiseIA.success) {
        throw new Error('Falha na analise IA do SPED');
      }

      // Parse manual para extrair dados específicos
      const dados = this.extrairDadosSPED(conteudo);
      
      return {
        ...dados,
        analiseIA: analiseIA.content,
        tipoSPED: this.identificarTipoSPED(conteudo),
      };

    } catch (error) {
      console.error('Erro ao processar SPED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo ECD (Escrituração Contábil Digital)
   */
  private async processarECD(conteudo: string): Promise<any> {
    try {
      const linhas = conteudo.split('\n');
      const dados: any = {
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

    } catch (error) {
      console.error('Erro ao processar ECD', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo ECF (Escrituração Contábil Fiscal)
   */
  private async processarECF(conteudo: string): Promise<any> {
    try {
      const linhas = conteudo.split('\n');
      const dados: any = {
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

    } catch (error) {
      console.error('Erro ao processar ECF', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo CIAP (Controle de Crédito de ICMS do Ativo Permanente)
   */
  private async processarCIAP(conteudo: string): Promise<any> {
    try {
      const linhas = conteudo.split('\n');
      const dados: any = {
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

    } catch (error) {
      console.error('Erro ao processar CIAP', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo de Inventário
   */
  private async processarInventario(conteudo: string): Promise<any> {
    try {
      const linhas = conteudo.split('\n');
      const dados: any = {
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

    } catch (error) {
      console.error('Erro ao processar Inventário', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Processa arquivo PGDAS (Programa Gerador do DAS)
   */
  private async processarPGDAS(conteudo: string): Promise<any> {
    try {
      const linhas = conteudo.split('\n');
      const dados: any = {
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

    } catch (error) {
      console.error('Erro ao processar PGDAS', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Valida dados com IA
   */
  private async validarDadosComIA(dados: any, tipo: string): Promise<any> {
    try {
      const validacao = await validarDadosFiscais(dados, tipo);
      return validacao;
    } catch (error) {
      console.error('Erro na validacao IA', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, error: 'Falha na validacao IA' };
    }
  }

  /**
   * Extrai dados específicos do XML
   */
  private extrairDadosXML(conteudo: string): any {
    // Implementação básica - pode ser expandida com bibliotecas XML
    const dados: any = {
      emitente: {},
      destinatario: {},
      itens: [],
      impostos: [],
      totais: {},
    };

    // Extrair dados básicos usando regex (simplificado)
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

  /**
   * Extrai dados específicos do SPED
   */
  private extrairDadosSPED(conteudo: string): any {
    const linhas = conteudo.split('\n');
    const dados: any = {
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

  /**
   * Processa registro SPED
   */
  private processarRegistroSPED(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 2) return null;

    const tipo = campos[1];
    
    switch (tipo) {
      case '0000': // Abertura do arquivo
        return {
          tipo: '0000',
          cnpj: campos[4],
          nome: campos[5],
          periodo: `${campos[6]}/${campos[7]}`,
        };
      case 'C100': // Nota fiscal
        return {
          tipo: 'C100',
          chave: campos[4],
          data: campos[6],
          valor: parseFloat(campos[7] || '0'),
          cfop: campos[8],
        };
      case 'C170': // Item da nota
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

  /**
   * Processa registro ECD
   */
  private processarRegistroECD(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 2) return null;

    const tipo = campos[1];
    
    if (tipo === 'I150') { // Saldo das contas
      return {
        tipo: 'I150',
        conta: campos[2],
        descricao: campos[3],
        saldo: parseFloat(campos[4] || '0'),
      };
    }

    return null;
  }

  /**
   * Processa registro ECF
   */
  private processarRegistroECF(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 2) return null;

    const tipo = campos[1];
    
    if (tipo === 'M100') { // Crédito de PIS/PASEP
      return {
        tipo: 'M100',
        codigo: campos[2],
        valor: parseFloat(campos[3] || '0'),
      };
    }

    return null;
  }

  /**
   * Processa registro CIAP
   */
  private processarRegistroCIAP(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 2) return null;

    const tipo = campos[1];
    
    if (tipo === 'G001') { // Controle de CIAP
      return {
        tipo: 'G001',
        codigo: campos[2],
        descricao: campos[3],
        valor: parseFloat(campos[4] || '0'),
      };
    }

    return null;
  }

  /**
   * Processa item de inventário
   */
  private processarItemInventario(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 3) return null;

    return {
      codigo: campos[0],
      descricao: campos[1],
      quantidade: parseFloat(campos[2] || '0'),
      valor: parseFloat(campos[3] || '0'),
    };
  }

  /**
   * Processa guia PGDAS
   */
  private processarGuiaPGDAS(linha: string): any {
    const campos = linha.split('|');
    if (campos.length < 3) return null;

    return {
      periodo: campos[0],
      receitas: parseFloat(campos[1] || '0'),
      impostos: parseFloat(campos[2] || '0'),
    };
  }

  /**
   * Identifica tipo de XML
   */
  private identificarTipoXML(conteudo: string): string {
    if (conteudo.includes('<NFe>')) return 'NFe';
    if (conteudo.includes('<CTe>')) return 'CTe';
    if (conteudo.includes('<MDFe>')) return 'MDFe';
    if (conteudo.includes('<NFSe>')) return 'NFSe';
    return 'XML';
  }

  /**
   * Identifica tipo de SPED
   */
  private identificarTipoSPED(conteudo: string): string {
    if (conteudo.includes('|0000|')) return 'SPED Fiscal';
    if (conteudo.includes('|0001|')) return 'SPED Contribuições';
    return 'SPED';
  }

  /**
   * Gera ID único para documento
   */
  private generateDocumentId(arquivoPath: string, tipo: string, empresa: string, periodo: string): string {
    const timestamp = Date.now();
    const hash = arquivoPath.split('/').pop()?.split('.')[0] || 'doc';
    return `${tipo}_${empresa}_${periodo}_${hash}_${timestamp}`;
  }

  /**
   * Lê arquivo do sistema
   */
  private async lerArquivo(arquivoPath: string): Promise<string> {
    // Implementação básica - pode ser expandida
    const fs = require('fs').promises;
    return await fs.readFile(arquivoPath, 'utf-8');
  }

  /**
   * Salva documento no banco
   */
  private async salvarNoBanco(documento: DocumentoFiscal): Promise<void> {
    // Implementação básica - pode ser expandida com Prisma
    console.log('Salvando documento no banco', {
      documentoId: documento.id,
      tipo: documento.tipo,
      status: documento.status,
    });
  }

  /**
   * Obtém documento do cache
   */
  private getDocumentFromCache(documentoId: string): DocumentoFiscal {
    // Implementação básica - pode ser expandida
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

  /**
   * Inicia processamento em background
   */
  private startProcessing(): void {
    // Implementação básica - pode ser expandida
    console.log('Processamento em background iniciado');
  }

  /**
   * Obtém status do agente
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      processingQueue: this.processingQueue.length,
      cacheSize: processedCache.size,
      config: PARSER_CONFIG,
    };
  }
}

// Instância singleton do agente
export const documentParserAgent = new DocumentParserAgent();
