#!/usr/bin/env node

/**
 * Script para extrair chave da OpenAI de arquivo .env
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Extrator de Chave OpenAI\n');

// Procurar arquivo .env em diferentes locais
const possiblePaths = [
  '.env',
  '../.env',
  '../../.env',
  '../../../.env',
  'C:/luth/.env',
  'C:/luth/sistema-tributario/.env'
];

let envFile = null;

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    envFile = envPath;
    console.log(`✅ Arquivo .env encontrado em: ${envPath}`);
    break;
  }
}

if (!envFile) {
  console.log('❌ Arquivo .env não encontrado!');
  console.log('\n📋 Locais verificados:');
  possiblePaths.forEach(p => console.log(`- ${p}`));
  console.log('\n💡 Dica: Copie o arquivo .env para o diretório do backend ou me diga onde está.');
  process.exit(1);
}

try {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const lines = envContent.split('\n');
  
  let openaiKey = null;
  
  for (const line of lines) {
    if (line.startsWith('OPENAI_API_KEY=')) {
      openaiKey = line.split('=')[1].trim();
      break;
    }
  }
  
  if (openaiKey) {
    console.log('🔑 Chave OpenAI encontrada:');
    console.log(`OPENAI_API_KEY=${openaiKey}\n`);
    
    console.log('📋 Variáveis completas para o Vercel:');
    console.log('=====================================');
    console.log('NODE_ENV=production');
    console.log('JWT_SECRET=1b6509d6bf5066a1eb6ac0cdc19d12c7b5f2289dc1c35443be392ba09a6929abcca51c4c1956c94058d84195284a91722ac08ed7b193d77fd3a41af94cdc26cc');
    console.log('API_KEY=20404ec6bd355cf06f2ebd8b0c2a1c53f2ac2eda15b99ae34cb89fed806d3ed8');
    console.log('REDIS_URL=redis://localhost:6379');
    console.log('DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres');
    console.log(`OPENAI_API_KEY=${openaiKey}\n`);
    
    console.log('✅ Copie todas as linhas acima e cole no Vercel Dashboard!');
  } else {
    console.log('❌ Chave OPENAI_API_KEY não encontrada no arquivo .env');
    console.log('\n💡 Verifique se existe uma linha como:');
    console.log('OPENAI_API_KEY=sk-...');
  }
  
} catch (error) {
  console.error('❌ Erro ao ler arquivo .env:', error.message);
} 