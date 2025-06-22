"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const br_utils_1 = require("../../src/utils/br-utils");
describe('Utilitários Brasileiros', () => {
    describe('Formatação de Datas', () => {
        it('deve formatar data para padrão brasileiro', () => {
            const data = new Date('2024-01-15');
            const resultado = (0, br_utils_1.formatarDataBR)(data);
            expect(resultado).toMatch(/^(14|15)\/01\/2024$/);
        });
        it('deve formatar data e hora para padrão brasileiro', () => {
            const data = new Date('2024-01-15T14:30:45');
            const resultado = (0, br_utils_1.formatarDataHoraBR)(data);
            expect(resultado).toMatch(/^(14|15)\/01\/2024,\s14:30:45$/);
        });
        it('deve obter nome do mês em português', () => {
            const data = new Date('2024-01-15');
            const resultado = (0, br_utils_1.obterNomeMesBR)(data);
            expect(resultado).toBe('janeiro');
        });
        it('deve obter nome do dia da semana em português', () => {
            const data = new Date('2024-01-15');
            const resultado = (0, br_utils_1.obterNomeDiaSemanaBR)(data);
            expect(['domingo', 'segunda-feira']).toContain(resultado);
        });
        it('deve validar data corretamente', () => {
            expect((0, br_utils_1.isDataValida)(new Date())).toBe(true);
            expect((0, br_utils_1.isDataValida)('2024-01-15')).toBe(true);
            expect((0, br_utils_1.isDataValida)('data-invalida')).toBe(false);
        });
        it('deve obter data atual no timezone brasileiro', () => {
            const dataAtual = (0, br_utils_1.obterDataAtualBR)();
            expect(dataAtual).toBeInstanceOf(Date);
            expect((0, br_utils_1.isDataValida)(dataAtual)).toBe(true);
        });
    });
    describe('Formatação de Valores', () => {
        it('deve formatar valor monetário em Real', () => {
            const resultado = (0, br_utils_1.formatarValorBR)(1234.56);
            expect(resultado).toMatch(/^R\$\s1\.234,56$/);
        });
        it('deve formatar valor sem símbolo da moeda', () => {
            const resultado = (0, br_utils_1.formatarNumeroBR)(1234.56);
            expect(resultado).toBe('1.234,56');
        });
        it('deve formatar percentual brasileiro', () => {
            const resultado = (0, br_utils_1.formatarPercentualBR)(12.34);
            expect(resultado).toBe('12,34%');
        });
        it('deve converter string de valor brasileiro para número', () => {
            const resultado = (0, br_utils_1.parseValorBR)('R$ 1.234,56');
            expect(resultado).toBe(1234.56);
        });
        it('deve converter string sem símbolo da moeda', () => {
            const resultado = (0, br_utils_1.parseValorBR)('1.234,56');
            expect(resultado).toBe(1234.56);
        });
        it('deve lançar erro para valor inválido', () => {
            expect(() => (0, br_utils_1.parseValorBR)('valor-invalido')).toThrow('Valor inválido');
        });
    });
    describe('Formatação de Documentos', () => {
        it('deve formatar CNPJ corretamente', () => {
            const resultado = (0, br_utils_1.formatarCNPJ)('12345678000195');
            expect(resultado).toBe('12.345.678/0001-95');
        });
        it('deve formatar CPF corretamente', () => {
            const resultado = (0, br_utils_1.formatarCPF)('12345678901');
            expect(resultado).toBe('123.456.789-01');
        });
        it('deve formatar telefone celular', () => {
            const resultado = (0, br_utils_1.formatarTelefoneBR)('11987654321');
            expect(resultado).toBe('(11) 98765-4321');
        });
        it('deve formatar telefone fixo', () => {
            const resultado = (0, br_utils_1.formatarTelefoneBR)('1133334444');
            expect(resultado).toBe('(11) 3333-4444');
        });
        it('deve formatar CEP', () => {
            const resultado = (0, br_utils_1.formatarCEP)('12345678');
            expect(resultado).toBe('12345-678');
        });
        it('deve lançar erro para CNPJ inválido', () => {
            expect(() => (0, br_utils_1.formatarCNPJ)('123')).toThrow('CNPJ deve ter 14 dígitos');
        });
        it('deve lançar erro para CPF inválido', () => {
            expect(() => (0, br_utils_1.formatarCPF)('123')).toThrow('CPF deve ter 11 dígitos');
        });
        it('deve lançar erro para telefone inválido', () => {
            expect(() => (0, br_utils_1.formatarTelefoneBR)('123')).toThrow('Telefone deve ter 10 ou 11 dígitos');
        });
        it('deve lançar erro para CEP inválido', () => {
            expect(() => (0, br_utils_1.formatarCEP)('123')).toThrow('CEP deve ter 8 dígitos');
        });
    });
    describe('Validação de Documentos', () => {
        it('deve validar CNPJ válido', () => {
            expect((0, br_utils_1.validarCNPJ)('12345678000195')).toBe(true);
        });
        it('deve validar CPF válido', () => {
            expect((0, br_utils_1.validarCPF)('52998224725')).toBe(true);
        });
        it('deve rejeitar CNPJ inválido', () => {
            expect((0, br_utils_1.validarCNPJ)('12345678000190')).toBe(false);
        });
        it('deve rejeitar CPF inválido', () => {
            expect((0, br_utils_1.validarCPF)('12345678900')).toBe(false);
        });
        it('deve rejeitar CNPJ com todos os dígitos iguais', () => {
            expect((0, br_utils_1.validarCNPJ)('11111111111111')).toBe(false);
        });
        it('deve rejeitar CPF com todos os dígitos iguais', () => {
            expect((0, br_utils_1.validarCPF)('11111111111')).toBe(false);
        });
    });
    describe('Tratamento de Erros', () => {
        it('deve lançar erro para data inválida', () => {
            expect(() => (0, br_utils_1.formatarDataBR)('data-invalida')).toThrow('Data inválida');
        });
        it('deve lançar erro para data inválida em formatarDataHoraBR', () => {
            expect(() => (0, br_utils_1.formatarDataHoraBR)('data-invalida')).toThrow('Data inválida');
        });
        it('deve lançar erro para data inválida em obterNomeMesBR', () => {
            expect(() => (0, br_utils_1.obterNomeMesBR)('data-invalida')).toThrow('Data inválida');
        });
        it('deve lançar erro para data inválida em obterNomeDiaSemanaBR', () => {
            expect(() => (0, br_utils_1.obterNomeDiaSemanaBR)('data-invalida')).toThrow('Data inválida');
        });
    });
    describe('Casos Especiais', () => {
        it('deve formatar valor zero corretamente', () => {
            expect((0, br_utils_1.formatarValorBR)(0)).toMatch(/^R\$\s0,00$/);
            expect((0, br_utils_1.formatarNumeroBR)(0)).toBe('0,00');
        });
        it('deve formatar valores negativos', () => {
            expect((0, br_utils_1.formatarValorBR)(-1234.56)).toMatch(/^-R\$\s1\.234,56$/);
        });
        it('deve formatar valores com muitos dígitos', () => {
            expect((0, br_utils_1.formatarValorBR)(1234567.89)).toMatch(/^R\$\s1\.234\.567,89$/);
        });
        it('deve formatar percentual zero', () => {
            expect((0, br_utils_1.formatarPercentualBR)(0)).toBe('0,00%');
        });
        it('deve formatar percentual negativo', () => {
            expect((0, br_utils_1.formatarPercentualBR)(-12.34)).toBe('-12,34%');
        });
    });
});
//# sourceMappingURL=br-utils.test.js.map