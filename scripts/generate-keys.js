#!/usr/bin/env node

/**
 * Script para gerar chaves e variáveis de ambiente
 */

const crypto = require('crypto');

console.log('🔑 Gerador de Chaves - Sistema Tributário\n');

// Gerar JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('📋 JWT_SECRET:');
console.log(jwtSecret);
console.log('');

// Gerar API Key
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('📋 API_KEY:');
console.log(apiKey);
console.log('');

// Gerar Redis URL (para desenvolvimento)
console.log('📋 REDIS_URL (para desenvolvimento):');
console.log('redis://localhost:6379');
console.log('');

console.log('📋 Variáveis de Ambiente Completas:');
console.log('=====================================');
console.log(`NODE_ENV=production`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`API_KEY=${apiKey}`);
console.log(`DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres`);
console.log(`OPENAI_API_KEY=sua_openai_api_key_aqui`);
console.log(`REDIS_URL=redis://localhost:6379`);
console.log('');

console.log('📋 Como configurar no Vercel:');
console.log('1. Vá para o dashboard do seu projeto no Vercel');
console.log('2. Settings > Environment Variables');
console.log('3. Adicione cada variável acima');
console.log('4. Clique em "Save"');
console.log('5. Faça um novo deploy');
console.log('');

console.log('⚠️  IMPORTANTE:');
console.log('- Guarde essas chaves em local seguro');
console.log('- Nunca compartilhe essas chaves');
console.log('- Use chaves diferentes para produção');
console.log('');

console.log('✅ Chaves geradas com sucesso!'); 