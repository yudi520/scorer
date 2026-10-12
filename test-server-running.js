const http = require('http');

// 测试服务器是否响应
console.log('正在测试服务器...');

const req = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/',
  method: 'GET',
  timeout: 3000
}, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ 服务器正在运行！');
    console.log('可以访问: http://localhost:8080');
    process.exit(0);
  } else {
    console.log('❌ 服务器未正常启动，状态码:', res.statusCode);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.error('连接错误:', err);
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.log('连接超时');
  process.exit(1);
});
