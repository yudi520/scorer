const { spawn } = require('child_process');
const path = require('path');

console.log('正在启动服务器...');

const serverPath = path.join(__dirname, '../server/embedded-server.js');
const server = spawn('node', [serverPath], {
  shell: true
});

server.on('error', (err) => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});

console.log('服务器进程已启动，等待输出...');

// 捕获输出
let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  console.log(data.toString());
});

server.stderr.on('data', (data) => {
  output += data.toString();
  console.error(data.toString());
});

// 5秒后检查状态
setTimeout(() => {
  console.log('');
  console.log('=== 5秒后的输出检查 ===');
  if (output.length > 0) {
    console.log('✅ 已捕获服务器输出');
  } else {
    console.log('⚠️  没有输出，可能服务器还在初始化中');
  }
  console.log('');
}, 5000);

process.on('SIGINT', () => {
  console.log('\n🛑 停止服务器...');
  server.kill();
  process.exit(0);
});
