const server = require('./server/embedded-server');

console.log('Test 1: Starting server...');
server.start().then(() => {
  console.log('Test 2: Server started successfully!');

  // 测试 API 端点
  const http = require('http');
  const req = http.request('http://localhost:8080/api/server-info', (res) => {
    let data = '';
    res.on('data', chunk => {
      data += chunk.toString();
    });
    res.on('end', () => {
      console.log('Test 3: API response:', data);
      process.exit(0);
    });
    res.on('error', (err) => {
      console.error('Test 4: API error:', err);
      process.exit(1);
    });
    req.on('timeout', () => {
      req.destroy();
      console.log('Test 5: Request timeout');
      process.exit(1);
    });
  });
}).catch(err => {
  console.error('Test 6: Server start failed:', err);
  process.exit(1);
});
