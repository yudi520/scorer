<template>
  <view class="page">
    <view class="container">
      <view class="header">
        <text class="title">🎮 计分器服务器</text>
        <text class="subtitle">房主专用 - 其他人扫码进入</text>
      </view>

      <view class="status-card" :class="{ connected: serverRunning }">
        <view class="status-indicator"></view>
        <text class="status-text">
          {{ serverRunning ? '服务器运行中' : '服务器未启动' }}
        </text>
      </view>

      <view class="info-section" v-if="serverInfo">
        <text class="section-title">📱 分享给其他人</text>

        <view class="qr-container">
          <canvas canvas-id="qrcode" class="qr-canvas"></canvas>
        </view>

        <view class="url-box">
          <text class="url-text">{{ serverInfo.lanUrl }}</text>
          <button class="copy-btn" @tap="copyUrl">复制</button>
        </view>

        <view class="steps">
          <text class="step-title">使用步骤：</text>
          <text class="step-item">1. 其他人用浏览器扫描上方二维码</text>
          <text class="step-item">2. 或手动输入网址：{{ serverInfo.lanUrl }}</text>
          <text class="step-item">3. 在网页上输入昵称即可加入</text>
        </view>
      </view>

      <view class="actions">
        <button class="action-btn primary" @tap="goToHome" v-if="serverRunning">
          进入应用
        </button>
        <button class="action-btn secondary" @tap="startServer" v-else>
          启动服务器
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import socketService from '@/utils/socket.js';

export default {
  data() {
    return {
      serverRunning: false,
      serverInfo: null
    };
  },

  onLoad() {
    this.checkServerStatus();
  },

  methods: {
    checkServerStatus() {
      // 检查服务器状态
      uni.request({
        url: 'http://localhost:8080/api/server-info',
        success: (res) => {
          this.serverRunning = true;
          this.serverInfo = res.data;
          this.generateQRCode();
        },
        fail: () => {
          this.serverRunning = false;
        }
      });
    },

    startServer() {
      // 在 Cordova 环境中启动服务器
      // #ifdef APP-PLUS
      if (window.nodejs) {
        window.nodejs.start('main.js', () => {
          console.log('Node.js 服务器已启动');
          this.serverRunning = true;
          this.getServerInfo();

          // 监听服务器启动事件
          window.nodejs.channel.on('server-started', (info) => {
            console.log('服务器启动成功:', info);
            this.serverInfo = info;
            this.generateQRCode();
          });
        }, (err) => {
          console.error('启动失败:', err);
          uni.showToast({
            title: '启动失败: ' + err,
            icon: 'none'
          });
        });
      } else {
        uni.showToast({
          title: 'Node.js 插件未加载',
          icon: 'none'
        });
      }
      // #endif

      // #ifdef H5
      // H5 环境：提示需要外部服务器
      uni.showToast({
        title: '请先启动 npm run server',
        icon: 'none',
        duration: 3000
      });
      // #endif
    },

    getServerInfo() {
      uni.request({
        url: 'http://localhost:8080/api/server-info',
        success: (res) => {
          this.serverInfo = res.data;
          this.generateQRCode();
        }
      });
    },

    generateQRCode() {
      if (!this.serverInfo) return;

      // 使用 uQRCode 生成二维码
      // #ifdef APP-PLUS || H5
      const QRCode = require('@dcloudio/qrcode');
      QRCode.draw(this.serverInfo.lanUrl, 'qrcode', {
        size: 200
      });
      // #endif
    },

    copyUrl() {
      uni.setClipboardData({
        data: this.serverInfo.lanUrl,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' });
        }
      });
    },

    goToHome() {
      uni.reLaunch({ url: '/pages/index/index' });
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.status-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.status-indicator {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ff4d4f;
}

.status-card.connected .status-indicator {
  background: #52c41a;
}

.status-text {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.info-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
  text-align: center;
}

.qr-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}

.qr-canvas {
  width: 400rpx;
  height: 400rpx;
}

.url-box {
  display: flex;
  align-items: center;
  gap: 15rpx;
  background: #f5f5f5;
  border-radius: 10rpx;
  padding: 15rpx 20rpx;
  margin-bottom: 30rpx;
}

.url-text {
  flex: 1;
  font-size: 24rpx;
  color: #666;
  word-break: break-all;
}

.copy-btn {
  padding: 10rpx 25rpx;
  background: #667eea;
  color: #fff;
  border-radius: 8rpx;
  font-size: 24rpx;
  border: none;
}

.steps {
  background: #f8f9ff;
  border-radius: 15rpx;
  padding: 25rpx;
}

.step-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 15rpx;
}

.step-item {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 40rpx;
  margin-bottom: 8rpx;
}

.actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 90rpx;
  border-radius: 45rpx;
  font-size: 30rpx;
  font-weight: bold;
  border: none;
}

.action-btn.primary {
  background: #fff;
  color: #667eea;
}

.action-btn.secondary {
  background: #fff;
  color: #667eea;
}
</style>
