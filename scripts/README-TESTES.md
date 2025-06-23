# 🤖 TESTES AUTOMATIZADOS DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA

## 📋 Visão Geral

Este sistema de testes automatizados foi desenvolvido para garantir a qualidade, performance e estabilidade da API do Sistema Tributário. Inclui três tipos principais de testes:

1. **🧪 Testes Funcionais** - Verificação de funcionalidade dos endpoints
2. **🔄 Testes Contínuos** - Monitoramento em tempo real
3. **⚡ Testes de Carga** - Análise de performance sob stress

## 🚀 Scripts Disponíveis

### 1. Testes Funcionais

```bash
# Teste básico de todos os endpoints
npm run test:endpoints

# Teste com output detalhado
npm run test:endpoints:verbose

# Teste com URL personalizada
API_URL=https://sua-api.com npm run test:endpoints
```

**Endpoints Testados:**
- ✅ Health Check (`/health`)
- ✅ API Status (`/api/status`)
- ✅ Root Endpoint (`/`)
- ✅ List Documents (`/api/documents`)
- ✅ Upload File (`/api/upload`)
- ✅ ICMS Analysis (`/api/icms/analyze`)
- ✅ Federal Analysis (`/api/federal/analyze`)
- ✅ Error Handling (404)

### 2. Testes Contínuos (Monitoramento)

```bash
# Monitoramento contínuo (padrão: 5 minutos)
npm run test:monitor

# Monitoramento com output detalhado
npm run test:endpoints:continuous:verbose

# Monitoramento personalizado
TEST_INTERVAL=60000 MAX_FAILURES=5 npm run test:monitor
```

**Configurações:**
- `TEST_INTERVAL`: Intervalo entre testes (ms) - Padrão: 300000 (5 min)
- `MAX_FAILURES`: Máximo de falhas consecutivas - Padrão: 3
- `API_URL`: URL da API - Padrão: Vercel URL

**Recursos:**
- 📊 Histórico de testes
- 🚨 Sistema de alertas
- 📄 Logs detalhados
- 📈 Métricas de performance

### 3. Testes de Carga

```bash
# Teste de carga completo
npm run test:load

# Teste de carga rápido (30s, 5 usuários)
npm run test:load:quick

# Teste com output detalhado
npm run test:load:verbose

# Teste personalizado
CONCURRENT_USERS=20 TEST_DURATION=120000 npm run test:load
```

**Configurações:**
- `CONCURRENT_USERS`: Usuários simultâneos - Padrão: 10
- `TEST_DURATION`: Duração do teste (ms) - Padrão: 60000 (1 min)
- `RAMP_UP_TIME`: Tempo de ramp-up (ms) - Padrão: 10000 (10s)

**Cenários de Carga:**
- Health Check (30% das requisições)
- API Status (25% das requisições)
- Documents List (20% das requisições)
- Upload File (15% das requisições)
- ICMS Analysis (10% das requisições)

### 4. Testes Combinados

```bash
# Executar todos os testes
npm run test:all

# Pipeline completo de qualidade
npm run test:all && npm run test:ci
```

## 📊 Relatórios Gerados

### 1. Testes Funcionais
- `endpoint-test-report.json` - Relatório detalhado em JSON
- `endpoint-test-report.txt` - Relatório legível em texto

### 2. Testes Contínuos
- `continuous-test.log` - Log de atividades
- `test-alerts.json` - Alertas gerados
- `test-history.json` - Histórico de testes

### 3. Testes de Carga
- `load-test-report.json` - Relatório completo de performance

## 📈 Métricas Analisadas

### Funcionais
- ✅ Taxa de sucesso
- ⏱️ Tempo de resposta
- ❌ Erros detectados
- 🔍 Status de cada endpoint

### Contínuos
- 📊 Tendências de performance
- 🚨 Alertas automáticos
- 📈 Estatísticas históricas
- ⚠️ Detecção de degradação

### Carga
- ⚡ Requisições por segundo
- 📊 Percentis de resposta (P50, P95, P99)
- 👥 Comportamento sob stress
- 🔍 Análise de gargalos

## 🎯 Exemplos de Uso

### 1. Verificação Rápida
```bash
# Verificar se a API está funcionando
npm run test:endpoints

# Resultado esperado:
# ✅ Testes Passados: 11/11 (100%)
# ⚡ Tempo Médio de Resposta: 245.67ms
```

### 2. Monitoramento em Produção
```bash
# Iniciar monitoramento contínuo
npm run test:monitor

# O script roda indefinidamente, testando a cada 5 minutos
# Pressione Ctrl+C para parar
```

### 3. Análise de Performance
```bash
# Teste de carga completo
npm run test:load

# Resultado esperado:
# ✅ Requisições bem-sucedidas: 150/150 (100%)
# ⚡ Requisições/segundo: 2.5
# 📈 P95: 1200ms
```

### 4. Debug de Problemas
```bash
# Teste com output detalhado
npm run test:endpoints:verbose

# Ver logs de monitoramento
tail -f continuous-test.log

# Verificar alertas
cat test-alerts.json
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```bash
# Configurações de teste
export API_URL="https://sua-api.com"
export TEST_INTERVAL=60000        # 1 minuto
export MAX_FAILURES=5             # 5 falhas consecutivas
export CONCURRENT_USERS=20        # 20 usuários simultâneos
export TEST_DURATION=120000       # 2 minutos
export RAMP_UP_TIME=15000         # 15 segundos de ramp-up
```

### Integração com CI/CD

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run test:endpoints
      - run: npm run test:load:quick
      
      - name: Upload test reports
        uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: |
            endpoint-test-report.json
            load-test-report.json
```

### Monitoramento Automatizado

```bash
# Script para monitoramento 24/7
#!/bin/bash
while true; do
  npm run test:endpoints
  if [ $? -ne 0 ]; then
    echo "ALERTA: Falha nos testes detectada!"
    # Enviar notificação (email, Slack, etc.)
  fi
  sleep 300  # Aguardar 5 minutos
done
```

## 🚨 Alertas e Notificações

### Tipos de Alerta
1. **Connectivity Failure** - Falha de conectividade
2. **Test Failure** - Múltiplas falhas de teste
3. **Test Error** - Erro durante execução

### Configuração de Notificações
```javascript
// Exemplo: Integração com Slack
const webhook = 'https://hooks.slack.com/services/...';

function sendAlert(alert) {
  fetch(webhook, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 ALERTA: ${alert.message}`,
      attachments: [{
        fields: [
          { title: 'Tipo', value: alert.type },
          { title: 'Timestamp', value: alert.timestamp }
        ]
      }]
    })
  });
}
```

## 📋 Checklist de Qualidade

### Antes do Deploy
- [ ] `npm run test:endpoints` - Todos os testes passando
- [ ] `npm run test:load:quick` - Performance aceitável
- [ ] Verificar relatórios gerados

### Monitoramento Contínuo
- [ ] `npm run test:monitor` - Rodando em produção
- [ ] Alertas configurados
- [ ] Logs sendo monitorados

### Análise Periódica
- [ ] Revisar histórico de testes
- [ ] Analisar tendências de performance
- [ ] Identificar gargalos
- [ ] Otimizar endpoints problemáticos

## 🎉 Benefícios

### Para Desenvolvedores
- 🔍 Detecção rápida de problemas
- 📊 Métricas de performance
- 🚨 Alertas automáticos
- 📈 Histórico de qualidade

### Para Operações
- 👀 Monitoramento 24/7
- 📋 Relatórios detalhados
- 🎯 SLA tracking
- 🔧 Debug facilitado

### Para Negócio
- 💪 Confiabilidade da API
- ⚡ Performance otimizada
- 🛡️ Redução de downtime
- 📈 Satisfação do usuário

## 🔗 Links Úteis

- 📄 [Relatório de Testes](endpoint-test-report.json)
- 📊 [Histórico de Monitoramento](test-history.json)
- 🚨 [Alertas Ativos](test-alerts.json)
- 📈 [Teste de Carga](load-test-report.json)

---

**🤖 Sistema Tributário 100% IA - Testes Automatizados**
*Desenvolvido para máxima confiabilidade e performance* 