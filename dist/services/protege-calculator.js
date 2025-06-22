"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtegeCalculator = void 0;
class ProtegeCalculator {
    static calcularProtege(itens, regras, empresaId, periodo, creditoMesAnterior) {
        const detalhes = [];
        let totalBaseCalculo = 0;
        let totalProtege15 = 0;
        let totalProtege2 = 0;
        let totalBeneficios = 0;
        for (const item of itens) {
            const regra = regras.find(r => (!r.ncm || r.ncm === item.ncm) &&
                (!r.cfop || r.cfop === item.cfop) &&
                (!r.cst || r.cst === item.cst));
            const protegeCalculo = this.calcularProtegeItem(item, regra, periodo);
            totalBaseCalculo += protegeCalculo.baseCalculo;
            if (protegeCalculo.tipoProtege === 'PROTEGE_15') {
                totalProtege15 += protegeCalculo.valorProtege;
                totalBeneficios += protegeCalculo.totalBeneficios || 0;
            }
            else if (protegeCalculo.tipoProtege === 'PROTEGE_2') {
                totalProtege2 += protegeCalculo.valorProtege;
            }
            detalhes.push({
                item,
                protegeCalculo,
                regraAplicada: regra
            });
        }
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
    static calcularProtegeItem(item, regra, periodo) {
        const baseCalculo = item.baseIcms;
        if (!regra) {
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
        }
        else if (regra.tipoProtege === 'PROTEGE_2') {
            return this.calcularProtege2(item, regra, periodo);
        }
        return {
            baseCalculo,
            tipoProtege: 'PROTEGE_15',
            aliquotaProtege: 0,
            valorProtege: 0,
            valorFinal: 0
        };
    }
    static calcularProtege15(item, regra) {
        const baseCalculo = item.baseIcms;
        const aliquotaProtege = regra.aliquotaProtege;
        const valorProtege = baseCalculo * (aliquotaProtege / 100);
        const beneficiosAplicados = [];
        let totalBeneficios = 0;
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
    static calcularProtege2(item, regra, periodo) {
        const baseCalculo = item.baseIcms;
        const aliquotaProtege = regra.aliquotaProtege;
        const icmsOriginal = item.valorIcms;
        const valorProtege = baseCalculo * (aliquotaProtege / 100);
        const icmsComProtege = icmsOriginal + valorProtege;
        const mesPagamento = periodo || '';
        const mesCredito = this.calcularMesCredito(periodo);
        return {
            baseCalculo,
            tipoProtege: 'PROTEGE_2',
            aliquotaProtege,
            valorProtege,
            valorFinal: valorProtege,
            icmsOriginal,
            icmsComProtege,
            mesPagamento,
            mesCredito
        };
    }
    static calcularMesCredito(periodo) {
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
    static calcularCreditoProtege2(itens, regras, periodo) {
        let totalCredito = 0;
        for (const item of itens) {
            const regra = regras.find(r => r.tipoProtege === 'PROTEGE_2' &&
                (!r.ncm || r.ncm === item.ncm) &&
                (!r.cfop || r.cfop === item.cfop) &&
                (!r.cst || r.cst === item.cst));
            if (regra && this.verificarProdutoProtege2(item, regra)) {
                const credito = item.baseIcms * (regra.aliquotaProtege / 100);
                totalCredito += credito;
            }
        }
        return totalCredito;
    }
    static gerarRelatorioCreditoCruzado(resultados, periodoInicio, periodoFim) {
        const relatorio = {
            periodoInicio,
            periodoFim,
            totalPeriodos: resultados.length,
            resumo: {
                totalPagamentos: 0,
                totalCreditos: 0,
                saldoAcumulado: 0
            },
            detalhesPorPeriodo: []
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
    static calcularBeneficio(item, beneficio, regra) {
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
                    valorBeneficio = item.valorIcms * 0.4;
                    tipoCalculo = 'DIFAL - 40% do ICMS';
                    break;
                case 'CIAP':
                    valorBeneficio = item.valorIcms * 0.1;
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
    static verificarCondicoes(beneficio, item, regra) {
        for (const condicao of beneficio.condicoes) {
            if (condicao.includes('PROTEGE 15% ativo')) {
                continue;
            }
            if (condicao.includes('cesta básica')) {
                continue;
            }
            if (condicao.includes('Medicamentos')) {
                continue;
            }
            if (condicao.includes('Investimentos')) {
                continue;
            }
        }
        return true;
    }
    static validarElegibilidade(empresaId, regras) {
        return true;
    }
    static verificarProdutoProtege2(item, regra) {
        if (regra.tipoProtege !== 'PROTEGE_2' || !regra.produtosAplicaveis) {
            return false;
        }
        const descricaoItem = item.produto.toLowerCase();
        return regra.produtosAplicaveis.some(produto => descricaoItem.includes(produto.toLowerCase()));
    }
    static gerarRelatorioBeneficios(resultado) {
        const beneficiosPorTipo = new Map();
        const protegePorTipo = {
            PROTEGE_15: 0,
            PROTEGE_2: 0
        };
        for (const detalhe of resultado.detalhes) {
            if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_15' && detalhe.protegeCalculo.beneficiosAplicados) {
                for (const beneficio of detalhe.protegeCalculo.beneficiosAplicados) {
                    const tipo = beneficio.beneficio.tipo;
                    beneficiosPorTipo.set(tipo, (beneficiosPorTipo.get(tipo) || 0) + beneficio.valorBeneficio);
                }
            }
            if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_15') {
                protegePorTipo.PROTEGE_15 += detalhe.protegeCalculo.valorProtege;
            }
            else if (detalhe.protegeCalculo.tipoProtege === 'PROTEGE_2') {
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
            protege2Pagamento: resultado.protege2Pagamento,
            protege2Credito: resultado.protege2Credito,
            saldoProtege2: resultado.saldoProtege2
        };
    }
}
exports.ProtegeCalculator = ProtegeCalculator;
//# sourceMappingURL=protege-calculator.js.map