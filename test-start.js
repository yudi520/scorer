const EmbeddedServer = require('./server/embedded-server');
console.log('Server class:', typeof EmbeddedServer);
console.log('Server constructor:', typeof EmbeddedServer);

const server = new EmbeddedServer();
console.log('Server instance:', typeof server);
console.log('Server.start:', typeof server.start);

server.start().then(() => {
  console.log('启动完成');
  process.exit(0);
}).catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
