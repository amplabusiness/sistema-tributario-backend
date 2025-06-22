# 🚀 Sistema Tributário IA - Scripts de Deploy

## Servidor de Emergência (FUNCIONANDO)
```bash
cd c:\luth\sistema-tributario\backend
node emergency-server.js
```

## Testes de Conectividade
```bash
# Health Check
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing | Select-Object -ExpandProperty Content

# API Status  
Invoke-WebRequest -Uri "http://localhost:3000/api/status" -UseBasicParsing | Select-Object -ExpandProperty Content

# Rota Principal
Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing | Select-Object -ExpandProperty Content
```

## Build de Produção (PENDENTE - 187 erros)
```bash
cd c:\luth\sistema-tributario\backend
npm run build  # FALHA - precisa corrigir erros TypeScript
```

## Próximos Passos
1. ✅ Servidor básico funcionando
2. 🔄 Corrigir erros TypeScript (187 restantes)
3. ⏳ Build completo da aplicação  
4. ⏳ Deploy com todas as funcionalidades
5. ⏳ Validação em produção

## Status Atual
- **Servidor Express**: ✅ FUNCIONANDO
- **Health Checks**: ✅ OPERACIONAL  
- **Build TypeScript**: ❌ PENDENTE (187 erros)
- **Funcionalidades IA**: ⏸️ OFFLINE (aguardando build)
- **Database/Auth**: ⏸️ OFFLINE (aguardando build)

## Comandos Úteis
```bash
# Verificar porta 3000
netstat -ano | findstr :3000

# Parar servidor
# Ctrl+C no terminal onde está rodando

# Verificar logs
# Observar saída do terminal onde o servidor está executando
```

## Arquivos Importantes  
- `emergency-server.js` - Servidor funcionando ✅
- `tsconfig.emergency.json` - Config TypeScript permissiva ✅
- Build completo - PENDENTE ❌
