#!/usr/bin/env node

/**
 * Deploy Rápido 100% IA
 * Executa o deploy automatizado com interação mínima
 */

const { execSync } = require('child_process');
const readline = require('readline');

console.log('🚀 DEPLOY RÁPIDO 100% IA - SISTEMA TRIBUTÁRIO');
console.log('==============================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase());
    });
  });
}

async function quickDeploy() {
  try {
    console.log('🔍 Verificando ambiente...');
    
    // Verificar se está no diretório correto
    const packageJson = require('../../package.json');
    if (!packageJson.name.includes('sistema-tributario')) {
      throw new Error('Execute este script no diretório do projeto sistema-tributario-backend');
    }
    
    console.log('✅ Ambiente verificado');
    
    // Perguntar se tem chave OpenAI
    const hasOpenAI = await askQuestion('🤖 Você tem uma chave da OpenAI? (s/n): ');
    
    if (hasOpenAI === 's' || hasOpenAI === 'sim' || hasOpenAI === 'y' || hasOpenAI === 'yes') {
      const openaiKey = await askQuestion('🔑 Digite sua chave OpenAI (ou pressione Enter para pular): ');
      
      if (openaiKey && openaiKey.trim()) {
        // Atualizar o script com a chave real
        const autoDeployPath = require.resolve('./auto-deploy.js');
        let autoDeployContent = require('fs').readFileSync(autoDeployPath, 'utf8');
        autoDeployContent = autoDeployContent.replace(
          "OPENAI_API_KEY: '[SUA_CHAVE_OPENAI_AQUI]'",
          `OPENAI_API_KEY: '${openaiKey.trim()}'`
        );
        require('fs').writeFileSync(autoDeployPath, autoDeployContent);
        console.log('✅ Chave OpenAI configurada');
      }
    }
    
    // Perguntar se quer fazer deploy agora
    const deployNow = await askQuestion('🚀 Fazer deploy agora? (s/n): ');
    
    if (deployNow === 's' || deployNow === 'sim' || deployNow === 'y' || deployNow === 'yes') {
      console.log('\n🤖 INICIANDO DEPLOY AUTOMATIZADO...\n');
      
      // Executar o script de deploy automatizado
      execSync('node scripts/auto-deploy.js', { stdio: 'inherit' });
      
    } else {
      console.log('\n📋 Para fazer deploy manualmente:');
      console.log('1. node scripts/auto-deploy.js');
      console.log('2. Ou use: npm run deploy');
      console.log('\n🔗 Links úteis:');
      console.log('- Vercel Dashboard: https://vercel.com/dashboard');
      console.log('- Supabase Dashboard: https://supabase.com/dashboard/project/pdlxgzcdsmdppddulcko');
    }
    
  } catch (error) {
    console.error('❌ Erro no deploy rápido:', error.message);
    console.log('\n🔧 Solução:');
    console.log('1. Verifique se está no diretório correto');
    console.log('2. Execute: npm install');
    console.log('3. Execute: npm run build');
    console.log('4. Tente novamente: node scripts/quick-deploy.js');
  } finally {
    rl.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  quickDeploy();
}

module.exports = { quickDeploy }; 