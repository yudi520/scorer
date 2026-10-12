const DEFAULT_SERVER_URL = "ws://localhost:8080";

class SocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectCount = 0;
    this.maxReconnect = 5;
    this.isConnected = false;
    this.pendingMessages = [];
    this.maxPendingMessages = 100;
    this.isConnecting = false;
    this.isFlushingPending = false;
    this.useNativeWebSocket = false;

    // 自动检测服务器地址
    this.serverUrl = this.autoDetectServerUrl();
  }

  isEmbeddedRuntime() {
    if (typeof window === "undefined") {
      return false;
    }

    if (window.cordova || window.nodejs || window.__SCORER_EMBEDDED_RUNTIME__) {
      return true;
    }

    const location = window.location;
    if (!location) {
      return false;
    }

    const isLocalhostAssetLoader =
      location.protocol === "https:" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1");

    return isLocalhostAssetLoader;
  }

  /**
   * 自动检测服务器地址
   * 在 H5 模式下，使用当前页面的 host
   * 在 Cordova/Android 模式下，使用 localhost
   */
  autoDetectServerUrl() {
    if (this.isEmbeddedRuntime()) {
      console.log("检测到嵌入式运行环境，使用本地服务器:", DEFAULT_SERVER_URL);
      return DEFAULT_SERVER_URL;
    }

    // H5 模式：使用当前页面的 host
    if (
      typeof window !== "undefined" &&
      window.location &&
      window.location.host
    ) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      console.log("H5 模式，使用当前页面 host:", `${protocol}//${host}`);
      return `${protocol}//${host}`;
    }

    return DEFAULT_SERVER_URL;
  }

  /**
   * 设置服务器地址
   */
  setServerUrl(url) {
    this.serverUrl = url;
    console.log("服务器地址已设置:", url);
  }

  connect(customUrl) {
    const requestedUrl = customUrl || this.serverUrl;
    const serverUrl =
      this.isEmbeddedRuntime() && !customUrl
        ? DEFAULT_SERVER_URL
        : requestedUrl;

    // 调试输出
    if (typeof window !== "undefined" && window.debugLog) {
      window.debugLog("WebSocket.connect() 开始");
      window.debugLog("目标 URL: " + serverUrl);
      window.debugLog(
        "embeddedRuntime: " + (this.isEmbeddedRuntime() ? "true" : "false"),
      );
    }

    // I2: Check if already connected or connecting
    if (this.isConnected) {
      if (typeof window !== "undefined" && window.debugLog) {
        window.debugLog("✓ 已连接");
      }
      return Promise.resolve();
    }

    if (this.isConnecting) {
      if (typeof window !== "undefined" && window.debugLog) {
        window.debugLog("✗ 正在连接中");
      }
      return Promise.reject(new Error("Connection already in progress"));
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      let settled = false;

      const isEmbeddedRuntime = this.isEmbeddedRuntime();
      const timeoutDuration = isEmbeddedRuntime ? 20000 : 10000;
      let retryTimer = null;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.isConnecting = false;
          if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
          }
          if (typeof window !== "undefined" && window.debugLog) {
            window.debugLog("✗ 连接超时");
          }
          reject(new Error("Connection timeout"));
        }
      }, timeoutDuration);

      const cleanupRetryTimer = () => {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
      };

      const scheduleRetry = (reason) => {
        if (!isEmbeddedRuntime || settled || retryTimer) {
          return false;
        }

        console.log(`WebSocket 连接未就绪，等待重试: ${reason}`);
        retryTimer = setTimeout(() => {
          retryTimer = null;
          attemptConnection();
        }, 500);
        return true;
      };

      if (typeof window !== "undefined" && window.debugLog) {
        window.debugLog("开始连接 WebSocket...");
      }

      console.log(
        `尝试连接 WebSocket: ${serverUrl} (超时: ${timeoutDuration}ms)`,
      );

      const attemptConnection = () => {
        if (settled) {
          return;
        }

        try {
          this.ws = new WebSocket(serverUrl);
          if (typeof window !== "undefined" && window.debugLog) {
            window.debugLog("WebSocket 对象已创建");
          }

          this.ws.onopen = () => {
            if (!settled) {
              settled = true;
              cleanupRetryTimer();
              clearTimeout(timeoutId);
              console.log("WebSocket connected to:", serverUrl);
              if (typeof window !== "undefined" && window.debugLog) {
                window.debugLog("✓ WebSocket 连接成功");
              }
              this.isConnected = true;
              this.isConnecting = false;
              this.reconnectCount = 0;
              this.flushPendingMessages();
              resolve();
            }
          };

          this.ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log("收到 WebSocket 消息:", message);
              const callbacks = this.listeners.get(message.type);
              if (callbacks) {
                callbacks.forEach((cb) => cb(message.data));
              }
            } catch (err) {
              console.error("Parse message error:", err);
            }
          };

          this.ws.onerror = (err) => {
            if (settled) {
              return;
            }

            console.error("WebSocket error:", err);
            if (typeof window !== "undefined" && window.debugLog) {
              window.debugLog("✗ WebSocket 错误: connection failed");
            }

            if (scheduleRetry("error")) {
              return;
            }

            settled = true;
            cleanupRetryTimer();
            clearTimeout(timeoutId);
            this.isConnecting = false;
            reject(new Error("WebSocket connection failed"));
          };

          this.ws.onclose = () => {
            console.log("WebSocket closed");
            if (typeof window !== "undefined" && window.debugLog) {
              window.debugLog("WebSocket 连接关闭");
            }
            this.isConnected = false;

            if (!settled && scheduleRetry("close")) {
              return;
            }

            if (!settled) {
              settled = true;
              cleanupRetryTimer();
              clearTimeout(timeoutId);
              this.isConnecting = false;
              this.autoReconnect();
            } else {
              this.isConnecting = false;
            }
          };
        } catch (err) {
          if (!settled) {
            if (typeof window !== "undefined" && window.debugLog) {
              window.debugLog("✗ WebSocket 创建失败: " + err.message);
            }

            if (scheduleRetry(`create failed: ${err.message}`)) {
              return;
            }

            settled = true;
            cleanupRetryTimer();
            clearTimeout(timeoutId);
            this.isConnecting = false;
            reject(err);
          }
        }
      };

      attemptConnection();
    });
  }

  autoReconnect() {
    if (this.reconnectCount < this.maxReconnect) {
      this.reconnectCount++;
      console.log(
        `Reconnecting... (${this.reconnectCount}/${this.maxReconnect})`,
      );
      this.reconnectTimer = setTimeout(() => {
        // N3: Add error logging to autoReconnect catch block
        this.connect().catch((err) => {
          console.error("Auto-reconnect failed:", err);
        });
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

  send(data, bypassQueue = false) {
    if (this.isConnected) {
      try {
        const messageStr = JSON.stringify(data);

        // 使用原生 WebSocket 发送
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(messageStr);
          return true;
        }
      } catch (err) {
        console.error("Send message error:", err);
        // N1: If send fails during flush, don't re-queue to prevent infinite loop
        if (!bypassQueue) {
          if (this.pendingMessages.length >= this.maxPendingMessages) {
            // Drop oldest message when queue is full
            this.pendingMessages.shift();
            console.warn("Pending message queue full, dropped oldest message");
          }
          this.pendingMessages.push(data);
        }
        return false;
      }
    } else {
      // I1: Limit pending messages to maxPendingMessages
      // N1: Don't queue if bypassQueue is true (called from flush)
      if (!bypassQueue) {
        if (this.pendingMessages.length >= this.maxPendingMessages) {
          // Drop oldest message when queue is full
          this.pendingMessages.shift();
          console.warn("Pending message queue full, dropped oldest message");
        }
        this.pendingMessages.push(data);
      }
      return false;
    }
  }

  flushPendingMessages() {
    // N1: Prevent re-entrancy and infinite loop
    if (this.isFlushingPending) {
      return;
    }

    // N1: Clear the queue first, then iterate to prevent infinite loop if send() fails
    const messages = this.pendingMessages.splice(0); // Creates a copy and clears the array

    if (messages.length === 0) {
      return;
    }

    this.isFlushingPending = true;

    for (const msg of messages) {
      // N1: Use bypassQueue flag to prevent re-queueing if send fails
      this.send(msg, true);
    }

    this.isFlushingPending = false;
  }

  close() {
    // I3: Complete cleanup - reset all state
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 关闭原生 WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear all message listeners
    this.listeners.clear();

    // Clear pending messages
    this.pendingMessages = [];

    // Reset reconnect state
    this.reconnectCount = 0;

    // Reset connection flags
    this.isConnected = false;
    this.isConnecting = false;
  }
}

const socketService = new SocketService();

export default socketService;
