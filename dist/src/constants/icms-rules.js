"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICMS_RULES = void 0;
exports.ICMS_RULES = {
    DEFAULT: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
    },
    SP: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 30,
            '2202': 30,
            '2203': 30,
            '2204': 30,
            '2205': 30,
            '2206': 30,
            '2207': 30,
            '2208': 30,
            '2401': 40,
            '2402': 40,
            '2403': 40,
            '3301': 25,
            '3302': 25,
            '3303': 25,
            '3304': 25,
            '3305': 25,
            '3306': 25,
            '3307': 25,
            '9503': 20,
            '9504': 20,
            '9505': 20,
            '9506': 20,
            '9507': 20,
            '9508': 20,
        },
        outorgadoCredits: {
            '1001': 5,
            '1002': 5,
            '1003': 5,
            '1004': 5,
            '1005': 5,
            '1006': 5,
            '1007': 5,
            '1008': 5,
            '1101': 5,
            '1102': 5,
            '1103': 5,
            '1104': 5,
            '1105': 5,
            '1106': 5,
            '1107': 5,
            '1108': 5,
            '1109': 5,
        },
    },
    RJ: {
        aliquotaInterna: 20,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 25,
            '2202': 25,
            '2203': 25,
            '2204': 25,
            '2205': 25,
            '2206': 25,
            '2207': 25,
            '2208': 25,
            '2401': 35,
            '2402': 35,
            '2403': 35,
        },
    },
    MG: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 20,
            '2202': 20,
            '2203': 20,
            '2204': 20,
            '2205': 20,
            '2206': 20,
            '2207': 20,
            '2208': 20,
            '2401': 30,
            '2402': 30,
            '2403': 30,
        },
        outorgadoCredits: {
            '1001': 3,
            '1002': 3,
            '1003': 3,
            '1004': 3,
            '1005': 3,
            '1006': 3,
            '1007': 3,
            '1008': 3,
        },
    },
    GO: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        protegeGoias: {
            '1001': 2,
            '1002': 2,
            '1003': 2,
            '1004': 2,
            '1005': 2,
            '1006': 2,
            '1007': 2,
            '1008': 2,
            '1101': 2,
            '1102': 2,
            '1103': 2,
            '1104': 2,
            '1105': 2,
            '1106': 2,
            '1107': 2,
            '1108': 2,
            '1109': 2,
            '1201': 2,
            '1202': 2,
            '1203': 2,
            '1204': 2,
            '1205': 2,
            '1206': 2,
            '1207': 2,
            '1208': 2,
            '1209': 2,
            '1501': 2,
            '1502': 2,
            '1503': 2,
            '1504': 2,
            '1505': 2,
            '1506': 2,
            '1507': 2,
            '1508': 2,
            '1509': 2,
        },
        ncmReductions: {
            '2201': 15,
            '2202': 15,
            '2203': 15,
            '2204': 15,
            '2205': 15,
            '2206': 15,
            '2207': 15,
            '2208': 15,
        },
    },
    PR: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 20,
            '2202': 20,
            '2203': 20,
            '2204': 20,
            '2205': 20,
            '2206': 20,
            '2207': 20,
            '2208': 20,
            '2401': 30,
            '2402': 30,
            '2403': 30,
        },
    },
    RS: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 18,
            '2202': 18,
            '2203': 18,
            '2204': 18,
            '2205': 18,
            '2206': 18,
            '2207': 18,
            '2208': 18,
            '2401': 25,
            '2402': 25,
            '2403': 25,
        },
    },
    SC: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 15,
            '2202': 15,
            '2203': 15,
            '2204': 15,
            '2205': 15,
            '2206': 15,
            '2207': 15,
            '2208': 15,
        },
    },
    MS: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 12,
            '2202': 12,
            '2203': 12,
            '2204': 12,
            '2205': 12,
            '2206': 12,
            '2207': 12,
            '2208': 12,
        },
    },
    MT: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 10,
            '2202': 10,
            '2203': 10,
            '2204': 10,
            '2205': 10,
            '2206': 10,
            '2207': 10,
            '2208': 10,
        },
    },
    BA: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 22,
            '2202': 22,
            '2203': 22,
            '2204': 22,
            '2205': 22,
            '2206': 22,
            '2207': 22,
            '2208': 22,
            '2401': 32,
            '2402': 32,
            '2403': 32,
        },
    },
    PE: {
        aliquotaInterna: 17.5,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 18,
            '2202': 18,
            '2203': 18,
            '2204': 18,
            '2205': 18,
            '2206': 18,
            '2207': 18,
            '2208': 18,
            '2401': 28,
            '2402': 28,
            '2403': 28,
        },
    },
    CE: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 20,
            '2202': 20,
            '2203': 20,
            '2204': 20,
            '2205': 20,
            '2206': 20,
            '2207': 20,
            '2208': 20,
            '2401': 30,
            '2402': 30,
            '2403': 30,
        },
    },
    MA: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 15,
            '2202': 15,
            '2203': 15,
            '2204': 15,
            '2205': 15,
            '2206': 15,
            '2207': 15,
            '2208': 15,
        },
    },
    PI: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 16,
            '2202': 16,
            '2203': 16,
            '2204': 16,
            '2205': 16,
            '2206': 16,
            '2207': 16,
            '2208': 16,
        },
    },
    PB: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 17,
            '2202': 17,
            '2203': 17,
            '2204': 17,
            '2205': 17,
            '2206': 17,
            '2207': 17,
            '2208': 17,
        },
    },
    RN: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 16,
            '2202': 16,
            '2203': 16,
            '2204': 16,
            '2205': 16,
            '2206': 16,
            '2207': 16,
            '2208': 16,
        },
    },
    SE: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 14,
            '2202': 14,
            '2203': 14,
            '2204': 14,
            '2205': 14,
            '2206': 14,
            '2207': 14,
            '2208': 14,
        },
    },
    AL: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 13,
            '2202': 13,
            '2203': 13,
            '2204': 13,
            '2205': 13,
            '2206': 13,
            '2207': 13,
            '2208': 13,
        },
    },
    ES: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 15,
            '2202': 15,
            '2203': 15,
            '2204': 15,
            '2205': 15,
            '2206': 15,
            '2207': 15,
            '2208': 15,
        },
    },
    PA: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 12,
            '2202': 12,
            '2203': 12,
            '2204': 12,
            '2205': 12,
            '2206': 12,
            '2207': 12,
            '2208': 12,
        },
    },
    AP: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 10,
            '2202': 10,
            '2203': 10,
            '2204': 10,
            '2205': 10,
            '2206': 10,
            '2207': 10,
            '2208': 10,
        },
    },
    AM: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 8,
            '2202': 8,
            '2203': 8,
            '2204': 8,
            '2205': 8,
            '2206': 8,
            '2207': 8,
            '2208': 8,
        },
    },
    RO: {
        aliquotaInterna: 17.5,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 11,
            '2202': 11,
            '2203': 11,
            '2204': 11,
            '2205': 11,
            '2206': 11,
            '2207': 11,
            '2208': 11,
        },
    },
    RR: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 9,
            '2202': 9,
            '2203': 9,
            '2204': 9,
            '2205': 9,
            '2206': 9,
            '2207': 9,
            '2208': 9,
        },
    },
    AC: {
        aliquotaInterna: 17,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 7,
            '2202': 7,
            '2203': 7,
            '2204': 7,
            '2205': 7,
            '2206': 7,
            '2207': 7,
            '2208': 7,
        },
    },
    TO: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 13,
            '2202': 13,
            '2203': 13,
            '2204': 13,
            '2205': 13,
            '2206': 13,
            '2207': 13,
            '2208': 13,
        },
    },
    DF: {
        aliquotaInterna: 18,
        aliquotaInterestadual: 7,
        defaultReduction: 0,
        defaultOutorgado: 0,
        ncmReductions: {
            '2201': 20,
            '2202': 20,
            '2203': 20,
            '2204': 20,
            '2205': 20,
            '2206': 20,
            '2207': 20,
            '2208': 20,
            '2401': 30,
            '2402': 30,
            '2403': 30,
        },
    },
};
//# sourceMappingURL=icms-rules.js.map