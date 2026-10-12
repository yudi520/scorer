const SERVER_URL = 'ws://localhost:8080';

class SocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectCount = 0;
    this.maxReconnect = 5;
    this.isConnected = false;
    this.pendingMessages = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      wx.connectSocket({
        url: SERVER_URL,
        method: 'GET'
      });

      wx.onSocketOpen(() => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectCount = 0;
        this.flushPendingMessages();
        resolve();
      });

      wx.onSocketMessage((res) => {
        try {
          const data = JSON.parse(res.data);
          const callbacks = this.listeners.get(data.type);
          if (callbacks) {
            callbacks.forEach(cb => cb(data));
          }
        } catch (err) {
          console.error('Parse message error:', err);
        }
      });

      wx.onSocketError((err) => {
        console.error('WebSocket error:', err);
        reject(err);
      });

      wx.onSocketClose(() => {
        console.log('WebSocket closed');
        this.isConnected = false;
        this.autoReconnect();
      });
    });
  }

  autoReconnect() {
    if (this.reconnectCount < this.maxReconnect) {
      this.reconnectCount++;
      console.log(`Reconnecting... (${this.reconnectCount}/${this.maxReconnect})`);
      this.reconnectTimer = setTimeout(() => {
        this.connect().catch(() => {});
      }, 2000);
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  off(type, callback) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  send(data) {
    if (this.isConnected) {
      wx.sendSocketMessage({
        data: JSON.stringify(data)
      });
      return true;
    } else {
      this.pendingMessages.push(data);
      return false;
    }
  }

  flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      this.send(msg);
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    wx.closeSocket();
  }
}

const socketService = new SocketService();

module.exports = socketService;
