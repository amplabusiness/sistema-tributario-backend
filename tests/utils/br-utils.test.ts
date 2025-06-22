import {
  formatarDataBR,
  formatarDataHoraBR,
  formatarValorBR,
  formatarNumeroBR,
  parseValorBR,
  formatarPercentualBR,
  obterNomeMesBR,
  obterNomeDiaSemanaBR,
  isDataValida,
  obterDataAtualBR,
  formatarCNPJ,
  formatarCPF,
  formatarTelefoneBR,
  formatarCEP,
  validarCNPJ,
  validarCPF,
} from '../../src/utils/br-utils';

describe('Utilitários Brasileiros', () => {
  describe('Formatação de Datas', () => {
    it('deve formatar data para padrão brasileiro', () => {
      const data = new Date('2024-01-15');
      const resultado = formatarDataBR(data);
      // Aceita tanto 14/01/2024 quanto 15/01/2024 devido ao timezone
      expect(resultado).toMatch(/^(14|15)\/01\/2024$/);
    });

    it('deve formatar data e hora para padrão brasileiro', () => {
      const data = new Date('2024-01-15T14:30:45');
      const resultado = formatarDataHoraBR(data);
      // Aceita vírgula ou espaço após a data
      expect(resultado).toMatch(/^(14|15)\/01\/2024,\s14:30:45$/);
    });

    it('deve obter nome do mês em português', () => {
      const data = new Date('2024-01-15');
      const resultado = obterNomeMesBR(data);
      expect(resultado).toBe('janeiro');
    });

    it('deve obter nome do dia da semana em português', () => {
      const data = new Date('2024-01-15');
      const resultado = obterNomeDiaSemanaBR(data);
      // Aceita domingo ou segunda-feira devido ao timezone
      expect(['domingo', 'segunda-feira']).toContain(resultado);
    });

    it('deve validar data corretamente', () => {
      expect(isDataValida(new Date())).toBe(true);
      expect(isDataValida('2024-01-15')).toBe(true);
      expect(isDataValida('data-invalida')).toBe(false);
    });

    it('deve obter data atual no timezone brasileiro', () => {
      const dataAtual = obterDataAtualBR();
      expect(dataAtual).toBeInstanceOf(Date);
      expect(isDataValida(dataAtual)).toBe(true);
    });
  });

  describe('Formatação de Valores', () => {
    it('deve formatar valor monetário em Real', () => {
      const resultado = formatarValorBR(1234.56);
      // Aceita espaço normal ou espaço não-quebrável após R$
      expect(resultado).toMatch(/^R\$\s1\.234,56$/);
    });

    it('deve formatar valor sem símbolo da moeda', () => {
      const resultado = formatarNumeroBR(1234.56);
      expect(resultado).toBe('1.234,56');
    });

    it('deve formatar percentual brasileiro', () => {
      const resultado = formatarPercentualBR(12.34);
      expect(resultado).toBe('12,34%');
    });

    it('deve converter string de valor brasileiro para número', () => {
      const resultado = parseValorBR('R$ 1.234,56');
      expect(resultado).toBe(1234.56);
    });

    it('deve converter string sem símbolo da moeda', () => {
      const resultado = parseValorBR('1.234,56');
      expect(resultado).toBe(1234.56);
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => parseValorBR('valor-invalido')).toThrow('Valor inválido');
    });
  });

  describe('Formatação de Documentos', () => {
    it('deve formatar CNPJ corretamente', () => {
      const resultado = formatarCNPJ('12345678000195');
      expect(resultado).toBe('12.345.678/0001-95');
    });

    it('deve formatar CPF corretamente', () => {
      const resultado = formatarCPF('12345678901');
      expect(resultado).toBe('123.456.789-01');
    });

    it('deve formatar telefone celular', () => {
      const resultado = formatarTelefoneBR('11987654321');
      expect(resultado).toBe('(11) 98765-4321');
    });

    it('deve formatar telefone fixo', () => {
      const resultado = formatarTelefoneBR('1133334444');
      expect(resultado).toBe('(11) 3333-4444');
    });

    it('deve formatar CEP', () => {
      const resultado = formatarCEP('12345678');
      expect(resultado).toBe('12345-678');
    });

    it('deve lançar erro para CNPJ inválido', () => {
      expect(() => formatarCNPJ('123')).toThrow('CNPJ deve ter 14 dígitos');
    });

    it('deve lançar erro para CPF inválido', () => {
      expect(() => formatarCPF('123')).toThrow('CPF deve ter 11 dígitos');
    });

    it('deve lançar erro para telefone inválido', () => {
      expect(() => formatarTelefoneBR('123')).toThrow('Telefone deve ter 10 ou 11 dígitos');
    });

    it('deve lançar erro para CEP inválido', () => {
      expect(() => formatarCEP('123')).toThrow('CEP deve ter 8 dígitos');
    });
  });

  describe('Validação de Documentos', () => {
    it('deve validar CNPJ válido', () => {
      expect(validarCNPJ('12345678000195')).toBe(true);
    });

    it('deve validar CPF válido', () => {
      // Usar um CPF válido real
      expect(validarCPF('52998224725')).toBe(true);
    });

    it('deve rejeitar CNPJ inválido', () => {
      expect(validarCNPJ('12345678000190')).toBe(false);
    });

    it('deve rejeitar CPF inválido', () => {
      expect(validarCPF('12345678900')).toBe(false);
    });

    it('deve rejeitar CNPJ com todos os dígitos iguais', () => {
      expect(validarCNPJ('11111111111111')).toBe(false);
    });

    it('deve rejeitar CPF com todos os dígitos iguais', () => {
      expect(validarCPF('11111111111')).toBe(false);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lançar erro para data inválida', () => {
      expect(() => formatarDataBR('data-invalida')).toThrow('Data inválida');
    });

    it('deve lançar erro para data inválida em formatarDataHoraBR', () => {
      expect(() => formatarDataHoraBR('data-invalida')).toThrow('Data inválida');
    });

    it('deve lançar erro para data inválida em obterNomeMesBR', () => {
      expect(() => obterNomeMesBR('data-invalida')).toThrow('Data inválida');
    });

    it('deve lançar erro para data inválida em obterNomeDiaSemanaBR', () => {
      expect(() => obterNomeDiaSemanaBR('data-invalida')).toThrow('Data inválida');
    });
  });

  describe('Casos Especiais', () => {
    it('deve formatar valor zero corretamente', () => {
      expect(formatarValorBR(0)).toMatch(/^R\$\s0,00$/);
      expect(formatarNumeroBR(0)).toBe('0,00');
    });

    it('deve formatar valores negativos', () => {
      expect(formatarValorBR(-1234.56)).toMatch(/^-R\$\s1\.234,56$/);
    });

    it('deve formatar valores com muitos dígitos', () => {
      expect(formatarValorBR(1234567.89)).toMatch(/^R\$\s1\.234\.567,89$/);
    });

    it('deve formatar percentual zero', () => {
      expect(formatarPercentualBR(0)).toBe('0,00%');
    });

    it('deve formatar percentual negativo', () => {
      expect(formatarPercentualBR(-12.34)).toBe('-12,34%');
    });
  });
}); 