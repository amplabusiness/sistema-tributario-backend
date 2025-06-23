#!/usr/bin/env node

/**
 * Variáveis finais para deploy no Vercel
 */

console.log('🚀 Variáveis Finais para Deploy - Sistema Tributário\n');

console.log('📋 COLE ESTAS VARIÁVEIS NO VERCEL DASHBOARD:\n');

console.log('=== VARIÁVEIS DE AMBIENTE ===');
console.log('NODE_ENV=production');
console.log('JWT_SECRET=1b6509d6bf5066a1eb6ac0cdc19d12c7b5f2289dc1c35443be392ba09a6929abcca51c4c1956c94058d84195284a91722ac08ed7b193d77fd3a41af94cdc26cc');
console.log('API_KEY=20404ec6bd355cf06f2ebd8b0c2a1c53f2ac2eda15b99ae34cb89fed806d3ed8');
console.log('REDIS_URL=redis://localhost:6379');
console.log('DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres');
console.log('OPENAI_API_KEY=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\n');

console.log('📋 PASSOS PARA CONFIGURAR:\n');

console.log('1. Vá para: https://vercel.com/dashboard');
console.log('2. Clique no projeto: sistema-tributario-backend');
console.log('3. Vá em Settings > Environment Variables');
console.log('4. Cole todas as linhas acima no campo de múltiplas variáveis');
console.log('5. Selecione "All Environments"');
console.log('6. Clique em "Save"');
console.log('7. Clique em "Redeploy"\n');

console.log('⚠️ IMPORTANTE:');
console.log('- Troque [password] e [host] na DATABASE_URL pelos dados do Supabase');
console.log('- Se não tiver Supabase configurado, deixe como está por enquanto');
console.log('- O sistema funcionará sem banco de dados inicialmente\n');

console.log('✅ Todas as variáveis estão prontas!');
console.log('🎯 Copie e cole no Vercel Dashboard agora!'); 