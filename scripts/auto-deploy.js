#!/usr/bin/env node

/**
 * Script automatizado para deploy no Vercel
 * Configura banco, variáveis de ambiente e faz deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploy Automatizado - Sistema Tributário\n');

// Configurações padrão
const config = {
  projectName: 'sistema-tributario-backend',
  databaseName: 'sistema-tributario',
  region: 'us-east-1',
  nodeVersion: '18.x'
};

// Gerar chaves automaticamente
function generateKeys() {
  const crypto = require('crypto');
  
  console.log('🔑 Gerando chaves de segurança...');
  
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  return { jwtSecret, apiKey };
}

// Criar arquivo de configuração do Vercel
function createVercelConfig() {
  console.log('📝 Criando configuração do Vercel...');
  
  const vercelConfig = {
    version: 2,
    builds: [
      {
        src: "src/index.ts",
        use: "@vercel/node",
        config: {
          includeFiles: [
            "src/**/*",
            "prisma/**/*",
            "package.json",
            "tsconfig.json"
          ]
        }
      }
    ],
    routes: [
      {
        src: "/(.*)",
        dest: "src/index.ts"
      }
    ],
    env: {
      NODE_ENV: "production"
    },
    functions: {
      "src/index.ts": {
        maxDuration: 30
      }
    },
    buildCommand: "npm run vercel-build"
  };
  
  fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
  console.log('✅ vercel.json criado');
}

// Criar arquivo .env com todas as variáveis
function createEnvFile(keys) {
  console.log('📝 Criando arquivo .env...');
  
  const envContent = `# Configurações do Sistema Tributário Backend
# Gerado automaticamente

# Ambiente
NODE_ENV=production

# Banco de Dados (será configurado no Supabase)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Autenticação
JWT_SECRET=${keys.jwtSecret}
API_KEY=${keys.apiKey}

# OpenAI (configure sua chave)
OPENAI_API_KEY=sua_openai_api_key_aqui

# Redis
REDIS_URL=redis://localhost:6379

# Servidor
PORT=3000
HOST=0.0.0.0

# Logs
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Segurança
CORS_ORIGIN=*
HELMET_ENABLED=true

# Monitoramento
PROMETHEUS_ENABLED=true
`;
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env criado');
}

// Instalar Vercel CLI
function installVercelCLI() {
  console.log('📦 Instalando Vercel CLI...');
  
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI instalado');
  } catch (error) {
    console.log('⚠️ Vercel CLI já instalado ou erro na instalação');
  }
}

// Fazer login no Vercel
function loginVercel() {
  console.log('🔐 Fazendo login no Vercel...');
  
  try {
    execSync('vercel login', { stdio: 'inherit' });
    console.log('✅ Login no Vercel realizado');
  } catch (error) {
    console.log('⚠️ Erro no login do Vercel');
  }
}

// Deploy no Vercel
function deployVercel(keys) {
  console.log('🚀 Fazendo deploy no Vercel...');
  
  try {
    // Configurar variáveis de ambiente
    execSync(`vercel env add NODE_ENV production`, { stdio: 'inherit' });
    execSync(`vercel env add JWT_SECRET ${keys.jwtSecret}`, { stdio: 'inherit' });
    execSync(`vercel env add API_KEY ${keys.apiKey}`, { stdio: 'inherit' });
    execSync(`vercel env add REDIS_URL redis://localhost:6379`, { stdio: 'inherit' });
    
    // Deploy
    execSync('vercel --prod', { stdio: 'inherit' });
    
    console.log('✅ Deploy realizado com sucesso!');
  } catch (error) {
    console.log('⚠️ Erro no deploy. Tente manualmente:');
    console.log('vercel --prod');
  }
}

// Função principal
async function main() {
  try {
    console.log('🎯 Iniciando deploy automatizado...\n');
    
    // 1. Gerar chaves
    const keys = generateKeys();
    
    // 2. Criar configurações
    createVercelConfig();
    createEnvFile(keys);
    
    // 3. Instalar e configurar Vercel CLI
    installVercelCLI();
    
    // 4. Login no Vercel
    loginVercel();
    
    // 5. Deploy
    deployVercel(keys);
    
    console.log('\n🎉 Deploy automatizado concluído!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Configure o banco de dados no Supabase');
    console.log('2. Adicione sua OPENAI_API_KEY no Vercel Dashboard');
    console.log('3. Teste os endpoints');
    
  } catch (error) {
    console.error('❌ Erro no deploy automatizado:', error.message);
    console.log('\n🔧 Tente o deploy manual:');
    console.log('1. vercel login');
    console.log('2. vercel --prod');
  }
}

// Executar
main(); 