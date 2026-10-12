#!/usr/bin/env node

/**
 * 启动嵌入式服务器
 * 先检查 H5 构建，如果不存在则提示构建
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 启动嵌入式服务器...');

// 检查 H5 构建文件是否存在
const indexPath = path.join(__dirname, '../dist/build/h5/index.html');

if (!fs.existsSync(indexPath)) {
  console.log('');
  console.log('⚠️  H5 构建文件不存在！');
  console.log('');
  console.log('请先运行以下命令构建 H5：');
  console.log('   npm run build:h5');
  console.log('');
  console.log('或者使用开发模式（支持热重载）：');
  console.log('   npm run dev:h5');
  console.log('');
  console.log('💡 提示：');
  console.log('   - 开发模式会启动 Vite 服务器（端口 3000）');
  console.log('   - 需要同时启动嵌入式服务器（端口 8080）');
  console.log('   - 可以运行: npm run dev:all');
  console.log('');
  process.exit(1);
}

// H5 文件存在，启动服务器
const { spawn } = require('child_process');

// 启动嵌入式服务器
const serverPath = path.join(__dirname, '../server/embedded-server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});

console.log('✅ 嵌入式服务器已启动在 http://localhost:8080');
console.log('');
console.log('💡 提示：');
console.log('   - 访问 http://localhost:8080 查看应用');
console.log('   - 局域网设备访问 http://<你的IP>:8080');
console.log('   - 按 Ctrl+C 停止服务器');
console.log('');

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止服务器...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});
