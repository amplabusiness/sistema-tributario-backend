const fs = require('fs');
const path = require('path');

// Função para corrigir imports em um arquivo
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Corrigir imports do logger
    if (content.includes('@/utils/logger')) {
      content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/utils\/logger['"];?/g, '');
      content = content.replace(/logInfo\(/g, 'console.log(');
      content = content.replace(/logError\(/g, 'console.error(');
      content = content.replace(/logWarn\(/g, 'console.warn(');
      content = content.replace(/logAI\(/g, 'console.log(');
      modified = true;
    }

    // Corrigir imports de config/logger
    if (content.includes('../../config/logger')) {
      content = content.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\.\/\.\.\/config\/logger['"];?/g, '');
      content = content.replace(/logger\.info\(/g, 'console.log(');
      content = content.replace(/logger\.error\(/g, 'console.error(');
      content = content.replace(/logger\.warn\(/g, 'console.warn(');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao corrigir ${filePath}:`, error.message);
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
      fixImportsInFile(filePath);
    }
  });
}

// Executar correção
console.log('🔧 Iniciando correção de imports...');
processDirectory('./src');
console.log('✅ Correção concluída!'); 