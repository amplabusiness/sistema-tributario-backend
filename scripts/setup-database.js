#!/usr/bin/env node

/**
 * Script para configurar banco de dados PostgreSQL no Supabase
 * 
 * Passos:
 * 1. Criar conta no Supabase (gratuito)
 * 2. Criar novo projeto
 * 3. Obter DATABASE_URL
 * 4. Configurar variáveis de ambiente
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuração do Banco de Dados - Sistema Tributário\n');

console.log('📋 PASSO 1: Criar conta no Supabase');
console.log('1. Acesse: https://supabase.com');
console.log('2. Clique em "Start your project"');
console.log('3. Faça login com GitHub\n');

console.log('📋 PASSO 2: Criar novo projeto');
console.log('1. Clique em "New Project"');
console.log('2. Escolha sua organização');
console.log('3. Nome do projeto: "sistema-tributario"');
console.log('4. Senha do banco: (escolha uma senha forte)');
console.log('5. Região: (escolha a mais próxima)');
console.log('6. Clique em "Create new project"\n');

console.log('📋 PASSO 3: Obter DATABASE_URL');
console.log('1. No dashboard do projeto, vá em "Settings" > "Database"');
console.log('2. Copie a "Connection string"');
console.log('3. Formato: postgresql://postgres:[password]@[host]:5432/postgres\n');

console.log('📋 PASSO 4: Configurar no Vercel');
console.log('1. No Vercel Dashboard, vá em seu projeto');
console.log('2. Settings > Environment Variables');
console.log('3. Adicione: DATABASE_URL = [sua_connection_string]\n');

console.log('📋 PASSO 5: Executar migrações');
console.log('Após configurar, execute:');
console.log('npm run prisma:migrate:prod\n');

console.log('✅ Banco configurado! O sistema estará pronto para uso.\n');

rl.question('Pressione ENTER para continuar...', () => {
  rl.close();
  console.log('🎉 Configuração concluída!');
}); 