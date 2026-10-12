#!/usr/bin/env node

/**
 * 启动嵌入式服务器
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 启动嵌入式服务器...');

// 检查 dist/index.html 是否存在
const indexPath = path.join(__dirname, '../dist/index.html');

if (!fs.existsSync(indexPath)) {
  console.log('');
  console.log('❌ dist/index.html 不存在！');
  console.log('');
  console.log('请确保 dist 目录存在，或者运行 H5 构建：');
  console.log('   npm run build:h5');
  console.log('');
  process.exit(1);
}

// 文件存在，启动服务器
const { spawn } = require('child_process');

console.log('正在启动服务器...');
const serverPath = './server/embedded-server.js';

const server = spawn('node', [serverPath], {
  shell: true,
  stdio: ['inherit', 'pipe', 'inherit']
});

server.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});

console.log('服务器进程已启动，PID:', server.pid);
console.log('');
console.log('📝 服务器正在启动中...');
console.log('请稍候，等待服务就绪...');
console.log('');
console.log('💡 提示：启动后可以访问以下地址：');
console.log('   - 浏览器: http://localhost:8080');
console.log('   - 局域网: http://<你的IP>:8080');
console.log('   - 按 Ctrl+C 停止服务器');
console.log('');

// 优雅退出
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 正在停止服务器...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});
