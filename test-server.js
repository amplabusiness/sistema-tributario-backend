console.log('🚀 Teste simples do Node.js');
console.log('📁 Diretório atual:', process.cwd());
console.log('🔧 Versão do Node:', process.version);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Servidor funcionando!' });
});

const PORT = 7777;
app.listen(PORT, 'localhost', () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
