// Regras de ICMS por estado - Sistema 100% Automático
export const ICMS_RULES = {
  // Regras padrão
  DEFAULT: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
  },

  // São Paulo
  SP: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 30, // Águas
      '2202': 30, // Refrigerantes
      '2203': 30, // Cervejas
      '2204': 30, // Vinhos
      '2205': 30, // Vermutes
      '2206': 30, // Sidras
      '2207': 30, // Aguardentes
      '2208': 30, // Outras bebidas
      '2401': 40, // Tabaco
      '2402': 40, // Charutos
      '2403': 40, // Cigarros
      '3301': 25, // Óleos essenciais
      '3302': 25, // Misturas odoríferas
      '3303': 25, // Perfumes
      '3304': 25, // Produtos de maquiagem
      '3305': 25, // Produtos para cabelo
      '3306': 25, // Produtos para higiene
      '3307': 25, // Outros produtos
      '9503': 20, // Brinquedos
      '9504': 20, // Jogos
      '9505': 20, // Artigos para festas
      '9506': 20, // Artigos esportivos
      '9507': 20, // Artigos de pesca
      '9508': 20, // Outros artigos
    },
    outorgadoCredits: {
      '1001': 5, // Trigo
      '1002': 5, // Centeio
      '1003': 5, // Cevada
      '1004': 5, // Aveia
      '1005': 5, // Milho
      '1006': 5, // Arroz
      '1007': 5, // Sorgo
      '1008': 5, // Trigo mourisco
      '1101': 5, // Farinha de trigo
      '1102': 5, // Farinha de centeio
      '1103': 5, // Farinha de cevada
      '1104': 5, // Farinha de aveia
      '1105': 5, // Farinha de milho
      '1106': 5, // Farinha de arroz
      '1107': 5, // Farinha de sorgo
      '1108': 5, // Farinha de trigo mourisco
      '1109': 5, // Outras farinhas
    },
  },

  // Rio de Janeiro
  RJ: {
    aliquotaInterna: 20,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 25, // Águas
      '2202': 25, // Refrigerantes
      '2203': 25, // Cervejas
      '2204': 25, // Vinhos
      '2205': 25, // Vermutes
      '2206': 25, // Sidras
      '2207': 25, // Aguardentes
      '2208': 25, // Outras bebidas
      '2401': 35, // Tabaco
      '2402': 35, // Charutos
      '2403': 35, // Cigarros
    },
  },

  // Minas Gerais
  MG: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 20, // Águas
      '2202': 20, // Refrigerantes
      '2203': 20, // Cervejas
      '2204': 20, // Vinhos
      '2205': 20, // Vermutes
      '2206': 20, // Sidras
      '2207': 20, // Aguardentes
      '2208': 20, // Outras bebidas
      '2401': 30, // Tabaco
      '2402': 30, // Charutos
      '2403': 30, // Cigarros
    },
    outorgadoCredits: {
      '1001': 3, // Trigo
      '1002': 3, // Centeio
      '1003': 3, // Cevada
      '1004': 3, // Aveia
      '1005': 3, // Milho
      '1006': 3, // Arroz
      '1007': 3, // Sorgo
      '1008': 3, // Trigo mourisco
    },
  },

  // Goiás (Protege Goiás)
  GO: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    protegeGoias: {
      '1001': 2, // Trigo
      '1002': 2, // Centeio
      '1003': 2, // Cevada
      '1004': 2, // Aveia
      '1005': 2, // Milho
      '1006': 2, // Arroz
      '1007': 2, // Sorgo
      '1008': 2, // Trigo mourisco
      '1101': 2, // Farinha de trigo
      '1102': 2, // Farinha de centeio
      '1103': 2, // Farinha de cevada
      '1104': 2, // Farinha de aveia
      '1105': 2, // Farinha de milho
      '1106': 2, // Farinha de arroz
      '1107': 2, // Farinha de sorgo
      '1108': 2, // Farinha de trigo mourisco
      '1109': 2, // Outras farinhas
      '1201': 2, // Sementes de soja
      '1202': 2, // Sementes de amendoim
      '1203': 2, // Sementes de algodão
      '1204': 2, // Sementes de linhaça
      '1205': 2, // Sementes de girassol
      '1206': 2, // Sementes de gergelim
      '1207': 2, // Sementes de mostarda
      '1208': 2, // Sementes de papoula
      '1209': 2, // Outras sementes
      '1501': 2, // Gorduras de porco
      '1502': 2, // Gorduras de bovinos
      '1503': 2, // Gorduras de ovinos
      '1504': 2, // Gorduras de peixes
      '1505': 2, // Gorduras de aves
      '1506': 2, // Outras gorduras
      '1507': 2, // Óleos de soja
      '1508': 2, // Óleos de amendoim
      '1509': 2, // Óleos de oliva
    },
    ncmReductions: {
      '2201': 15, // Águas
      '2202': 15, // Refrigerantes
      '2203': 15, // Cervejas
      '2204': 15, // Vinhos
      '2205': 15, // Vermutes
      '2206': 15, // Sidras
      '2207': 15, // Aguardentes
      '2208': 15, // Outras bebidas
    },
  },

  // Paraná
  PR: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 20, // Águas
      '2202': 20, // Refrigerantes
      '2203': 20, // Cervejas
      '2204': 20, // Vinhos
      '2205': 20, // Vermutes
      '2206': 20, // Sidras
      '2207': 20, // Aguardentes
      '2208': 20, // Outras bebidas
      '2401': 30, // Tabaco
      '2402': 30, // Charutos
      '2403': 30, // Cigarros
    },
  },

  // Rio Grande do Sul
  RS: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 18, // Águas
      '2202': 18, // Refrigerantes
      '2203': 18, // Cervejas
      '2204': 18, // Vinhos
      '2205': 18, // Vermutes
      '2206': 18, // Sidras
      '2207': 18, // Aguardentes
      '2208': 18, // Outras bebidas
      '2401': 25, // Tabaco
      '2402': 25, // Charutos
      '2403': 25, // Cigarros
    },
  },

  // Santa Catarina
  SC: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 15, // Águas
      '2202': 15, // Refrigerantes
      '2203': 15, // Cervejas
      '2204': 15, // Vinhos
      '2205': 15, // Vermutes
      '2206': 15, // Sidras
      '2207': 15, // Aguardentes
      '2208': 15, // Outras bebidas
    },
  },

  // Mato Grosso do Sul
  MS: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 12, // Águas
      '2202': 12, // Refrigerantes
      '2203': 12, // Cervejas
      '2204': 12, // Vinhos
      '2205': 12, // Vermutes
      '2206': 12, // Sidras
      '2207': 12, // Aguardentes
      '2208': 12, // Outras bebidas
    },
  },

  // Mato Grosso
  MT: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 10, // Águas
      '2202': 10, // Refrigerantes
      '2203': 10, // Cervejas
      '2204': 10, // Vinhos
      '2205': 10, // Vermutes
      '2206': 10, // Sidras
      '2207': 10, // Aguardentes
      '2208': 10, // Outras bebidas
    },
  },

  // Bahia
  BA: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 22, // Águas
      '2202': 22, // Refrigerantes
      '2203': 22, // Cervejas
      '2204': 22, // Vinhos
      '2205': 22, // Vermutes
      '2206': 22, // Sidras
      '2207': 22, // Aguardentes
      '2208': 22, // Outras bebidas
      '2401': 32, // Tabaco
      '2402': 32, // Charutos
      '2403': 32, // Cigarros
    },
  },

  // Pernambuco
  PE: {
    aliquotaInterna: 17.5,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 18, // Águas
      '2202': 18, // Refrigerantes
      '2203': 18, // Cervejas
      '2204': 18, // Vinhos
      '2205': 18, // Vermutes
      '2206': 18, // Sidras
      '2207': 18, // Aguardentes
      '2208': 18, // Outras bebidas
      '2401': 28, // Tabaco
      '2402': 28, // Charutos
      '2403': 28, // Cigarros
    },
  },

  // Ceará
  CE: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 20, // Águas
      '2202': 20, // Refrigerantes
      '2203': 20, // Cervejas
      '2204': 20, // Vinhos
      '2205': 20, // Vermutes
      '2206': 20, // Sidras
      '2207': 20, // Aguardentes
      '2208': 20, // Outras bebidas
      '2401': 30, // Tabaco
      '2402': 30, // Charutos
      '2403': 30, // Cigarros
    },
  },

  // Maranhão
  MA: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 15, // Águas
      '2202': 15, // Refrigerantes
      '2203': 15, // Cervejas
      '2204': 15, // Vinhos
      '2205': 15, // Vermutes
      '2206': 15, // Sidras
      '2207': 15, // Aguardentes
      '2208': 15, // Outras bebidas
    },
  },

  // Piauí
  PI: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 16, // Águas
      '2202': 16, // Refrigerantes
      '2203': 16, // Cervejas
      '2204': 16, // Vinhos
      '2205': 16, // Vermutes
      '2206': 16, // Sidras
      '2207': 16, // Aguardentes
      '2208': 16, // Outras bebidas
    },
  },

  // Paraíba
  PB: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 17, // Águas
      '2202': 17, // Refrigerantes
      '2203': 17, // Cervejas
      '2204': 17, // Vinhos
      '2205': 17, // Vermutes
      '2206': 17, // Sidras
      '2207': 17, // Aguardentes
      '2208': 17, // Outras bebidas
    },
  },

  // Rio Grande do Norte
  RN: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 16, // Águas
      '2202': 16, // Refrigerantes
      '2203': 16, // Cervejas
      '2204': 16, // Vinhos
      '2205': 16, // Vermutes
      '2206': 16, // Sidras
      '2207': 16, // Aguardentes
      '2208': 16, // Outras bebidas
    },
  },

  // Sergipe
  SE: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 14, // Águas
      '2202': 14, // Refrigerantes
      '2203': 14, // Cervejas
      '2204': 14, // Vinhos
      '2205': 14, // Vermutes
      '2206': 14, // Sidras
      '2207': 14, // Aguardentes
      '2208': 14, // Outras bebidas
    },
  },

  // Alagoas
  AL: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 13, // Águas
      '2202': 13, // Refrigerantes
      '2203': 13, // Cervejas
      '2204': 13, // Vinhos
      '2205': 13, // Vermutes
      '2206': 13, // Sidras
      '2207': 13, // Aguardentes
      '2208': 13, // Outras bebidas
    },
  },

  // Espírito Santo
  ES: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 15, // Águas
      '2202': 15, // Refrigerantes
      '2203': 15, // Cervejas
      '2204': 15, // Vinhos
      '2205': 15, // Vermutes
      '2206': 15, // Sidras
      '2207': 15, // Aguardentes
      '2208': 15, // Outras bebidas
    },
  },

  // Pará
  PA: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 12, // Águas
      '2202': 12, // Refrigerantes
      '2203': 12, // Cervejas
      '2204': 12, // Vinhos
      '2205': 12, // Vermutes
      '2206': 12, // Sidras
      '2207': 12, // Aguardentes
      '2208': 12, // Outras bebidas
    },
  },

  // Amapá
  AP: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 10, // Águas
      '2202': 10, // Refrigerantes
      '2203': 10, // Cervejas
      '2204': 10, // Vinhos
      '2205': 10, // Vermutes
      '2206': 10, // Sidras
      '2207': 10, // Aguardentes
      '2208': 10, // Outras bebidas
    },
  },

  // Amazonas
  AM: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 8, // Águas
      '2202': 8, // Refrigerantes
      '2203': 8, // Cervejas
      '2204': 8, // Vinhos
      '2205': 8, // Vermutes
      '2206': 8, // Sidras
      '2207': 8, // Aguardentes
      '2208': 8, // Outras bebidas
    },
  },

  // Rondônia
  RO: {
    aliquotaInterna: 17.5,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 11, // Águas
      '2202': 11, // Refrigerantes
      '2203': 11, // Cervejas
      '2204': 11, // Vinhos
      '2205': 11, // Vermutes
      '2206': 11, // Sidras
      '2207': 11, // Aguardentes
      '2208': 11, // Outras bebidas
    },
  },

  // Roraima
  RR: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 9, // Águas
      '2202': 9, // Refrigerantes
      '2203': 9, // Cervejas
      '2204': 9, // Vinhos
      '2205': 9, // Vermutes
      '2206': 9, // Sidras
      '2207': 9, // Aguardentes
      '2208': 9, // Outras bebidas
    },
  },

  // Acre
  AC: {
    aliquotaInterna: 17,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 7, // Águas
      '2202': 7, // Refrigerantes
      '2203': 7, // Cervejas
      '2204': 7, // Vinhos
      '2205': 7, // Vermutes
      '2206': 7, // Sidras
      '2207': 7, // Aguardentes
      '2208': 7, // Outras bebidas
    },
  },

  // Tocantins
  TO: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 13, // Águas
      '2202': 13, // Refrigerantes
      '2203': 13, // Cervejas
      '2204': 13, // Vinhos
      '2205': 13, // Vermutes
      '2206': 13, // Sidras
      '2207': 13, // Aguardentes
      '2208': 13, // Outras bebidas
    },
  },

  // Distrito Federal
  DF: {
    aliquotaInterna: 18,
    aliquotaInterestadual: 7,
    defaultReduction: 0,
    defaultOutorgado: 0,
    ncmReductions: {
      '2201': 20, // Águas
      '2202': 20, // Refrigerantes
      '2203': 20, // Cervejas
      '2204': 20, // Vinhos
      '2205': 20, // Vermutes
      '2206': 20, // Sidras
      '2207': 20, // Aguardentes
      '2208': 20, // Outras bebidas
      '2401': 30, // Tabaco
      '2402': 30, // Charutos
      '2403': 30, // Cigarros
    },
  },
}; 