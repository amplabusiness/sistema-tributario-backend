"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IcmsApurador = void 0;
class IcmsApurador {
    static apurarICMS(itens, regras) {
        const detalhes = [];
        let totalIcms = 0;
        for (const item of itens) {
            const regra = regras.find(r => (!r.ncm || r.ncm === item.ncm) &&
                (!r.cfop || r.cfop === item.cfop) &&
                (!r.cst || r.cst === item.cst));
            let baseCalculo = item.baseIcms;
            let aliquota = regra?.aliquota ?? 0;
            let icmsDevido = 0;
            let tipoCalculo = 'PADRAO';
            let beneficio = regra?.beneficio;
            if (regra) {
                if (regra.baseReduzida && regra.baseReduzida > 0 && regra.baseReduzida < 100) {
                    baseCalculo = baseCalculo * (regra.baseReduzida / 100);
                    tipoCalculo = 'BASE REDUZIDA';
                }
                if (regra.beneficio && regra.beneficio.toLowerCase().includes('crédito outorgado')) {
                    icmsDevido = baseCalculo * (aliquota / 100);
                    tipoCalculo = 'CRÉDITO OUTORGADO';
                }
                else {
                    icmsDevido = baseCalculo * (aliquota / 100);
                }
                if (regra.proteje) {
                    tipoCalculo += ' + PROTEGE';
                }
                if (regra.difal) {
                    tipoCalculo += ' + DIFAL';
                }
                if (regra.ciap) {
                    tipoCalculo += ' + CIAP';
                }
            }
            else {
                aliquota = item.baseIcms > 0 ? (item.valorIcms / item.baseIcms) * 100 : 0;
                icmsDevido = item.valorIcms;
                tipoCalculo = 'SEM REGRA';
            }
            totalIcms += icmsDevido;
            detalhes.push({
                item,
                regra,
                baseCalculo,
                aliquota,
                icmsDevido,
                beneficio,
                tipoCalculo
            });
        }
        return { totalIcms, detalhes };
    }
}
exports.IcmsApurador = IcmsApurador;
//# sourceMappingURL=icms-apurador.js.map