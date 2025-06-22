import { ProtegePdfParser, ProtegeRegra, ProtegeBeneficio } from './parsers/protege-pdf-parser';
import { ProtegeCalculator, ProtegeApuracaoResultado } from './protege-calculator';
import { SpedFiscalParser, IcmsIpiItem } from './parsers/sped-fiscal-parser';
import { DocumentProcessor } from './document-processor';
import { EmpresaService } from './empresa-service';
import { CacheService } from './cache';
import { logInfo, logError } from '../utils/logger';

export interface ProtegeConfiguracao {
  empresaId: string;
  regras: ProtegeRegra[];
  beneficios: ProtegeBeneficio[];
  ativo: boolean;
  dataInicio: Date;
  dataFim?: Date;
}

export interface ProtegeResultado {
  id: string;
  empresaId: string;
  periodo: string;
  configuracao: ProtegeConfiguracao;
  resultado: ProtegeApuracaoResultado;
  dataCalculo: Date;
  status: 'PENDENTE' | 'CALCULADO' | 'ERRO';
  erro?: string;
}

export class ProtegeService {
  private static cache = new CacheService();

  /**
   * Processar PDFs do PROTEGE e extrair regras
   */
  static async processarPdfsProtege(
    empresaId: string,
    arquivos: { nome: string; caminho: string }[]
  ): Promise<ProtegeConfiguracao> {
    try {
      const regras: ProtegeRegra[] = [];
      const beneficios: ProtegeBeneficio[] = [];

      for (const arquivo of arquivos) {
        logInfo(`Processando arquivo PROTEGE: ${arquivo.nome}`);

        if (arquivo.nome.toLowerCase().includes('protege goias') && !arquivo.nome.includes('2%')) {
          const regrasProtege = ProtegePdfParser.parseProtegeGoias(arquivo.caminho);
          regras.push(...regrasProtege);
        } else if (arquivo.nome.toLowerCase().includes('2%')) {
          const regras2Percent = ProtegePdfParser.parseProtege2Percent(arquivo.caminho);
          regras.push(...regras2Percent);
        } else if (arquivo.nome.toLowerCase().includes('guia')) {
          const beneficiosGuia = ProtegePdfParser.parseGuiaPratico(arquivo.caminho);
          beneficios.push(...beneficiosGuia);
        }
      }

      const configuracao: ProtegeConfiguracao = {
        empresaId,
        regras,
        beneficios,
        ativo: true,
        dataInicio: new Date()
      };

      // Salvar configuracao no cache
      await this.cache.set(`protege:config:${empresaId}`, configuracao, 3600);

      logInfo(`Configuração PROTEGE processada para empresa ${empresaId}: ${regras.length} regras, ${beneficios.length} benefícios`);

      return configuracao;
    } catch (error) {
      logError('Erro ao processar PDFs do PROTEGE:', error);
      throw new Error(`Erro ao processar PDFs do PROTEGE: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcular PROTEGE para empresa e período
   */
  static async calcularProtege(
    empresaId: string,
    periodo: string,
    configuracao?: ProtegeConfiguracao
  ): Promise<ProtegeResultado> {
    try {      // Buscar configuracao se não fornecida
      if (!configuracao) {
        const cachedConfig = await this.cache.get<ProtegeConfiguracao>(`protege:config:${empresaId}`);
        if (!cachedConfig) {
          throw new Error('Configuração PROTEGE não encontrada para a empresa');
        }
        configuracao = cachedConfig;
      }

      // Verificar elegibilidade
      if (!ProtegeCalculator.validarElegibilidade(empresaId, configuracao.regras)) {
        throw new Error('Empresa não elegível para o PROTEGE');
      }

      // Buscar dados SPED Fiscal da empresa e período
      const dadosSped = await this.buscarDadosSpedFiscal(empresaId, periodo);
      if (!dadosSped || dadosSped.length === 0) {
        throw new Error('Dados SPED Fiscal não encontrados para o período');
      }

      // Buscar crédito do mês anterior para PROTEGE 2%
      const creditoMesAnterior = await this.buscarCreditoMesAnterior(empresaId, periodo);

      // Calcular PROTEGE
      const resultado = ProtegeCalculator.calcularProtege(
        dadosSped,
        configuracao.regras,
        empresaId,
        periodo,
        creditoMesAnterior
      );

      const protegeResultado: ProtegeResultado = {
        id: `protege_${empresaId}_${periodo}_${Date.now()}`,
        empresaId,
        periodo,
        configuracao,
        resultado,
        dataCalculo: new Date(),
        status: 'CALCULADO'
      };

      // Salvar resultado no cache
      await this.cache.set(`protege:resultado:${empresaId}:${periodo}`, protegeResultado, 7200);

      // Salvar pagamento do PROTEGE 2% para crédito no próximo mês
      if (resultado.protege2Pagamento > 0) {
        await this.salvarPagamentoProtege2(empresaId, periodo, resultado.protege2Pagamento);
      }

      logInfo(`PROTEGE calculado para empresa ${empresaId}, período ${periodo}: R$ ${resultado.valorFinal.toFixed(2)}`, {
        protege15: resultado.totalProtege15,
        protege2: resultado.totalProtege2,
        beneficios: resultado.totalBeneficios,
        creditoMesAnterior,
        saldoProtege2: resultado.saldoProtege2
      });

      return protegeResultado;
    } catch (error) {
      logError('Erro ao calcular PROTEGE:', error);
      
      const resultadoErro: ProtegeResultado = {
        id: `protege_${empresaId}_${periodo}_${Date.now()}`,
        empresaId,
        periodo,
        configuracao: configuracao || { empresaId, regras: [], beneficios: [], ativo: false, dataInicio: new Date() },
        resultado: {
          empresaId,
          periodo,
          totalBaseCalculo: 0,
          totalProtege15: 0,
          totalProtege2: 0,
          totalBeneficios: 0,
          valorFinal: 0,
          detalhes: [],
          protege2Pagamento: 0,
          protege2Credito: 0,
          saldoProtege2: 0
        },
        dataCalculo: new Date(),
        status: 'ERRO',
        erro: error instanceof Error ? error.message : 'Unknown error'
      };

      return resultadoErro;
    }
  }

  /**
   * Buscar crédito do mês anterior para PROTEGE 2%
   */
  private static async buscarCreditoMesAnterior(empresaId: string, periodo: string): Promise<number> {
    try {
      const mesAnterior = this.calcularMesAnterior(periodo);
      const pagamentoMesAnterior = await this.cache.get<number>(`protege:pagamento2:${empresaId}:${mesAnterior}`);
      
      return pagamentoMesAnterior || 0;
    } catch (error) {
      logError('Erro ao buscar crédito do mês anterior:', error);
      return 0;
    }
  }

  /**
   * Salvar pagamento do PROTEGE 2% para crédito no próximo mês
   */
  private static async salvarPagamentoProtege2(empresaId: string, periodo: string, valor: number): Promise<void> {
    try {
      await this.cache.set(`protege:pagamento2:${empresaId}:${periodo}`, valor, 2592000); // 30 dias
      logInfo(`Pagamento PROTEGE 2% salvo para crédito futuro`, { empresaId, periodo, valor });
    } catch (error) {
      logError('Erro ao salvar pagamento PROTEGE 2%:', error);
    }
  }

  /**
   * Calcular mês anterior
   */
  private static calcularMesAnterior(periodo: string): string {
    if (!periodo || periodo.length !== 6) {
      return '';
    }

    const ano = parseInt(periodo.substring(0, 4));
    const mes = parseInt(periodo.substring(4, 6));

    let anoAnterior = ano;
    let mesAnterior = mes - 1;

    if (mesAnterior < 1) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }

    return `${anoAnterior.toString().padStart(4, '0')}${mesAnterior.toString().padStart(2, '0')}`;
  }

  /**
   * Buscar dados SPED Fiscal da empresa e período
   */
  private static async buscarDadosSpedFiscal(empresaId: string, periodo: string): Promise<IcmsIpiItem[]> {
    try {
      // Buscar documentos SPED Fiscal processados
      const documentos = await this.buscarDocumentosPorTipo(
        empresaId,
        'SPED_FISCAL',
        periodo
      );

      const itens: IcmsIpiItem[] = [];

      for (const documento of documentos) {
        if (documento.dadosExtraidos && documento.dadosExtraidos.itens) {
          itens.push(...documento.dadosExtraidos.itens);
        }
      }

      return itens;
    } catch (error) {
      logError('Erro ao buscar dados SPED Fiscal:', error);
      return [];
    }
  }

  /**
   * Buscar documentos por tipo e período
   */
  private static async buscarDocumentosPorTipo(empresaId: string, tipo: string, periodo: string): Promise<any[]> {
    try {
      // Implementação simplificada - em produção buscar do banco de dados
      // Por enquanto, retornar array vazio
      return [];
    } catch (error) {
      logError('Erro ao buscar documentos por tipo:', error);
      return [];
    }
  }

  /**
   * Buscar resultado do PROTEGE
   */
  static async buscarResultado(empresaId: string, periodo: string): Promise<ProtegeResultado | null> {
    try {
      return await this.cache.get<ProtegeResultado>(`protege:resultado:${empresaId}:${periodo}`);
    } catch (error) {
      logError('Erro ao buscar resultado PROTEGE:', error);
      return null;
    }
  }

  /**
   * Listar resultados do PROTEGE por empresa
   */
  static async listarResultados(empresaId: string): Promise<ProtegeResultado[]> {
    try {
      // Buscar todos os resultados da empresa no cache
      const chaves = await this.buscarChavesCache(`protege:resultado:${empresaId}:*`);
      const resultados: ProtegeResultado[] = [];

      for (const chave of chaves) {
        const resultado = await this.cache.get<ProtegeResultado>(chave);
        if (resultado) {
          resultados.push(resultado);
        }
      }

      return resultados.sort((a, b) => b.dataCalculo.getTime() - a.dataCalculo.getTime());
    } catch (error) {
      logError('Erro ao listar resultados PROTEGE:', error);
      return [];
    }
  }

  /**
   * Buscar chaves do cache por padrão
   */
  private static async buscarChavesCache(pattern: string): Promise<string[]> {
    try {
      // Implementação simplificada - em produção usar SCAN do Redis
      // Por enquanto, retornar array vazio
      return [];
    } catch (error) {
      logError('Erro ao buscar chaves do cache:', error);
      return [];
    }
  }

  /**
   * Gerar relatório consolidado do PROTEGE
   */
  static async gerarRelatorioConsolidado(empresaId: string, periodoInicio: string, periodoFim: string): Promise<any> {
    try {
      const resultados = await this.listarResultados(empresaId);
      const resultadosFiltrados = resultados.filter(r => 
        r.periodo >= periodoInicio && r.periodo <= periodoFim && r.status === 'CALCULADO'
      );

      const consolidado = {
        empresaId,
        periodoInicio,
        periodoFim,
        totalPeriodos: resultadosFiltrados.length,
        totalBaseCalculo: 0,
        totalProtege15: 0,
        totalProtege2: 0,
        totalBeneficios: 0,
        valorFinal: 0,        beneficiosPorTipo: {} as Record<string, number>,
        detalhesPorPeriodo: [] as Array<{
          periodo: string;
          baseCalculo: number;
          protege15: number;
          protege2: number;
          beneficios: number;
          valorFinal: number;
          protege2Pagamento: number;
          protege2Credito: number;
          saldoProtege2: number;
        }>
      };

      for (const resultado of resultadosFiltrados) {
        consolidado.totalBaseCalculo += resultado.resultado.totalBaseCalculo;
        consolidado.totalProtege15 += resultado.resultado.totalProtege15;
        consolidado.totalProtege2 += resultado.resultado.totalProtege2;
        consolidado.totalBeneficios += resultado.resultado.totalBeneficios;
        consolidado.valorFinal += resultado.resultado.valorFinal;

        // Consolidar benefícios por tipo
        const relatorioBeneficios = ProtegeCalculator.gerarRelatorioBeneficios(resultado.resultado);
        for (const [tipo, valor] of Object.entries(relatorioBeneficios.beneficiosPorTipo)) {
          consolidado.beneficiosPorTipo[tipo] = (consolidado.beneficiosPorTipo[tipo] || 0) + (valor as number);
        }

        consolidado.detalhesPorPeriodo.push({
          periodo: resultado.periodo,
          baseCalculo: resultado.resultado.totalBaseCalculo,
          protege15: resultado.resultado.totalProtege15,
          protege2: resultado.resultado.totalProtege2,
          beneficios: resultado.resultado.totalBeneficios,
          valorFinal: resultado.resultado.valorFinal,
          protege2Pagamento: resultado.resultado.protege2Pagamento,
          protege2Credito: resultado.resultado.protege2Credito,
          saldoProtege2: resultado.resultado.saldoProtege2
        });
      }

      return consolidado;
    } catch (error) {
      logError('Erro ao gerar relatório consolidado PROTEGE:', error);
      throw new Error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gerar relatório de crédito cruzado do PROTEGE 2%
   */
  static async gerarRelatorioCreditoCruzado(empresaId: string, periodoInicio: string, periodoFim: string): Promise<any> {
    try {
      const resultados = await this.listarResultados(empresaId);
      const resultadosFiltrados = resultados.filter(r => 
        r.periodo >= periodoInicio && r.periodo <= periodoFim && r.status === 'CALCULADO'
      );

      const relatorio = ProtegeCalculator.gerarRelatorioCreditoCruzado(
        resultadosFiltrados.map(r => r.resultado),
        periodoInicio,
        periodoFim
      );

      return {
        empresaId,
        ...relatorio
      };
    } catch (error) {
      logError('Erro ao gerar relatório de crédito cruzado:', error);
      throw new Error(`Erro ao gerar relatório de crédito cruzado: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Atualizar configuracao do PROTEGE
   */
  static async atualizarConfiguracao(empresaId: string, configuracao: Partial<ProtegeConfiguracao>): Promise<ProtegeConfiguracao> {
    try {
      const configAtual = await this.cache.get<ProtegeConfiguracao>(`protege:config:${empresaId}`);
      const novaConfig: ProtegeConfiguracao = configAtual ? { ...configAtual, ...configuracao } : {
        empresaId,
        regras: [],
        beneficios: [],
        ativo: false,
        dataInicio: new Date(),
        ...configuracao
      };

      await this.cache.set(`protege:config:${empresaId}`, novaConfig, 3600);

      logInfo(`Configuração PROTEGE atualizada para empresa ${empresaId}`);

      return novaConfig;
    } catch (error) {
      logError('Erro ao atualizar configuracao PROTEGE:', error);
      throw new Error(`Erro ao atualizar configuracao: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 