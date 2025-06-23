#!/usr/bin/env node

/**
 * Deploy Rápido - Sistema Tributário
 * Script simplificado para deploy no Vercel
 */

const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('⚡ Deploy Rápido - Sistema Tributário\n');

// Gerar chaves
const jwtSecret = crypto.randomBytes(64).toString('hex');
const apiKey = crypto.randomBytes(32).toString('hex');

console.log('🔑 Chaves geradas:');
console.log(`JWT_SECRET: ${jwtSecret}`);
console.log(`API_KEY: ${apiKey}\n`);

console.log('📋 Variáveis para configurar no Vercel Dashboard:\n');

console.log('=== VARIÁVEIS DE AMBIENTE ===');
console.log(`NODE_ENV=production`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`API_KEY=${apiKey}`);
console.log(`REDIS_URL=redis://localhost:6379`);
console.log(`DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres`);
console.log(`OPENAI_API_KEY=sua_openai_api_key_aqui\n`);

console.log('🚀 Comandos para deploy:\n');

console.log('1. Instalar Vercel CLI:');
console.log('npm install -g vercel\n');

console.log('2. Login no Vercel:');
console.log('vercel login\n');

console.log('3. Deploy:');
console.log('vercel --prod\n');

console.log('📋 Passos manuais:\n');

console.log('1. Vá para: https://vercel.com/dashboard');
console.log('2. Clique em "New Project"');
console.log('3. Importe: amplabusiness/sistema-tributario-backend');
console.log('4. Configure as variáveis acima');
console.log('5. Clique em "Deploy"\n');

console.log('✅ Script concluído!');
console.log('💡 Dica: Copie as variáveis acima e cole no Vercel Dashboard'); 