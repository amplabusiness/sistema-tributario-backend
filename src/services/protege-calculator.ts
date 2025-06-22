import { ProtegeRegra, ProtegeBeneficio } from './parsers/protege-pdf-parser';
import { IcmsIpiItem } from './parsers/sped-fiscal-parser';

export interface ProtegeCalculo {
  baseCalculo: number;
  tipoProtege: 'PROTEGE_15' | 'PROTEGE_2';
  aliquotaProtege: number;
  valorProtege: number;
  beneficiosAplicados?: ProtegeBeneficioAplicado[]; // Apenas para PROTEGE 15%
  totalBeneficios?: number; // Apenas para PROTEGE 15%
  valorFinal: number;
  icmsOriginal?: number; // Para PROTEGE 2%
  icmsComProtege?: number; // Para PROTEGE 2%
  mesPagamento?: string; // Para PROTEGE 2%
  mesCredito?: string; // Para PROTEGE 2%
}

export interface ProtegeBeneficioAplicado {
  beneficio: ProtegeBeneficio;
  valorBeneficio: number;
  tipoCalculo: string;
  condicoesAtendidas: boolean;
}

export interface ProtegeApuracaoResultado {
  empresaId: string;
  periodo: string;
  totalBaseCalculo: number;
  totalProtege15: number;
  totalProtege2: number;
  totalBeneficios: number;
  valorFinal: number;
  detalhes: ProtegeCalculoDetalhe[];
  // Controle de crédito cruzado PROTEGE 2%
  protege2Pagamento: number; // Valor pago no mês atual
  protege2Credito: number; // Crédito recebido do mês anterior
  saldoProtege2: number; // Saldo final (pagamento - crédito)
}

export interface ProtegeCalculoDetalhe {
  item: IcmsIpiItem;
  protegeCalculo: ProtegeCalculo;
  regraAplicada?: ProtegeRegra;
}

export class ProtegeCalculator {
  static calcularProtege(
    itens: IcmsIpiItem[], 
    regras: ProtegeRegra[], 
    empresaId: string, 
    periodo: string,
    creditoMesAnterior?: number // Crédito do mês anterior para PROTEGE 2%
  ): ProtegeApuracaoResultado {
    const detalhes: ProtegeCalculoDetalhe[] = [];
    let totalBaseCalculo = 0;
    let totalProtege15 = 0;
    let totalProtege2 = 0;
    let totalBeneficios = 0;

    for (const item of itens) {
      // Encontrar regra aplicável
      const regra = regras.find(r =>
        (!r.ncm || r.ncm === item.ncm) &&
        (!r.cfop || r.cfop === item.cfop) &&
        (!r.cst || r.cst === item.cst)
      );

      // Calcular PROTEGE
      const protegeCalculo = this.calcularProtegeItem(item, regra, periodo);
      
      totalBaseCalculo += protegeCalculo.baseCalculo;
      
      if (protegeCalculo.tipoProtege === 'PROTEGE_15') {
        totalProtege15 += protegeCalculo.valorProtege;
        totalBeneficios += protegeCalculo.totalBeneficios || 0;
      } else if (protegeCalculo.tipoProtege === 'PROTEGE_2') {
        totalProtege2 += protegeCalculo.valorProtege;
      }

      detalhes.push({
        item,
        protegeCalculo,
        regraAplicada: regra
      });
    }

    // Calcular crédito cruzado do PROTEGE 2%
    const protege2Credito = creditoMesAnterior || 0;
    const saldoProtege2 = totalProtege2 - protege2Credito;

    return {
      empresaId,
      periodo,
      totalBaseCalculo,
      totalProtege15,
      totalProtege2,
      totalBeneficios,
      valorFinal: totalProtege15 + saldoProtege2 - totalBeneficios,
      detalhes,
      protege2Pagamento: totalProtege2,
      protege2Credito,
      saldoProtege2
    };
  }

  private static calcularProtegeItem(item: IcmsIpiItem, regra?: ProtegeRegra, periodo?: string): ProtegeCalculo {
    const baseCalculo = item.baseIcms;
    
    if (!regra) {
      // Sem regra aplicável - retornar cálculo zero
      return {
        baseCalculo,
        tipoProtege: 'PROTEGE_15',
        aliquotaProtege: 0,
        valorProtege: 0,
        valorFinal: 0
      };
    }

    if (regra.tipoProtege === 'PROTEGE_15') {
      return this.calcularProtege15(item, regra);
    } else if (regra.tipoProtege === 'PROTEGE_2') {
      return this.calcularProtege2(item, regra, periodo);
    }

    // Fallback
    return {
      baseCalculo,
      tipoProtege: 'PROTEGE_15',
      aliquotaProtege: 0,
      valorProtege: 0,
      valorFinal: 0
    };
  }

  private static calcularProtege15(item: IcmsIpiItem, regra: ProtegeRegra): ProtegeCalculo {
    const baseCalculo = item.baseIcms;
    const aliquotaProtege = regra.aliquotaProtege; // 15%
    const valorProtege = baseCalculo * (aliquotaProtege / 100);
    
    const beneficiosAplicados: ProtegeBeneficioAplicado[] = [];
    let totalBeneficios = 0;

    // Aplicar benefícios condicionados ao PROTEGE 15%
    if (regra.beneficios) {
      for (const beneficio of regra.beneficios) {
        if (beneficio.ativo) {
          const beneficioCalculado = this.calcularBeneficio(item, beneficio, regra);
          beneficiosAplicados.push(beneficioCalculado);
          totalBeneficios += beneficioCalculado.valorBeneficio;
        }
      }
    }

    return {
      baseCalculo,
      tipoProtege: 'PROTEGE_15',
      aliquotaProtege,
      valorProtege,
      beneficiosAplicados,
      totalBeneficios,
      valorFinal: valorProtege - totalBeneficios
    };
  }

  private static calcularProtege2(item: IcmsIpiItem, regra: ProtegeRegra, periodo?: string): ProtegeCalculo {
    const baseCalculo = item.baseIcms;
    const aliquotaProtege = regra.aliquotaProtege; // 2%
    const icmsOriginal = item.valorIcms;
    
    // PROTEGE 2% é adicional sobre o ICMS normal
    const valorProtege = baseCalculo * (aliquotaProtege / 100);
    const icmsComProtege = icmsOriginal + valorProtege;

    // Calcular mês de pagamento e crédito
    const mesPagamento = periodo || '';
    const mesCredito = this.calcularMesCredito(periodo);

    return {
      baseCalculo,
      tipoProtege: 'PROTEGE_2',
      aliquotaProtege,
      valorProtege,
      valorFinal: valorProtege, // Valor adicional a pagar
      icmsOriginal,
      icmsComProtege,
      mesPagamento,
      mesCredito
    };
  }

  /**
   * Calcular mês de crédito (mês seguinte ao pagamento)
   */
  private static calcularMesCredito(periodo?: string): string {
    if (!periodo || periodo.length !== 6) {
      return '';
    }

    const ano = parseInt(periodo.substring(0, 4));
    const mes = parseInt(periodo.substring(4, 6));

    let novoAno = ano;
    let novoMes = mes + 1;

    if (novoMes > 12) {
      novoMes = 1;
      novoAno = ano + 1;
    }

    return `${novoAno.toString().padStart(4, '0')}${novoMes.toString().padStart(2, '0')}`;
  }

  /**
   * Calcular crédito do PROTEGE 2% para o mês atual
   */
  static calcularCreditoProtege2(
    itens: IcmsIpiItem[], 
    regras: ProtegeRegra[], 
    periodo: string
  ): number {
    let totalCredito = 0;

    for (const item of itens) {
      // Encontrar regra PROTEGE 2% aplicável
      const regra = regras.find(r =>
        r.tipoProtege === 'PROTEGE_2' &&
        (!r.ncm || r.ncm === item.ncm) &&
        (!r.cfop || r.cfop === item.cfop) &&
        (!r.cst || r.cst === item.cst)
      );

      if (regra && this.verificarProdutoProtege2(item, regra)) {
        // Crédito é 2% sobre a base de cálculo
        const credito = item.baseIcms * (regra.aliquotaProtege / 100);
        totalCredito += credito;
      }
    }

    return totalCredito;
  }

  /**
   * Gerar relatório de crédito cruzado do PROTEGE 2%
   */
  static gerarRelatorioCreditoCruzado(
    resultados: ProtegeApuracaoResultado[],
    periodoInicio: string,
    periodoFim: string
  ): any {
    const relatorio = {
      periodoInicio,
      periodoFim,
      totalPeriodos: resultados.length,
      resumo: {
        totalPagamentos: 0,
        totalCreditos: 0,
        saldoAcumulado: 0
      },
      detalhesPorPeriodo: [] as any[]
    };

    for (const resultado of resultados) {
      relatorio.resumo.totalPagamentos += resultado.protege2Pagamento;
      relatorio.resumo.totalCreditos += resultado.protege2Credito;
      relatorio.resumo.saldoAcumulado += resultado.saldoProtege2;

      relatorio.detalhesPorPeriodo.push({
        periodo: resultado.periodo,
        pagamento: resultado.protege2Pagamento,
        credito: resultado.protege2Credito,
        saldo: resultado.saldoProtege2,
        mesCredito: this.calcularMesCredito(resultado.periodo)
      });
    }

    return relatorio;
  }

  private static calcularBeneficio(
    item: IcmsIpiItem, 
    beneficio: ProtegeBeneficio, 
    regra: ProtegeRegra
  ): ProtegeBeneficioAplicado {
    let valorBeneficio = 0;
    let tipoCalculo = '';
    let condicoesAtendidas = this.verificarCondicoes(beneficio, item, regra);

    if (condicoesAtendidas) {
      switch (beneficio.tipo) {
        case 'BASE_REDUZIDA':
          if (beneficio.baseReduzida && beneficio.aliquota) {
            const baseReduzida = item.baseIcms * (beneficio.baseReduzida / 100);
            valorBeneficio = baseReduzida * (beneficio.aliquota / 100);
            tipoCalculo = `Base Reduzida ${beneficio.baseReduzida}% - Alíquota ${beneficio.aliquota}%`;
          }
          break;

        case 'CREDITO_OUTORGADO':
          if (beneficio.aliquota) {
            valorBeneficio = item.baseIcms * (beneficio.aliquota / 100);
            tipoCalculo = `Crédito Outorgado ${beneficio.aliquota}%`;
          }
          break;

        case 'DIFAL':
          // DIFAL - Diferencial de Alíquotas (simplificado)
          valorBeneficio = item.valorIcms * 0.4; // 40% do ICMS como exemplo
          tipoCalculo = 'DIFAL - 40% do ICMS';
          break;

        case 'CIAP':
          // CIAP - Crédito de ICMS sobre Ativo Permanente
          valorBeneficio = item.valorIcms * 0.1; // 10% do ICMS como exemplo
          tipoCalculo = 'CIAP - 10% do ICMS';
          break;

        default:
          valorBeneficio = 0;
          tipoCalculo = 'Benefício não calculado';
      }
    }

    return {
      beneficio,
      valorBeneficio,
      tipoCalculo,
      condicoesAtendidas
    };
  }

  private static verificarCondicoes(
    beneficio: ProtegeBeneficio, 
    item: IcmsIpiItem, 
    regra: ProtegeRegra
  ): boolean {
    // Verificar se as condições do benefício são atendidas
    // Implementação simplificada - em produção seria mais robusta
    
    for (const condicao of beneficio.condicoes) {
      if (condicao.includes('PROTEGE 15% ativo')) {
        // Verificar se empresa está no PROTEGE 15%
        // Por enquanto, assumir que está ativo
        continue;
      }
      
      if (condicao.includes('cesta básica')) {
        // Verificar se produto é da cesta básica
        // Implementar lógica específica
        continue;
      }
      
      if (condicao.includes('Medicamentos')) {
        // Verificar se produto é medicamento
        // Implementar lógica específica
        continue;
      }
      
      if (condicao.includes('Investimentos')) {
        // Verificar se é investimento
        // Implementar lógica específica
        continue;
      }
    }

    return true; // Por enquanto, assumir que todas as condições são atendidas
  }

  /**
   * Validar elegibilidade da empresa para o PROTEGE
   */
  static validarElegibilidade(empresaId: string, regras: ProtegeRegra[]): boolean {
    // Implementar validacao de elegibilidade
    // Verificar se empresa está estabelecida em Goiás
    // Verificar se está em dia com as obrigações
    // Verificar se tem adesão ao programa
    
    return true; // Por enquanto, assumir elegível
  }

  /**
   * Verificar se produto é aplicável ao PROTEGE 2%
   */
  static verificarProdutoProtege2(item: IcmsIpiItem, regra: ProtegeRegra): boolean {
    if (regra.tipoProtege !== 'PROTEGE_2' || !regra.produtosAplicaveis) {
      return false;
    }

    // Verificar se o produto está na lista de produtos aplicáveis
    const descricaoItem = item.produto.toLowerCase();
    
    return regra.produtosAplicaveis.some(produto => 
      descricaoItem.includes(produto.toLowerCase())
    );
  }

  /**
   * Gerar relatório de benefícios aplicados
   */
  static gerarRelatorioBeneficios(resultado: ProtegeApuracaoResultado): any {
    const beneficiosPorTipo = new Map<string, number>();
    const protegePorTipo = {
      PROTEGE_15: 0,
      PROTEGE_2: 0
    };
    
    for (const detalhe of resultado.detalhes) {
      // Contar benefícios (apenas PROTEGE 15%)
      if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_15' && detalhe.protegeCalculo.beneficiosAplicados) {
        for (const beneficio of detalhe.protegeCalculo.beneficiosAplicados) {
          const tipo = beneficio.beneficio.tipo;
          beneficiosPorTipo.set(tipo, (beneficiosPorTipo.get(tipo) || 0) + beneficio.valorBeneficio);
        }
      }

      // Contar valores por tipo de PROTEGE
      if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_15') {
        protegePorTipo.PROTEGE_15 += detalhe.protegeCalculo.valorProtege;
      } else if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_2') {
        protegePorTipo.PROTEGE_2 += detalhe.protegeCalculo.valorProtege;
      }
    }

    return {
      periodo: resultado.periodo,
      totalProtege15: resultado.totalProtege15,
      totalProtege2: resultado.totalProtege2,
      totalBeneficios: resultado.totalBeneficios,
      valorFinal: resultado.valorFinal,
      beneficiosPorTipo: Object.fromEntries(beneficiosPorTipo),
      protegePorTipo,
      quantidadeItens: resultado.detalhes.length,
      // Informações de crédito cruzado
      protege2Pagamento: resultado.protege2Pagamento,
      protege2Credito: resultado.protege2Credito,
      saldoProtege2: resultado.saldoProtege2
    };
  }
} 