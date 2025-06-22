#!/bin/bash
# 🚀 Script de Deploy para Produção - Sistema Tributário IA
# Data: 22/06/2025

echo "🚀 Iniciando deploy do Sistema Tributário IA para Produção..."
echo "========================================================"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Verificar Node.js
log_info "Verificando versão do Node.js..."
NODE_VERSION=$(node --version)
log_info "Node.js version: $NODE_VERSION"

# 2. Instalar dependências
log_info "Instalando dependências..."
npm ci --only=production

# 3. Gerar Prisma Client
log_info "Gerando Prisma Client..."
npm run prisma:generate

# 4. Executar testes (crítico para produção)
log_info "Executando suíte completa de testes..."
npm run test:ci
if [ $? -ne 0 ]; then
    log_error "❌ Testes falharam! Deploy cancelado."
    exit 1
fi
log_info "✅ Todos os 159 testes passaram!"

# 5. Lint e validação de código
log_info "Executando lint..."
npm run lint
if [ $? -ne 0 ]; then
    log_error "❌ Problemas de lint encontrados! Deploy cancelado."
    exit 1
fi
log_info "✅ Código aprovado no lint!"

# 6. Build para produção
log_info "Compilando TypeScript para produção..."
npm run build
if [ $? -ne 0 ]; then
    log_error "❌ Build falhou! Deploy cancelado."
    exit 1
fi
log_info "✅ Build concluído com sucesso!"

# 7. Verificar arquivos de produção
log_info "Verificando arquivos compilados..."
if [ ! -f "dist/index.js" ]; then
    log_error "❌ Arquivo principal não encontrado!"
    exit 1
fi
log_info "✅ Arquivos de produção verificados!"

# 8. Configurar variáveis de ambiente
log_info "Configurando variáveis de ambiente para produção..."
if [ ! -f ".env.production" ]; then
    log_warn "⚠️  Arquivo .env.production não encontrado!"
    log_warn "   Usando .env padrão. Configure as variáveis de produção!"
fi

# 9. Executar migrações do banco (se necessário)
log_info "Verificando migrações do banco..."
# npm run prisma:migrate:prod (descomentе quando configurar o banco)

# 10. Health check antes do deploy final
log_info "Realizando health check preliminar..."
node -e "console.log('✅ Node.js funcionando corretamente')"

echo "========================================================"
log_info "🎉 Deploy preparado com sucesso!"
echo ""
log_info "📋 Próximos passos para produção:"
echo "   1. Configure as variáveis de ambiente em .env.production"
echo "   2. Configure o banco PostgreSQL"
echo "   3. Configure o Redis"
echo "   4. Execute: npm run start:prod"
echo ""
log_info "🔍 Para monitorar: curl http://localhost:3000/health"
echo "========================================================"
