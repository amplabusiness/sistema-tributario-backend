# Sistema Tributário Backend

Backend 100% IA para sistema tributário com 12 agentes autônomos.

## 🚀 Deploy no Vercel

### Pré-requisitos
- Conta no [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com)

### Passos para Deploy

1. **Acesse o Vercel Dashboard**
   - Vá para [vercel.com/dashboard](https://vercel.com/dashboard)

2. **Importe o Projeto**
   - Clique em "New Project"
   - Conecte sua conta GitHub se necessário
   - Selecione o repositório: `amplabusiness/sistema-tributario-backend`

3. **Configure as Variáveis de Ambiente**
   ```
   NODE_ENV=production
   DATABASE_URL=sua_url_do_banco
   JWT_SECRET=seu_jwt_secret
   OPENAI_API_KEY=sua_openai_key
   ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build completar

### Estrutura do Projeto

```
src/
├── agents/          # 12 agentes IA autônomos
├── routes/          # Rotas da API
├── services/        # Serviços principais
├── middleware/      # Middlewares
├── types/           # Tipos TypeScript
└── utils/           # Utilitários
```

### Endpoints Principais

- `GET /health` - Health check
- `POST /api/auth/login` - Autenticação
- `POST /api/documents/upload` - Upload de documentos
- `GET /api/dashboard` - Dashboard principal

### Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Prisma** - ORM
- **OpenAI** - IA
- **Jest** - Testes (78% coverage)
- **Redis** - Cache e filas

### Status do Projeto

- ✅ Backend completo
- ✅ 12 agentes IA funcionais
- ✅ 78% cobertura de testes
- ✅ Arquitetura escalável
- 🚧 Frontend em desenvolvimento

### Suporte

Para dúvidas sobre o deploy, consulte a [documentação do Vercel](https://vercel.com/docs). 