const { ProtegeCalculator } = require('../src/services/protege-calculator');
const { ProtegePdfParser } = require('../src/services/parsers/protege-pdf-parser');

// Dados de teste para demonstrar crédito cruzado
const itensTeste = [
  {
    produto: 'Perfume Importado',
    ncm: '3303.00.00',
    cfop: '5405',
    cst: '60',
    baseIcms: 1000.00,
    valorIcms: 190.00, // 19% ICMS
    quantidade: 1,
    valorUnitario: 1000.00
  },
  {
    produto: 'Cosméticos',
    ncm: '3304.30.00',
    cfop: '5405',
    cst: '60',
    baseIcms: 500.00,
    valorIcms: 95.00, // 19% ICMS
    quantidade: 1,
    valorUnitario: 500.00
  }
];

// Regras PROTEGE 2% para produtos de beleza
const regrasProtege2 = [
  {
    tipoProtege: 'PROTEGE_2',
    aliquotaProtege: 2.0,
    produtosAplicaveis: ['Perfume', 'Cosméticos', 'Maquiagem'],
    ncm: '3303.00.00',
    cfop: '5405',
    cst: '60',
    descricao: 'PROTEGE 2% - Produtos de Beleza'
  }
];

// Regras PROTEGE 15% para benefícios
const regrasProtege15 = [
  {
    tipoProtege: 'PROTEGE_15',
    aliquotaProtege: 15.0,
    beneficios: [
      {
        tipo: 'BASE_REDUZIDA',
        baseReduzida: 50, // 50% de redução da base
        aliquota: 7, // 7% de alíquota
        ativo: true,
        condicoes: ['PROTEGE 15% ativo']
      },
      {
        tipo: 'CREDITO_OUTORGADO',
        aliquota: 3, // 3% de crédito outorgado
        ativo: true,
        condicoes: ['PROTEGE 15% ativo']
      }
    ],
    ncm: '3304.30.00',
    cfop: '5405',
    cst: '60',
    descricao: 'PROTEGE 15% - Cosméticos com benefícios'
  }
];

function testarCreditoCruzado() {
  console.log('=== TESTE PROTEGE 2% - CRÉDITO CRUZADO ===\n');

  // Simular 3 meses de operação
  const meses = ['202501', '202502', '202503'];
  const resultados = [];

  for (let i = 0; i < meses.length; i++) {
    const periodo = meses[i];
    const creditoMesAnterior = i > 0 ? resultados[i - 1].resultado.protege2Pagamento : 0;

    console.log(`\n--- MÊS ${periodo} ---`);
    console.log(`Crédito do mês anterior: R$ ${creditoMesAnterior.toFixed(2)}`);

    // Calcular PROTEGE
    const resultado = ProtegeCalculator.calcularProtege(
      itensTeste,
      [...regrasProtege2, ...regrasProtege15],
      'EMPRESA_TESTE',
      periodo,
      creditoMesAnterior
    );

    resultados.push(resultado);

    console.log(`Base de cálculo: R$ ${resultado.totalBaseCalculo.toFixed(2)}`);
    console.log(`PROTEGE 15%: R$ ${resultado.totalProtege15.toFixed(2)}`);
    console.log(`PROTEGE 2% (pagamento): R$ ${resultado.protege2Pagamento.toFixed(2)}`);
    console.log(`PROTEGE 2% (crédito): R$ ${resultado.protege2Credito.toFixed(2)}`);
    console.log(`Saldo PROTEGE 2%: R$ ${resultado.saldoProtege2.toFixed(2)}`);
    console.log(`Benefícios: R$ ${resultado.totalBeneficios.toFixed(2)}`);
    console.log(`Valor final: R$ ${resultado.valorFinal.toFixed(2)}`);

    // Detalhes dos itens
    console.log('\nDetalhes dos itens:');
    resultado.detalhes.forEach((detalhe, index) => {
      const item = detalhe.item;
      const protege = detalhe.protegeCalculo;
      
      console.log(`  Item ${index + 1}: ${item.produto}`);
      console.log(`    Base: R$ ${item.baseIcms.toFixed(2)}`);
      console.log(`    ICMS Original: R$ ${item.valorIcms.toFixed(2)}`);
      
      if (protege.tipoProtege === 'PROTEGE_2') {
        console.log(`    PROTEGE 2%: R$ ${protege.valorProtege.toFixed(2)}`);
        console.log(`    ICMS + PROTEGE: R$ ${protege.icmsComProtege?.toFixed(2)}`);
        console.log(`    Mês pagamento: ${protege.mesPagamento}`);
        console.log(`    Mês crédito: ${protege.mesCredito}`);
      } else if (protege.tipoProtege === 'PROTEGE_15') {
        console.log(`    PROTEGE 15%: R$ ${protege.valorProtege.toFixed(2)}`);
        console.log(`    Benefícios: R$ ${protege.totalBeneficios?.toFixed(2)}`);
        console.log(`    Valor final: R$ ${protege.valorFinal.toFixed(2)}`);
      }
    });
  }

  // Relatório consolidado
  console.log('\n=== RELATÓRIO CONSOLIDADO ===');
  const relatorio = ProtegeCalculator.gerarRelatorioCreditoCruzado(
    resultados.map(r => r.resultado),
    '202501',
    '202503'
  );

  console.log(`Período: ${relatorio.periodoInicio} a ${relatorio.periodoFim}`);
  console.log(`Total de períodos: ${relatorio.totalPeriodos}`);
  console.log(`Total pagamentos: R$ ${relatorio.resumo.totalPagamentos.toFixed(2)}`);
  console.log(`Total créditos: R$ ${relatorio.resumo.totalCreditos.toFixed(2)}`);
  console.log(`Saldo acumulado: R$ ${relatorio.resumo.saldoAcumulado.toFixed(2)}`);

  console.log('\nDetalhes por período:');
  relatorio.detalhesPorPeriodo.forEach(detalhe => {
    console.log(`  ${detalhe.periodo}: Pagamento R$ ${detalhe.pagamento.toFixed(2)} | Crédito R$ ${detalhe.credito.toFixed(2)} | Saldo R$ ${detalhe.saldo.toFixed(2)} | Crédito em ${detalhe.mesCredito}`);
  });

  // Demonstrar fluxo de crédito cruzado
  console.log('\n=== FLUXO DE CRÉDITO CRUZADO ===');
  console.log('Mês 1: Paga 2% adicional → Mês 2: Recebe crédito de 2%');
  console.log('Mês 2: Paga 2% adicional → Mês 3: Recebe crédito de 2%');
  console.log('Mês 3: Paga 2% adicional → Mês 4: Recebe crédito de 2%');
  console.log('\nÉ como se a empresa "emprestasse" 2% para o governo em um mês');
  console.log('e recebesse o "empréstimo" de volta no mês seguinte!');
}

function testarCalculoCredito() {
  console.log('\n=== TESTE CÁLCULO DE CRÉDITO ===\n');

  const periodo = '202502';
  const credito = ProtegeCalculator.calcularCreditoProtege2(
    itensTeste,
    regrasProtege2,
    periodo
  );

  console.log(`Crédito calculado para ${periodo}: R$ ${credito.toFixed(2)}`);
  console.log('Este valor seria o crédito disponível do mês anterior');
}

function testarBeneficios() {
  console.log('\n=== TESTE BENEFÍCIOS PROTEGE 15% ===\n');

  const resultado = ProtegeCalculator.calcularProtege(
    itensTeste,
    regrasProtege15,
    'EMPRESA_TESTE',
    '202501'
  );

  console.log('Benefícios aplicados:');
  resultado.detalhes.forEach((detalhe, index) => {
    const item = detalhe.item;
    const protege = detalhe.protegeCalculo;
    
    if (protege.beneficiosAplicados) {
      console.log(`\nItem ${index + 1}: ${item.produto}`);
      protege.beneficiosAplicados.forEach(beneficio => {
        console.log(`  ${beneficio.tipoCalculo}: R$ ${beneficio.valorBeneficio.toFixed(2)}`);
      });
    }
  });
}

// Executar testes
console.log('🚀 Iniciando testes do PROTEGE com Crédito Cruzado\n');

testarCreditoCruzado();
testarCalculoCredito();
testarBeneficios();

console.log('\n✅ Testes concluídos!');
console.log('\n📋 Resumo da mecânica:');
console.log('• PROTEGE 15%: Regime normal com benefícios fiscais');
console.log('• PROTEGE 2%: Adicional sobre ICMS com crédito cruzado');
console.log('• Crédito cruzado: Paga em um mês, recebe crédito no próximo');
console.log('• Benefícios: Base reduzida, crédito outorgado, DIFAL, CIAP'); 