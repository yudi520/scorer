<template>
  <view class="container">
    <!-- 头部 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="title">创建房间</text>
    </view>

    <!-- 表单 -->
    <view class="form-section">
      <view class="form-group">
        <text class="label">🏠 房间名称</text>
        <input
          class="input-field"
          placeholder="给房间起个名字吧"
          v-model="roomName"
          maxlength="30"
        />
      </view>

      <view class="form-group">
        <text class="label">👤 你的昵称</text>
        <input
          class="input-field"
          placeholder="输入在房间中的昵称"
          v-model="playerName"
          maxlength="20"
        />
      </view>

      <view class="form-group">
        <text class="label">👥 玩家人数</text>
        <view class="counter-wrapper">
          <button class="counter-btn" @click="decreasePlayers">−</button>
          <text class="counter-value">{{ playerCount }}</text>
          <button class="counter-btn" @click="increasePlayers">+</button>
        </view>
      </view>

      <view class="form-group">
        <text class="label">💰 初始（可选）</text>
        <input
          class="input-field"
          type="digit"
          placeholder="每个人初始多少钱"
          v-model="initialFund"
        />
      </view>
    </view>

    <!-- 创建按钮 -->
    <view class="action-section">
      <button class="btn-create" @click="createRoom" :disabled="isCreating">
        <text v-if="isCreating">创建中...</text>
        <text v-else class="btn-content">
          <text class="btn-icon">🎉</text>
          <text>创建房间</text>
        </text>
      </button>
    </view>

    <!-- 提示信息 -->
    <view class="tips-box">
      <text class="tips-icon">💡</text>
      <text class="tips-text">创建后会生成6位邀请码，分享给朋友即可加入</text>
    </view>
  </view>
</template>

<script>
import localDataService from '@/utils/localDataService.js'
import socketService from '@/utils/socket.js'
import { saveRecentRoom, updateStoredRoom } from '@/utils/roomStorage.js'

export default {
  data() {
    return {
      roomName: '',
      playerName: '',
      playerCount: 2,
      initialFund: '',
      isCreating: false,
      cleanupTimeout: null,
      socketService // 防止 tree-shaking
    }
  },

  onLoad() {
    this.setupListeners();
    this.setupEmbeddedRuntimeListeners();
  },

  onUnload() {
    localDataService.off('roomCreated');
    localDataService.off('error');
    socketService.off('roomCreated');
    socketService.off('error');
    this.teardownEmbeddedRuntimeListeners();
    if (this.cleanupTimeout) {
      this.cleanupTimeout();
      this.cleanupTimeout = null;
    }
  },

  methods: {
    setupListeners() {
      localDataService.on('roomCreated', (data) => {
        this.isCreating = false;
        uni.hideLoading();
        uni.setStorageSync('currentRoom', data.room);
        saveRecentRoom(data.room);
        uni.navigateTo({ url: '/pages/room/room' });
      });

      localDataService.on('error', (data) => {
        this.isCreating = false;
        uni.hideLoading();
        uni.showToast({ title: data.message, icon: 'none' });
      });

      // 监听 WebSocket 消息（所有模式都支持）
      socketService.on('roomCreated', (data) => {
        console.log('收到 WebSocket roomCreated 事件:', data);
        // 清理超时定时器
        if (this.cleanupTimeout) {
          this.cleanupTimeout();
          this.cleanupTimeout = null;
        }
        this.isCreating = false;
        uni.hideLoading();
        if (data && data.room) {
          uni.setStorageSync('currentRoom', data.room);
          // 保存当前玩家名称
          uni.setStorageSync('currentPlayerName', this.playerName.trim());
          saveRecentRoom(data.room);
          updateStoredRoom(data.room);
          uni.navigateTo({ url: '/pages/room/room' });
        }
      });

      socketService.on('error', (data) => {
        console.log('收到 WebSocket error 事件:', data);
        // 清理超时定时器
        if (this.cleanupTimeout) {
          this.cleanupTimeout();
          this.cleanupTimeout = null;
        }
        this.isCreating = false;
        uni.hideLoading();
        if (data && data.message) {
          uni.showToast({ title: data.message, icon: 'none' });
        }
      });
    },

    setupEmbeddedRuntimeListeners() {
      if (typeof document === 'undefined') {
        return;
      }

      this.nodejsUnavailableListener = (event) => {
        this.handleEmbeddedRuntimeError(event, 'nodejs-unavailable');
      };
      this.nodejsErrorListener = (event) => {
        this.handleEmbeddedRuntimeError(event, 'nodejs-error');
      };

      document.addEventListener('nodejs-unavailable', this.nodejsUnavailableListener);
      document.addEventListener('nodejs-error', this.nodejsErrorListener);
    },

    teardownEmbeddedRuntimeListeners() {
      if (typeof document === 'undefined') {
        return;
      }

      if (this.nodejsUnavailableListener) {
        document.removeEventListener('nodejs-unavailable', this.nodejsUnavailableListener);
        this.nodejsUnavailableListener = null;
      }

      if (this.nodejsErrorListener) {
        document.removeEventListener('nodejs-error', this.nodejsErrorListener);
        this.nodejsErrorListener = null;
      }
    },

    normalizeEmbeddedRuntimeError(message) {
      if (!message) {
        return '内嵌服务启动失败';
      }

      if (message.includes('Class not found')) {
        return '内嵌服务启动失败: NodeJS 原生插件未打进 APK';
      }

      if (message.includes('plugin not found')) {
        return '内嵌服务启动失败: nodejs-mobile-cordova 不可用';
      }

      return `内嵌服务启动失败: ${message}`;
    },

    getEmbeddedRuntimeErrorMessage() {
      if (typeof window === 'undefined') {
        return '';
      }

      return window.nodejsLastErrorMessage || '';
    },

    handleEmbeddedRuntimeError(event, eventName) {
      const message = event && event.detail && event.detail.message
        ? event.detail.message
        : this.getEmbeddedRuntimeErrorMessage();

      console.error(`收到 ${eventName}:`, message || 'unknown');

      if (!this.isCreating) {
        return;
      }

      if (this.cleanupTimeout) {
        this.cleanupTimeout();
        this.cleanupTimeout = null;
      }

      this.isCreating = false;
      uni.hideLoading();
      uni.showToast({
        title: this.normalizeEmbeddedRuntimeError(message),
        icon: 'none',
        duration: 4000
      });
    },

    waitForEmbeddedServerReady(timeoutMs = 15000) {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return Promise.resolve();
      }

      if (window.nodejsServerReady || window.nodejsReady) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          clearTimeout(timer);
          document.removeEventListener('nodejs-server-ready', onReady);
          document.removeEventListener('nodejs-error', onError);
          document.removeEventListener('nodejs-unavailable', onError);
        };

        const finishResolve = () => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          resolve();
        };

        const finishReject = (message) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          reject(new Error(message));
        };

        const onReady = () => {
          finishResolve();
        };

        const onError = (event) => {
          const message = event && event.detail && event.detail.message
            ? event.detail.message
            : this.getEmbeddedRuntimeErrorMessage() || '内嵌服务启动失败';
          finishReject(message);
        };

        const timer = setTimeout(() => {
          finishReject('等待内嵌服务启动超时');
        }, timeoutMs);

        document.addEventListener('nodejs-server-ready', onReady);
        document.addEventListener('nodejs-error', onError);
        document.addEventListener('nodejs-unavailable', onError);
      });
    },

    goBack() {
      uni.navigateBack();
    },

    increasePlayers() {
      if (this.playerCount < 20) {
        this.playerCount++;
      }
    },

    decreasePlayers() {
      if (this.playerCount > 2) {
        this.playerCount--;
      }
    },

    createRoom() {
      console.log('=== createRoom 方法被调用 ===');

      const roomName = this.roomName.trim();
      const playerName = this.playerName.trim();
      const playerCount = parseInt(this.playerCount);
      const initialFund = parseFloat(this.initialFund);

      console.log('表单数据:', { roomName, playerName, playerCount, initialFund });
      console.log('表单数据原始值:', { roomName: this.roomName, playerName: this.playerName });

      if (!roomName) {
        console.log('验证失败: 房间名称为空');
        uni.showToast({ title: '请输入房间名称', icon: 'none' });
        return;
      }

      if (!playerName) {
        console.log('验证失败: 昵称为空');
        uni.showToast({ title: '请输入你的昵称', icon: 'none' });
        return;
      }

      if (playerCount < 2) {
        console.log('验证失败: 玩家人数不足');
        uni.showToast({ title: '至少需要2人', icon: 'none' });
        return;
      }

      console.log('验证通过，开始创建房间');
      this.isCreating = true;
      uni.showLoading({ title: '创建中...' });

      // 详细诊断日志
      console.log('=== 环境诊断 ===');
      console.log('window 对象存在:', typeof window !== 'undefined');
      console.log('embeddedRuntime:', socketService.isEmbeddedRuntime());
      console.log('window.nodejs 存在:', typeof window !== 'undefined' && typeof window.nodejs !== 'undefined');
      console.log('window.nodejsReady:', typeof window !== 'undefined' ? window.nodejsReady : 'N/A');
      console.log('window.nodejsStarting:', typeof window !== 'undefined' ? window.nodejsStarting : 'N/A');
      console.log('==================');

      // 运行时检测是否在 Cordova 环境
      const isEmbeddedRuntime = socketService.isEmbeddedRuntime();
      console.log('当前环境:', isEmbeddedRuntime ? '嵌入式 App' : 'H5/浏览器');

      const startupErrorMessage = isEmbeddedRuntime
        ? this.getEmbeddedRuntimeErrorMessage()
        : '';
      if (startupErrorMessage) {
        this.isCreating = false;
        uni.hideLoading();
        uni.showToast({
          title: this.normalizeEmbeddedRuntimeError(startupErrorMessage),
          icon: 'none',
          duration: 4000
        });
        return;
      }

      // 在 Cordova 环境中等待更长时间，确保 Node.js 服务器已经启动
      const delay = isEmbeddedRuntime ? 3000 : 0;

      // 设置超时处理，20秒后重置状态（Cordova 环境需要更长时间）
      const timeoutDuration = isEmbeddedRuntime ? 20000 : 10000;
      const timeoutId = setTimeout(() => {
        console.log('=== 创建房间超时 ===');
        console.log('isCreating:', this.isCreating);
        console.log('socketService.isConnected:', socketService.isConnected);
        console.log('window.nodejsReady:', typeof window !== 'undefined' ? window.nodejsReady : 'N/A');
        this.isCreating = false;
        uni.hideLoading();
        uni.showToast({
          title: '创建房间超时，请稍后重试',
          icon: 'none',
          duration: 3000
        });
      }, timeoutDuration);

      setTimeout(() => {
        console.log('=== 开始连接 WebSocket ===');
        console.log('目标服务器:', socketService.serverUrl);

        const connectPromise = isEmbeddedRuntime
          ? this.waitForEmbeddedServerReady()
              .then(() => socketService.connect())
          : socketService.connect();

        connectPromise.then(() => {
          console.log('WebSocket 连接成功，发送创建房间消息');
          const message = {
            type: 'createRoom',
            data: {
              name: roomName,
              playerName: playerName,
              playerCount: playerCount,
              initialFund: isNaN(initialFund) ? 0 : initialFund
            }
          };
          console.log('发送消息:', message);
          socketService.send(message);
        }).catch(err => {
          console.error('=== 连接服务器失败 ===');
          console.error('错误对象:', err);
          console.error('错误消息:', err ? err.message : 'unknown');
          console.error('错误堆栈:', err ? err.stack : 'no stack');
          clearTimeout(timeoutId);
          this.cleanupTimeout = null;
          this.isCreating = false;
          uni.hideLoading();
          const embeddedErrorMessage = isEmbeddedRuntime
            ? (this.getEmbeddedRuntimeErrorMessage() || (err ? err.message : ''))
            : (err ? err.message : '未知错误');
          uni.showToast({
            title: isEmbeddedRuntime
              ? this.normalizeEmbeddedRuntimeError(embeddedErrorMessage)
              : '无法连接到服务器: ' + embeddedErrorMessage,
            icon: 'none',
            duration: 3000
          });
        });

        // 清理超时定时器（如果成功收到响应）
        this.cleanupTimeout = () => clearTimeout(timeoutId);
      }, delay);
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 头部 */
.header {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 50rpx 30rpx 30rpx;
}

.back-btn {
  position: absolute;
  left: 20rpx;
  top: 50rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  text-align: center;
}

/* 表单 */
.form-section {
  padding: 40rpx;
}

.form-group {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 20rpx;
}

.input-field {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #f8f9ff;
}

.input-field:focus {
  border-color: #667eea;
  background: #fff;
}

.counter-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
}

.counter-btn {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 36rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #667eea;
  min-width: 60rpx;
  text-align: center;
}

/* 操作区域 */
.action-section {
  padding: 0 40rpx;
}

.btn-create {
  width: 100%;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 45rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
}

.btn-create[disabled] {
  opacity: 0.7;
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  font-size: 32rpx;
  margin-right: 10rpx;
}

/* 提示信息 */
.tips-box {
  margin: 40rpx;
  background: #fffbe6;
  border: 1rpx solid #ffe58f;
  border-radius: 12rpx;
  padding: 25rpx;
  display: flex;
  align-items: center;
}

.tips-icon {
  font-size: 32rpx;
  margin-right: 15rpx;
}

.tips-text {
  flex: 1;
  font-size: 24rpx;
  color: #ad8b00;
  line-height: 40rpx;
}
</style>
