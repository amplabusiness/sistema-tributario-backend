const http = require('http');
const fs = require('fs');

console.log('=== SERVIDOR ULTRA SIMPLES ===');
console.log('Iniciando servidor...');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Servidor funcionando',
    url: req.url,
    method: req.method
  }));
});

// Tentar várias portas
const ports = [8888, 9999, 5000, 6000, 7000, 8000];
let currentPortIndex = 0;

function tryNextPort() {
  if (currentPortIndex >= ports.length) {
    console.error('Todas as portas falharam!');
    process.exit(1);
  }
  
  const port = ports[currentPortIndex];
  console.log(`Tentando porta ${port}...`);
  
  server.listen(port, '127.0.0.1', () => {
    console.log(`✅ Servidor rodando em http://127.0.0.1:${port}`);
    console.log(`Teste: curl http://127.0.0.1:${port}/health`);
    
    // Escrever status em arquivo
    fs.writeFileSync('server-status.txt', `RUNNING:${port}:${new Date().toISOString()}`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${port} em uso, tentando próxima...`);
      currentPortIndex++;
      tryNextPort();
    } else {
      console.error('Erro no servidor:', err);
      process.exit(1);
    }
  });
}

tryNextPort();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nParando servidor...');
  server.close(() => {
    fs.writeFileSync('server-status.txt', `STOPPED:${new Date().toISOString()}`);
    console.log('Servidor parado.');
    process.exit(0);
  });
});
