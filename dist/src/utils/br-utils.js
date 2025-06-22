"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatarDataBR = formatarDataBR;
exports.formatarDataHoraBR = formatarDataHoraBR;
exports.formatarValorBR = formatarValorBR;
exports.formatarNumeroBR = formatarNumeroBR;
exports.parseValorBR = parseValorBR;
exports.formatarPercentualBR = formatarPercentualBR;
exports.obterNomeMesBR = obterNomeMesBR;
exports.obterNomeDiaSemanaBR = obterNomeDiaSemanaBR;
exports.isDataValida = isDataValida;
exports.obterDataAtualBR = obterDataAtualBR;
exports.formatarCNPJ = formatarCNPJ;
exports.formatarCPF = formatarCPF;
exports.formatarTelefoneBR = formatarTelefoneBR;
exports.formatarCEP = formatarCEP;
exports.validarCNPJ = validarCNPJ;
exports.validarCPF = validarCPF;
const BR_LOCALE = 'pt-BR';
const BR_TIMEZONE = 'America/Sao_Paulo';
function formatarDataBR(data) {
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
function formatarDataHoraBR(data) {
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
function formatarValorBR(valor, decimais = 2) {
    return new Intl.NumberFormat(BR_LOCALE, {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
    }).format(valor);
}
function formatarNumeroBR(valor, decimais = 2) {
    return new Intl.NumberFormat(BR_LOCALE, {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
    }).format(valor);
}
function parseValorBR(valorStr) {
    const limpo = valorStr.replace(/[R$\s]/g, '');
    const numeroStr = limpo.replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(numeroStr);
    if (isNaN(numero)) {
        throw new Error('Valor inválido');
    }
    return numero;
}
function formatarPercentualBR(valor, decimais = 2) {
    return new Intl.NumberFormat(BR_LOCALE, {
        style: 'percent',
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais,
    }).format(valor / 100);
}
function obterNomeMesBR(data) {
    const date = new Date(data);
    if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
    }
    return date.toLocaleDateString(BR_LOCALE, {
        month: 'long',
        timeZone: BR_TIMEZONE,
    });
}
function obterNomeDiaSemanaBR(data) {
    const date = new Date(data);
    if (isNaN(date.getTime())) {
        throw new Error('Data inválida');
    }
    return date.toLocaleDateString(BR_LOCALE, {
        weekday: 'long',
        timeZone: BR_TIMEZONE,
    });
}
function isDataValida(data) {
    const date = new Date(data);
    return !isNaN(date.getTime());
}
function obterDataAtualBR() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: BR_TIMEZONE }));
}
function formatarCNPJ(cnpj) {
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
    }
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
function formatarCPF(cpf) {
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) {
        throw new Error('CPF deve ter 11 dígitos');
    }
    return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}
function formatarTelefoneBR(telefone) {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
        return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    else if (numeros.length === 10) {
        return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    else {
        throw new Error('Telefone deve ter 10 ou 11 dígitos');
    }
}
function formatarCEP(cep) {
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length !== 8) {
        throw new Error('CEP deve ter 8 dígitos');
    }
    return numeros.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}
function validarCNPJ(cnpj) {
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
        return false;
    }
    if (/^(\d)\1+$/.test(numeros)) {
        return false;
    }
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
function validarCPF(cpf) {
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) {
        return false;
    }
    if (/^(\d)\1+$/.test(numeros)) {
        return false;
    }
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
//# sourceMappingURL=br-utils.js.map