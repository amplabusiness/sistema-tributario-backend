import fs from 'fs';
import path from 'path';

export interface ProtegeBeneficio {
  codigo: string;
  descricao: string;
  tipo: 'BASE_REDUZIDA' | 'CREDITO_OUTORGADO' | 'DIFAL' | 'CIAP' | 'OUTROS';
  aliquota?: number;
  baseReduzida?: number;
  condicoes: string[];
  ativo: boolean;
}

export interface ProtegeRegra {
  ncm?: string;
  cfop?: string;
  cst?: string;
  descricao: string;
  tipoProtege: 'PROTEGE_15' | 'PROTEGE_2'; // 15% normal ou 2% adicional
  aliquotaProtege: number; // 15% ou 2%
  beneficios?: ProtegeBeneficio[]; // Apenas para PROTEGE 15%
  condicoesElegibilidade: string[];
  produtosAplicaveis?: string[]; // Para PROTEGE 2% - produtos específicos
}

export class ProtegePdfParser {
  static parseProtegeGoias(filePath: string): ProtegeRegra[] {
    // Implementação básica - em produção usar biblioteca como pdf-parse
    const content = this.extractTextFromPdf(filePath);
    return this.parseProtegeContent(content);
  }

  static parseProtege2Percent(filePath: string): ProtegeRegra[] {
    const content = this.extractTextFromPdf(filePath);
    return this.parseProtege2PercentContent(content);
  }

  static parseGuiaPratico(filePath: string): ProtegeBeneficio[] {
    const content = this.extractTextFromPdf(filePath);
    return this.parseBeneficiosContent(content);
  }

  static parseManualAuditoria(filePath: string): any {
    const content = this.extractTextFromPdf(filePath);
    return this.parseManualContent(content);
  }

  private static extractTextFromPdf(filePath: string): string {
    // Simulação de extração de texto do PDF
    // Em produção, usar biblioteca como pdf-parse ou similar
    try {
      // Por enquanto, retornar conteúdo simulado baseado no nome do arquivo
      const filename = path.basename(filePath).toLowerCase();
      
      if (filename.includes('protege goias') && !filename.includes('2%')) {
        return this.getProtegeGoiasContent();
      } else if (filename.includes('2%')) {
        return this.getProtege2PercentContent();
      } else if (filename.includes('guia')) {
        return this.getGuiaPraticoContent();
      } else if (filename.includes('manual')) {
        return this.getManualAuditoriaContent();
      }
      
      return '';
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      return '';
    }
  }

  private static parseProtegeContent(content: string): ProtegeRegra[] {
    const regras: ProtegeRegra[] = [];
    
    // PROTEGE 15% - Regime normal com benefícios fiscais
    regras.push({
      descricao: 'PROTEGE 15% - Regime Normal com Benefícios Fiscais',
      tipoProtege: 'PROTEGE_15',
      aliquotaProtege: 15.0,
      beneficios: [
        {
          codigo: 'BR001',
          descricao: 'Base Reduzida de ICMS - 7%',
          tipo: 'BASE_REDUZIDA',
          aliquota: 7.0,
          condicoes: ['Adesão ao PROTEGE 15%', 'Pagamento em dia'],
          ativo: true
        },
        {
          codigo: 'CO001',
          descricao: 'Crédito Outorgado - 25%',
          tipo: 'CREDITO_OUTORGADO',
          aliquota: 25.0,
          condicoes: ['Adesão ao PROTEGE 15%', 'Documentação comprobatória'],
          ativo: true
        },
        {
          codigo: 'DIFAL001',
          descricao: 'DIFAL - Diferencial de Alíquotas',
          tipo: 'DIFAL',
          condicoes: ['Adesão ao PROTEGE 15%', 'Operações interestaduais'],
          ativo: true
        },
        {
          codigo: 'CIAP001',
          descricao: 'CIAP - Crédito de ICMS sobre Ativo Permanente',
          tipo: 'CIAP',
          condicoes: ['Adesão ao PROTEGE 15%', 'Aquisição de ativo permanente'],
          ativo: true
        }
      ],
      condicoesElegibilidade: [
        'Empresa estabelecida em Goiás',
        'Adesão ao programa PROTEGE 15%',
        'Utilização de benefícios fiscais',
        'Pagamento em dia das obrigações',
        'Documentação em conformidade'
      ]
    });

    return regras;
  }

  private static parseProtege2PercentContent(content: string): ProtegeRegra[] {
    const regras: ProtegeRegra[] = [];
    
    // PROTEGE 2% - Adicional sobre ICMS para produtos específicos
    regras.push({
      descricao: 'PROTEGE 2% - Adicional sobre ICMS para Produtos Específicos',
      tipoProtege: 'PROTEGE_2',
      aliquotaProtege: 2.0,
      produtosAplicaveis: [
        'Produtos de beleza e cosméticos',
        'Tocador de beleza',
        'Produtos de higiene pessoal',
        'Perfumes e fragrâncias',
        'Produtos de maquiagem',
        'Acessórios de beleza',
        'Produtos para cabelo',
        'Produtos para pele'
      ],
      condicoesElegibilidade: [
        'Empresa estabelecida em Goiás',
        'Produtos enquadrados na legislação',
        'ICMS normal aplicado',
        'Documentação em conformidade'
      ]
    });

    return regras;
  }

  private static parseBeneficiosContent(content: string): ProtegeBeneficio[] {
    const beneficios: ProtegeBeneficio[] = [];
    
    // Benefícios fiscais do Guia Prático (apenas para PROTEGE 15%)
    beneficios.push(
      {
        codigo: 'BR001',
        descricao: 'Base Reduzida de ICMS - Produtos da Cesta Básica',
        tipo: 'BASE_REDUZIDA',
        aliquota: 7.0,
        baseReduzida: 60.0,
        condicoes: ['PROTEGE 15% ativo', 'Produtos da cesta básica'],
        ativo: true
      },
      {
        codigo: 'BR002',
        descricao: 'Base Reduzida de ICMS - Medicamentos',
        tipo: 'BASE_REDUZIDA',
        aliquota: 7.0,
        baseReduzida: 50.0,
        condicoes: ['PROTEGE 15% ativo', 'Medicamentos essenciais'],
        ativo: true
      },
      {
        codigo: 'CO001',
        descricao: 'Crédito Outorgado - Investimentos',
        tipo: 'CREDITO_OUTORGADO',
        aliquota: 25.0,
        condicoes: ['PROTEGE 15% ativo', 'Investimentos em máquinas e equipamentos'],
        ativo: true
      },
      {
        codigo: 'CO002',
        descricao: 'Crédito Outorgado - Inovação Tecnológica',
        tipo: 'CREDITO_OUTORGADO',
        aliquota: 30.0,
        condicoes: ['PROTEGE 15% ativo', 'Projetos de inovação tecnológica'],
        ativo: true
      },
      {
        codigo: 'DIFAL001',
        descricao: 'DIFAL - Operações Interestaduais',
        tipo: 'DIFAL',
        condicoes: ['PROTEGE 15% ativo', 'Operações com outros estados'],
        ativo: true
      },
      {
        codigo: 'CIAP001',
        descricao: 'CIAP - Ativo Permanente',
        tipo: 'CIAP',
        condicoes: ['PROTEGE 15% ativo', 'Aquisição de ativo permanente'],
        ativo: true
      }
    );

    return beneficios;
  }

  private static parseManualContent(content: string): any {
    // Manual de auditoria - regras de fiscalização
    return {
      regrasAuditoria: [
        'Verificação de adesão ao PROTEGE 15% ou 2%',
        'Controle de pagamentos',
        'Documentação comprobatória',
        'Fiscalização de benefícios (PROTEGE 15%)',
        'Verificação de produtos (PROTEGE 2%)',
        'Auditoria de cálculos'
      ],
      penalidades: [
        'Multa por inadimplência',
        'Suspensão de benefícios',
        'Exclusão do programa'
      ]
    };
  }

  // Conteúdos simulados dos PDFs
  private static getProtegeGoiasContent(): string {
    return `
    PROGRAMA DE RECUPERAÇÃO DE TRIBUTOS ESTADUAIS DE GOIÁS - PROTEGE 15%
    Alíquota: 15% sobre base de cálculo
    Aplicação: Quando empresa utiliza benefícios fiscais
    Benefícios: Base reduzida, Crédito outorgado, DIFAL, CIAP
    Condições: Adesão ao programa, pagamento em dia, uso de benefícios
    `;
  }

  private static getProtege2PercentContent(): string {
    return `
    PROTEGE 2% - ADICIONAL SOBRE ICMS
    Alíquota: 2% adicional sobre ICMS normal
    Aplicação: Produtos específicos (beleza, cosméticos, etc.)
    Exemplo: ICMS 19% + 2% = 21% total
    Produtos: Tocador de beleza, cosméticos, perfumes
    `;
  }

  private static getGuiaPraticoContent(): string {
    return `
    GUIA PRÁTICO - BENEFÍCIOS FISCAIS (PROTEGE 15%)
    Base Reduzida: Produtos da cesta básica (60%), Medicamentos (50%)
    Crédito Outorgado: Investimentos (25%), Inovação (30%)
    DIFAL: Operações interestaduais
    CIAP: Ativo permanente
    Aplicável apenas ao PROTEGE 15%
    `;
  }

  private static getManualAuditoriaContent(): string {
    return `
    MANUAL DE AUDITORIA - SEFAZ GOIÁS
    Regras de fiscalização do PROTEGE 15% e 2%
    Controles e penalidades
    Documentação necessária
    Verificação de produtos (PROTEGE 2%)
    `;
  }
} 