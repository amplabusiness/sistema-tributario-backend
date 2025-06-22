/**
 * Serviço de integração com OpenAI (ChatGPT)
 * Prompts em português, fallback inteligente e rate limiting
 */

import OpenAI from 'openai';

import { formatarDataHoraBR } from '@/utils/br-utils';

// Configurações da OpenAI
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4',  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
};

// Rate limiting
const RATE_LIMIT = {  requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT || '60'),
  requestsPerHour: parseInt(process.env.OPENAI_RATE_LIMIT_HOUR || '1000'),
};

// Contadores para rate limiting
let requestsThisMinute = 0;
let requestsThisHour = 0;
let lastMinuteReset = Date.now();
let lastHourReset = Date.now();

// Instância do OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
  timeout: OPENAI_CONFIG.timeout,
});

// Tipos
export interface AIResponse {
  success: boolean;
  content: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: string;
  error?: string;
}

export interface AIPrompt {
  system: string;
  user: string;
  context?: any;
  temperature?: number;
  maxTokens?: number;
}

export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// Prompts padrão em português
const DEFAULT_PROMPTS = {
  // Análise de documentos fiscais
  ANALISE_DOCUMENTO: `Você é um especialista em analise de documentos fiscais brasileiros. 
Analise o documento fornecido e extraia as informações fiscais relevantes.
Responda sempre em português brasileiro e use formatação brasileira para datas e valores.`,

  // Validação de dados
  VALIDACAO_DADOS: `Você é um especialista em validacao de dados fiscais brasileiros.
Valide os dados fornecidos e identifique possíveis inconsistências ou erros.
Responda sempre em português brasileiro.`,

  // Geração de relatórios
  RELATORIO: `Você é um especialista em geração de relatórios fiscais brasileiros.
Gere um relatório claro e detalhado com as informações fornecidas.
Use formatação brasileira para datas, valores e percentuais.
Responda sempre em português brasileiro.`,

  // Análise de XML/SPED
  ANALISE_XML: `Você é um especialista em analise de arquivos XML e SPED brasileiros.
Analise o conteúdo XML fornecido e extraia as informações fiscais relevantes.
Identifique CST, CFOP, NCM, valores, impostos e outras informações importantes.
Responda sempre em português brasileiro.`,

  // Correção de erros
  CORRECAO: `Você é um especialista em correção de erros em documentos fiscais brasileiros.
Identifique e sugira correções para os erros encontrados.
Explique o motivo da correção e como implementá-la.
Responda sempre em português brasileiro.`,
};

/**
 * Verifica rate limiting
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset contadores se necessário
  if (now - lastMinuteReset >= 60000) {
    requestsThisMinute = 0;
    lastMinuteReset = now;
  }
  
  if (now - lastHourReset >= 3600000) {
    requestsThisHour = 0;
    lastHourReset = now;
  }
  
  // Verificar limites
  if (requestsThisMinute >= RATE_LIMIT.requestsPerMinute) {
    return false;
  }
  
  if (requestsThisHour >= RATE_LIMIT.requestsPerHour) {
    return false;
  }
  
  return true;
}

/**
 * Incrementa contadores de rate limiting
 */
function incrementRateLimit(): void {
  requestsThisMinute++;
  requestsThisHour++;
}

/**
 * Calcula custo aproximado da requisição
 */
function calculateCost(tokens: number, model: string): number {
  const costs = {
    'gpt-4': 0.03, // USD por 1K tokens
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.002,
  };
  
  const costPerToken = (costs[model as keyof typeof costs] || 0.03) / 1000;
  return tokens * costPerToken;
}

/**
 * Faz requisição para a OpenAI
 */
async function makeOpenAIRequest(
  prompt: AIPrompt,
  config: AIConfig = {}
): Promise<AIResponse> {
  const startTime = Date.now();
  
  try {
    // Verificar rate limiting
    if (!checkRateLimit()) {
      throw new Error('Rate limit excedido. Tente novamente em alguns minutos.');
    }
    
    // Verificar API key
    if (!OPENAI_CONFIG.apiKey) {
      throw new Error('Chave da API OpenAI não configurada');
    }
    
    // Configurar parâmetros
    const model = config.model || OPENAI_CONFIG.model;
    const temperature = config.temperature ?? OPENAI_CONFIG.temperature;
    const maxTokens = config.maxTokens || OPENAI_CONFIG.maxTokens;
    
    // Fazer requisição
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompt.system,
        },
        {
          role: 'user',
          content: prompt.user,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });
    
    // Processar resposta
    const response = completion.choices[0]?.message?.content || '';
    const usage = completion.usage;
    const tokens = usage?.total_tokens || 0;
    const cost = calculateCost(tokens, model);
    
    // Incrementar rate limiting
    incrementRateLimit();
    
    const duration = Date.now() - startTime;
    
    console.log('Requisição OpenAI concluída', {
      model,
      tokens,
      cost: `$${cost.toFixed(4)}`,
      duration: `${duration}ms`,
    });
    
    return {
      success: true,
      content: response,
      model,
      tokens,
      cost,
      timestamp: formatarDataHoraBR(new Date()),
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Erro na requisição OpenAI', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });
    
    return {
      success: false,
      content: '',
      model: config.model || OPENAI_CONFIG.model,
      tokens: 0,
      cost: 0,
      timestamp: formatarDataHoraBR(new Date()),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Analisa documento fiscal
 */
export async function analisarDocumentoFiscal(
  conteudo: string,
  tipoDocumento: string = 'XML'
): Promise<AIResponse> {
  const prompt: AIPrompt = {
    system: DEFAULT_PROMPTS.ANALISE_DOCUMENTO,
    user: `Analise o seguinte documento ${tipoDocumento} e extraia as informações fiscais:

${conteudo}

Por favor, forneça:
1. Tipo de documento
2. CNPJ/CPF do emitente e destinatário
3. Data de emissão
4. Valores totais
5. Impostos (ICMS, PIS, COFINS, etc.)
6. CST e CFOP
7. Observações importantes

Responda em formato JSON estruturado.`,
  };
  
  return makeOpenAIRequest(prompt);
}

/**
 * Valida dados fiscais
 */
export async function validarDadosFiscais(
  dados: any,
  tipoValidacao: string = 'geral'
): Promise<AIResponse> {
  const prompt: AIPrompt = {
    system: DEFAULT_PROMPTS.VALIDACAO_DADOS,
    user: `Valide os seguintes dados fiscais:

${JSON.stringify(dados, null, 2)}

Tipo de validacao: ${tipoValidacao}

Por favor, verifique:
1. Consistência dos dados
2. Formatação correta (CNPJ, CPF, datas, valores)
3. Regras fiscais aplicáveis
4. Possíveis erros ou inconsistências

Responda em formato JSON com os resultados da validacao.`,
  };
  
  return makeOpenAIRequest(prompt);
}

/**
 * Gera relatório fiscal
 */
export async function gerarRelatorioFiscal(
  dados: any,
  tipoRelatorio: string = 'resumo'
): Promise<AIResponse> {
  const prompt: AIPrompt = {
    system: DEFAULT_PROMPTS.RELATORIO,
    user: `Gere um relatório fiscal do tipo "${tipoRelatorio}" com os seguintes dados:

${JSON.stringify(dados, null, 2)}

O relatório deve incluir:
1. Resumo executivo
2. Análise detalhada
3. Valores e percentuais
4. Recomendações
5. Observações importantes

Use formatação brasileira para datas e valores.
Responda em português brasileiro.`,
  };
  
  return makeOpenAIRequest(prompt);
}

/**
 * Analisa arquivo XML/SPED
 */
export async function analisarXML(
  conteudoXML: string,
  tipo: 'XML' | 'SPED' = 'XML'
): Promise<AIResponse> {
  const prompt: AIPrompt = {
    system: DEFAULT_PROMPTS.ANALISE_XML,
    user: `Analise o seguinte arquivo ${tipo}:

${conteudoXML}

Extraia e organize as seguintes informações:
1. Dados do emitente e destinatário
2. Itens e produtos
3. Valores e impostos
4. CST, CFOP, NCM
5. Base de cálculo e alíquotas
6. Observações e anotações

Responda em formato JSON estruturado com todas as informações encontradas.`,
  };
  
  return makeOpenAIRequest(prompt);
}

/**
 * Corrige erros em documentos
 */
export async function corrigirErrosDocumento(
  documento: any,
  erros: string[]
): Promise<AIResponse> {
  const prompt: AIPrompt = {
    system: DEFAULT_PROMPTS.CORRECAO,
    user: `Corrija os seguintes erros no documento:

Documento:
${JSON.stringify(documento, null, 2)}

Erros identificados:
${erros.join('\n')}

Por favor:
1. Identifique a causa de cada erro
2. Sugira correções específicas
3. Explique como implementar as correções
4. Forneça o documento corrigido

Responda em formato JSON com as correções e explicações.`,
  };
  
  return makeOpenAIRequest(prompt);
}

/**
 * Requisição customizada
 */
export async function fazerRequisicaoCustomizada(
  prompt: AIPrompt,
  config: AIConfig = {}
): Promise<AIResponse> {
  return makeOpenAIRequest(prompt, config);
}

/**
 * Verifica status do serviço
 */
export async function verificarStatus(): Promise<{
  status: 'online' | 'offline' | 'error';
  message: string;
  config: any;
}> {
  try {
    if (!OPENAI_CONFIG.apiKey) {
      return {
        status: 'offline',
        message: 'Chave da API não configurada',
        config: { ...OPENAI_CONFIG, apiKey: '***' },
      };
    }
    
    // Teste simples
    const response = await makeOpenAIRequest({
      system: 'Você é um assistente útil.',
      user: 'Responda apenas "OK" se estiver funcionando.',
    }, { maxTokens: 10 });
    
    if (response.success) {
      return {
        status: 'online',
        message: 'Serviço funcionando normalmente',
        config: { ...OPENAI_CONFIG, apiKey: '***' },
      };
    } else {
      return {
        status: 'error',
        message: response.error || 'Erro desconhecido',
        config: { ...OPENAI_CONFIG, apiKey: '***' },
      };
    }
    
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      config: { ...OPENAI_CONFIG, apiKey: '***' },
    };
  }
}

/**
 * Obtém estatísticas de uso
 */
export function obterEstatisticas(): {
  requestsThisMinute: number;
  requestsThisHour: number;
  rateLimit: typeof RATE_LIMIT;
} {
  return {
    requestsThisMinute,
    requestsThisHour,
    rateLimit: RATE_LIMIT,
  };
}
