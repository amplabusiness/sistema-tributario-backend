const fs = require('fs');
const path = require('path');

// Função para corrigir encoding em um arquivo
function fixEncodingInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Corrigir caracteres especiais
    const replacements = {
      'AUTÔNOMA': 'AUTONOMA',
      'autônoma': 'autonoma',
      'AUTÔNOMO': 'AUTONOMO',
      'autônomo': 'autonomo',
      'APURAÇÃO': 'APURACAO',
      'apuração': 'apuracao',
      'PRECIFICAÇÃO': 'PRECIFICACAO',
      'precificação': 'precificacao',
      'ANÁLISE': 'ANALISE',
      'análise': 'analise',
      'VALIDAÇÃO': 'VALIDACAO',
      'validação': 'validacao',
      'PROCESSAMENTO': 'PROCESSAMENTO',
      'processamento': 'processamento',
      'DOCUMENTOS': 'DOCUMENTOS',
      'documentos': 'documentos',
      'TRIBUTÁRIA': 'TRIBUTARIA',
      'tributária': 'tributaria',
      'ESTADUAL': 'ESTADUAL',
      'estadual': 'estadual',
      'FEDERAL': 'FEDERAL',
      'federal': 'federal',
      'INTERFACE': 'INTERFACE',
      'interface': 'interface',
      'REPORTING': 'REPORTING',
      'reporting': 'reporting',
      'DESENVOLVIMENTO': 'DESENVOLVIMENTO',
      'desenvolvimento': 'desenvolvimento',
      'COORDENADOR': 'COORDENADOR',
      'coordenador': 'coordenador',
      'QUALIDADE': 'QUALIDADE',
      'qualidade': 'qualidade',
      'DEVOPS': 'DEVOPS',
      'devops': 'devops',
      'FRONTEND': 'FRONTEND',
      'frontend': 'frontend',
      'BACKEND': 'BACKEND',
      'backend': 'backend',
      'SERVIÇOS': 'SERVICOS',
      'serviços': 'servicos',
      'AGENTES': 'AGENTES',
      'agentes': 'agentes',
      'ROTAS': 'ROTAS',
      'rotas': 'rotas',
      'MIDDLEWARE': 'MIDDLEWARE',
      'middleware': 'middleware',
      'CONFIGURAÇÃO': 'CONFIGURACAO',
      'configuração': 'configuracao',
      'IMPLEMENTAÇÃO': 'IMPLEMENTACAO',
      'implementação': 'implementacao',
      'VALIDAÇÃO': 'VALIDACAO',
      'validação': 'validacao',
      'PROCESSAMENTO': 'PROCESSAMENTO',
      'processamento': 'processamento',
      'DOCUMENTOS': 'DOCUMENTOS',
      'documentos': 'documentos',
      'TRIBUTÁRIA': 'TRIBUTARIA',
      'tributária': 'tributaria',
      'ESTADUAL': 'ESTADUAL',
      'estadual': 'estadual',
      'FEDERAL': 'FEDERAL',
      'federal': 'federal',
      'INTERFACE': 'INTERFACE',
      'interface': 'interface',
      'REPORTING': 'REPORTING',
      'reporting': 'reporting',
      'DESENVOLVIMENTO': 'DESENVOLVIMENTO',
      'desenvolvimento': 'desenvolvimento',
      'COORDENADOR': 'COORDENADOR',
      'coordenador': 'coordenador',
      'QUALIDADE': 'QUALIDADE',
      'qualidade': 'qualidade',
      'DEVOPS': 'DEVOPS',
      'devops': 'devops',
      'FRONTEND': 'FRONTEND',
      'frontend': 'frontend',
      'BACKEND': 'BACKEND',
      'backend': 'backend',
      'SERVIÇOS': 'SERVICOS',
      'serviços': 'servicos',
      'AGENTES': 'AGENTES',
      'agentes': 'agentes',
      'ROTAS': 'ROTAS',
      'rotas': 'rotas',
      'MIDDLEWARE': 'MIDDLEWARE',
      'middleware': 'middleware',
      'CONFIGURAÇÃO': 'CONFIGURACAO',
      'configuração': 'configuracao',
      'IMPLEMENTAÇÃO': 'IMPLEMENTACAO',
      'implementação': 'implementacao'
    };

    for (const [original, replacement] of Object.entries(replacements)) {
      if (content.includes(original)) {
        content = content.replace(new RegExp(original, 'g'), replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Encoding corrigido: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao corrigir encoding ${filePath}:`, error.message);
  }
}

// Função para processar diretório recursivamente
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fixEncodingInFile(filePath);
    }
  });
}

// Executar correção
console.log('🔧 Iniciando correção de encoding...');
processDirectory('./src');
console.log('✅ Correção de encoding concluída!'); 