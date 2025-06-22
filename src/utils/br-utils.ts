/**
 * Utilitários para formatação brasileira
 * Datas, valores monetários e localização
 */

// Configurações de localização brasileira
const BR_LOCALE = 'pt-BR';
const BR_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata data para padrão brasileiro (DD/MM/AAAA)
 */
export function formatarDataBR(data: Date | string | number): string {
  const date = new Date(data);
  
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }
  
  return date.toLocaleDateString(BR_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BR_TIMEZONE,
  });
}

/**
 * Formata data e hora para padrão brasileiro (DD/MM/AAAA HH:mm:ss)
 */
export function formatarDataHoraBR(data: Date | string | number): string {
  const date = new Date(data);
  
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }
  
  return date.toLocaleString(BR_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: BR_TIMEZONE,
  });
}

/**
 * Formata valor monetário para Real brasileiro (R$ 1.234,56)
 */
export function formatarValorBR(valor: number, decimais: number = 2): string {
  return new Intl.NumberFormat(BR_LOCALE, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor);
}

/**
 * Formata valor monetário sem símbolo da moeda (1.234,56)
 */
export function formatarNumeroBR(valor: number, decimais: number = 2): string {
  return new Intl.NumberFormat(BR_LOCALE, {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor);
}

/**
 * Converte string de valor brasileiro para número
 * Ex: "1.234,56" -> 1234.56
 */
export function parseValorBR(valorStr: string): number {
  // Remove símbolos de moeda e espaços
  const limpo = valorStr.replace(/[R$\s]/g, '');
  
  // Substitui vírgula por ponto para conversão
  const numeroStr = limpo.replace(/\./g, '').replace(',', '.');
  
  const numero = parseFloat(numeroStr);
  
  if (isNaN(numero)) {
    throw new Error('Valor inválido');
  }
  
  return numero;
}

/**
 * Formata percentual brasileiro (12,34%)
 */
export function formatarPercentualBR(valor: number, decimais: number = 2): string {
  return new Intl.NumberFormat(BR_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  }).format(valor / 100);
}

/**
 * Obtém nome do mês em português
 */
export function obterNomeMesBR(data: Date | string | number): string {
  const date = new Date(data);
  
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }
  
  return date.toLocaleDateString(BR_LOCALE, {
    month: 'long',
    timeZone: BR_TIMEZONE,
  });
}

/**
 * Obtém nome do dia da semana em português
 */
export function obterNomeDiaSemanaBR(data: Date | string | number): string {
  const date = new Date(data);
  
  if (isNaN(date.getTime())) {
    throw new Error('Data inválida');
  }
  
  return date.toLocaleDateString(BR_LOCALE, {
    weekday: 'long',
    timeZone: BR_TIMEZONE,
  });
}

/**
 * Verifica se uma data é válida
 */
export function isDataValida(data: Date | string | number): boolean {
  const date = new Date(data);
  return !isNaN(date.getTime());
}

/**
 * Obtém data atual no timezone brasileiro
 */
export function obterDataAtualBR(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BR_TIMEZONE }));
}

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 */
export function formatarCNPJ(cnpj: string): string {
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  
  if (numeros.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos');
  }
  
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF (XXX.XXX.XXX-XX)
 */
export function formatarCPF(cpf: string): string {
  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');
  
  if (numeros.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }
  
  return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Formata telefone brasileiro
 */
export function formatarTelefoneBR(telefone: string): string {
  // Remove caracteres não numéricos
  const numeros = telefone.replace(/\D/g, '');
  
  if (numeros.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (numeros.length === 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  } else {
    throw new Error('Telefone deve ter 10 ou 11 dígitos');
  }
}

/**
 * Formata CEP (XXXXX-XXX)
 */
export function formatarCEP(cep: string): string {
  // Remove caracteres não numéricos
  const numeros = cep.replace(/\D/g, '');
  
  if (numeros.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }
  
  return numeros.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const numeros = cnpj.replace(/\D/g, '');
  
  if (numeros.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numeros)) {
    return false;
  }
  
  // Validação dos dígitos verificadores
  let soma = 0;
  let peso = 2;
  
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(numeros.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  const digito1 = ((soma % 11) < 2) ? 0 : 11 - (soma % 11);
  
  if (parseInt(numeros.charAt(12)) !== digito1) {
    return false;
  }
  
  soma = 0;
  peso = 2;
  
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(numeros.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  const digito2 = ((soma % 11) < 2) ? 0 : 11 - (soma % 11);
  
  return parseInt(numeros.charAt(13)) === digito2;
}

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const numeros = cpf.replace(/\D/g, '');
  
  if (numeros.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numeros)) {
    return false;
  }
  
  // Validação dos dígitos verificadores
  let soma = 0;
  
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i);
  }
  
  const resto = (soma * 10) % 11;
  const digito1 = resto === 10 || resto === 11 ? 0 : resto;
  
  if (parseInt(numeros.charAt(9)) !== digito1) {
    return false;
  }
  
  soma = 0;
  
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i);
  }
  
  const resto2 = (soma * 10) % 11;
  const digito2 = resto2 === 10 || resto2 === 11 ? 0 : resto2;
  
  return parseInt(numeros.charAt(10)) === digito2;
} 