#!/usr/bin/env node

/**
 * Variáveis finais para deploy no Vercel com banco Supabase
 */

console.log('🚀 Variáveis Finais para Deploy - Sistema Tributário\n');

console.log('📋 COLE ESTAS VARIÁVEIS NO VERCEL DASHBOARD:\n');

console.log('=== VARIÁVEIS DE AMBIENTE ===');
console.log('NODE_ENV=production');
console.log('JWT_SECRET=1b6509d6bf5066a1eb6ac0cdc19d12c7b5f2289dc1c35443be392ba09a6929abcca51c4c1956c94058d84195284a91722ac08ed7b193d77fd3a41af94cdc26cc');
console.log('API_KEY=20404ec6bd355cf06f2ebd8b0c2a1c53f2ac2eda15b99ae34cb89fed806d3ed8');
console.log('REDIS_URL=redis://localhost:6379');
console.log('DATABASE_URL=postgresql://postgres:[SUA_SENHA_DO_SUPABASE]@db.pdlxgzcdsmdppddulcko.supabase.co:5432/postgres');
console.log('OPENAI_API_KEY=[SUA_CHAVE_OPENAI_AQUI]');
console.log('SUPABASE_URL=https://pdlxgzcdsmdppddulcko.supabase.co');
console.log('SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbHhnemNkc21kcHBkZHVsY2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MzYzNDYsImV4cCI6MjA2NjIxMjM0Nn0.kcDuCpK6NJu1VHYobOwEDA437ijLdK2MV6bSw1phsFQ\n');

console.log('📋 PASSOS PARA CONFIGURAR:\n');

console.log('1. Vá para: https://vercel.com/dashboard');
console.log('2. Clique no projeto: sistema-tributario-backend');
console.log('3. Vá em Settings > Environment Variables');
console.log('4. Cole todas as linhas acima no campo de múltiplas variáveis');
console.log('5. Selecione "All Environments"');
console.log('6. Clique em "Save"');
console.log('7. Clique em "Redeploy"\n');

console.log('⚠️ IMPORTANTE:');
console.log('- Troque [SUA_SENHA_DO_SUPABASE] pela senha que você definiu ao criar o projeto');
console.log('- Troque [SUA_CHAVE_OPENAI_AQUI] pela sua chave real da OpenAI');
console.log('- Se não lembrar a senha, vá em Settings > Database no Supabase');
console.log('- Copie a "Connection string" completa e substitua a DATABASE_URL');
console.log('- Obtenha sua chave OpenAI em: https://platform.openai.com/api-keys\n');

console.log('🔗 Links úteis:');
console.log('- Supabase Dashboard: https://supabase.com/dashboard/project/pdlxgzcdsmdppddulcko');
console.log('- Vercel Dashboard: https://vercel.com/dashboard\n');

console.log('✅ Todas as variáveis estão prontas!');
console.log('🎯 Copie e cole no Vercel Dashboard agora!'); 