/**
 * 嵌入式服务器 - 简化版
 * 提供 WebSocket 和 HTTP 静态文件服务
 */

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");

let cordovaBridge = null;
try {
  cordovaBridge = require("cordova-bridge");
} catch (error) {
  // Local Node runs do not expose the Cordova bridge module.
}

class EmbeddedServer {
  constructor() {
    this.httpServer = null;
    this.wsServer = null;
    this.port = 8080;
    this.rooms = new Map();
    this.staticRoot = this.resolveStaticRoot();
  }

  resolveStaticRoot() {
    const candidates = [
      path.join(__dirname, "dist"),
      path.join(__dirname, "../dist"),
      path.join(__dirname, ".."),
      path.join(process.cwd(), "dist"),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, "index.html"))) {
        return candidate;
      }
    }

    return candidates[0];
  }

  /**
   * 启动服务器
   */
  start() {
    try {
      // 创建 HTTP 服务器
      this.httpServer = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      // 创建 WebSocket 服务器
      this.wsServer = new WebSocket.Server({ server: this.httpServer });

      this.wsServer.on("connection", (ws, req) => {
        this.handleWebSocketConnection(ws, req);
      });

      // 启动监听
      this.httpServer.listen(this.port, "0.0.0.0", () => {
        const serverInfo = this.getServerInfo();
        console.log("✅ 服务器已启动在端口", this.port);
        console.log("📝 访问地址: http://localhost:" + this.port);

        // 通知 Cordova 前端服务器已启动
        try {
          if (cordovaBridge && cordovaBridge.channel) {
            cordovaBridge.channel.post("server-started", serverInfo);
            console.log("已通知前端服务器启动成功");
          }
        } catch (err) {
          console.log(
            "无法通知前端（可能不在 nodejs-mobile 环境）:",
            err.message,
          );
        }
      });

      // 错误处理
      this.httpServer.on("error", (err) => {
        console.error("❌ HTTP 服务器错误:", err);
        process.exit(1);
      });

      return this.getServerInfo();
    } catch (err) {
      console.error("❌ 启动失败:", err);
      process.exit(1);
    }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo() {
    const lanIp = this.getLanIp();
    const lanUrl =
      this.port === 80 ? `http://${lanIp}` : `http://${lanIp}:${this.port}`;

    return {
      port: this.port,
      lanIp,
      lanUrl,
      qrCodeUrl: lanUrl,
    };
  }

  getLanIp() {
    const interfaces = os.networkInterfaces();

    for (const networkEntries of Object.values(interfaces)) {
      for (const network of networkEntries || []) {
        const family =
          typeof network.family === "string"
            ? network.family
            : network.family === 4
              ? "IPv4"
              : "";

        if (!network.internal && family === "IPv4") {
          return network.address;
        }
      }
    }

    return "127.0.0.1";
  }

  /**
   * 处理 HTTP 请求
   */
  handleHttpRequest(req, res) {
    // 处理 API 请求
    if (req.url.startsWith("/api/")) {
      this.handleApiRequest(req, res);
      return;
    }

    // 处理静态文件请求
    this.serveStaticFile(req, res);
  }

  /**
   * 处理 API 请求
   */
  handleApiRequest(req, res) {
    const url = req.url.substring(5); // 移除 '/api/'
    const [path, query] = url.split("?");

    res.setHeader("Content-Type", "application/json");

    switch (path) {
      case "server-info":
        const info = this.getServerInfo();
        res.writeHead(200);
        res.end(JSON.stringify(info));
        break;

      case "rooms":
        if (req.method === "GET") {
          res.writeHead(200);
          res.end(JSON.stringify(Array.from(this.rooms.values())));
        }
        break;

      default:
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
    }
  }

  /**
   * 提供静态文件服务
   */
  serveStaticFile(req, res) {
    // 请求根路径返回 index.html
    let filePath = req.url === "/" ? "/index.html" : req.url;

    // 安全检查：防止路径遍历攻击
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/g, "");
    const relativePath = safePath.replace(/^[/\\]+/, "");
    const fullPath = path.join(this.staticRoot, relativePath);

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("File not found");
        return;
      }

      // 设置正确的 Content-Type
      const ext = path.extname(fullPath);
      const contentTypes = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".svg": "image/svg+xml",
      };

      res.setHeader(
        "Content-Type",
        contentTypes[ext] || "application/octet-stream",
      );
      res.writeHead(200);
      res.end(data);
    });
  }

  /**
   * 处理 WebSocket 连接
   */
  handleWebSocketConnection(ws, req) {
    console.log("新客户端连接:", req.socket.remoteAddress);

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(ws, message);
      } catch (err) {
        console.error("消息解析错误:", err);
      }
    });

    ws.on("close", () => {
      console.log("客户端断开连接");
      this.handleDisconnect(ws);
    });

    // 发送欢迎消息
    ws.send(
      JSON.stringify({
        type: "connected",
        data: { message: "已连接到服务器" },
      }),
    );
  }

  /**
   * 处理客户端消息
   */
  handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case "createRoom":
        this.createRoom(ws, data);
        break;

      case "joinRoom":
        this.joinRoom(ws, data);
        break;

      case "addFund":
        this.addFund(ws, data);
        break;

      case "subtractFund":
        this.subtractFund(ws, data);
        break;

      case "addTeaFee":
        this.addTeaFee(ws, data);
        break;

      case "calculateSettlement":
        this.calculateSettlement(ws, data);
        break;

      case "dissolveRoom":
        this.dissolveRoom(ws, data);
        break;

      case "resetRoom":
        this.resetRoom(ws, data);
        break;

      default:
        console.log("未知消息类型:", type);
    }
  }

  /**
   * 创建房间
   */
  createRoom(ws, data) {
    const { name, playerName, playerCount = 2, initialFund = 0 } = data;

    const creatorId = this.generateId();
    const room = {
      id: this.generateId(),
      name,
      inviteCode: this.generateInviteCode(),
      playerCount,
      initialFund: parseFloat(initialFund) || 0,
      poolAmount: 0,
      operations: [],
      teaRecords: [],
      players: [
        {
          id: creatorId,
          name: playerName,
          isCreator: true,
          initialFund: parseFloat(initialFund) || 0,
          joinedAt: Date.now(),
        },
        {
          id: "tea-bot",
          name: "茶水",
          isBot: true,
          isCreator: false,
          initialFund: 0,
          joinedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      status: "active",
    };

    this.rooms.set(room.id, room);

    // 只发送给创建者（不需要广播，因为只有创建者在房间里）
    ws.send(
      JSON.stringify({
        type: "roomCreated",
        data: { room },
      }),
    );

    console.log(
      `房间已创建: ${name} (${room.inviteCode}), 初始资金: ${room.initialFund}`,
    );
  }

  /**
   * 加入房间
   */
  joinRoom(ws, data) {
    const { inviteCode, playerName } = data;

    const room = Array.from(this.rooms.values()).find(
      (r) => r.inviteCode === inviteCode,
    );

    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在或邀请码错误" },
        }),
      );
      return;
    }

    // 检查房间是否已解散
    if (room.status === "dissolved") {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间已解散" },
        }),
      );
      return;
    }

    // 检查玩家是否已存在
    const existingPlayer = room.players.find((p) => p.name === playerName);
    if (existingPlayer) {
      // 已存在，直接发送房间信息
      ws.send(
        JSON.stringify({
          type: "roomJoined",
          data: { room },
        }),
      );
      return;
    }

    // 检查房间人数是否已满（不包括茶水bot）
    const realPlayerCount = room.players.filter((p) => !p.isBot).length;
    if (realPlayerCount >= room.playerCount) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间人数已满" },
        }),
      );
      return;
    }

    // 添加新玩家
    const newPlayer = {
      id: this.generateId(),
      name: playerName,
      isCreator: false,
      initialFund: room.initialFund,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);

    // 先发送给新玩家
    ws.send(
      JSON.stringify({
        type: "roomJoined",
        data: { room },
      }),
    );

    // 广播给房间所有人（包括新玩家），通知有新玩家加入
    this.broadcastToRoom(room.id, {
      type: "playerJoined",
      data: { room, player: newPlayer },
    });

    console.log(
      `玩家 ${playerName} 加入房间 ${room.name}，当前玩家数: ${realPlayerCount + 1}/${room.playerCount}`,
    );
  }

  /**
   * 添加资金到池子
   */
  addFund(ws, data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    const player = room.players.find((p) => p.name === playerName);
    const playerId = player ? player.id : room.players[0].id;

    const operation = {
      id: this.generateId(),
      playerId,
      playerName,
      amount: parseFloat(amount),
      description,
      timestamp: Date.now(),
    };

    room.operations.push(operation);
    room.poolAmount += operation.amount;

    // 广播给房间所有人
    this.broadcastToRoom(roomId, {
      type: "fundAdded",
      data: { roomId, operation, poolAmount: room.poolAmount },
    });

    console.log(`资金已添加: ${amount}元, 当前池子: ${room.poolAmount}元`);
  }

  /**
   * 从池子取出资金
   */
  subtractFund(ws, data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    const player = room.players.find((p) => p.name === playerName);
    const playerId = player ? player.id : room.players[0].id;

    const operation = {
      id: this.generateId(),
      playerId,
      playerName,
      amount: -parseFloat(amount), // 负数表示取出
      description,
      timestamp: Date.now(),
    };

    room.operations.push(operation);
    room.poolAmount += operation.amount;

    // 广播给房间所有人
    this.broadcastToRoom(roomId, {
      type: "fundSubtracted",
      data: { roomId, operation, poolAmount: room.poolAmount },
    });

    console.log(`资金已取出: ${amount}元, 当前池子: ${room.poolAmount}元`);
  }

  /**
   * 添加茶水费
   */
  addTeaFee(ws, data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    const player = room.players.find((p) => p.name === playerName);
    const teaBot = room.players.find((p) => p.name === "茶水");

    if (!player || !teaBot) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "玩家或茶水bot不存在" },
        }),
      );
      return;
    }

    const amountValue = parseFloat(amount);

    // 玩家扣钱（存入操作，正数）
    const playerOperation = {
      id: this.generateId(),
      playerId: player.id,
      playerName: playerName,
      amount: amountValue, // 正数表示存入（玩家扣钱）
      description: description,
      timestamp: Date.now(),
    };

    // 茶水bot加钱（取出操作，负数）
    const teaOperation = {
      id: this.generateId(),
      playerId: teaBot.id,
      playerName: "茶水",
      amount: -amountValue, // 负数表示取出（茶水加钱）
      description: description,
      timestamp: Date.now(),
    };

    room.operations.push(playerOperation);
    room.operations.push(teaOperation);

    // 流水池不变（一进一出，互相抵消）

    // 广播给房间所有人
    this.broadcastToRoom(roomId, {
      type: "teaFeeAdded",
      data: {
        roomId,
        playerOperation,
        teaOperation,
        poolAmount: room.poolAmount,
      },
    });

    console.log(`茶水费已添加: ${playerName} 支付 ${amount}元`);
  }

  /**
   * 计算结算
   */
  calculateSettlement(ws, data) {
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    // 茶水费总额
    const totalTeaFee = room.teaRecords.reduce((sum, r) => sum + r.amount, 0);
    const teaFeePerPlayer = totalTeaFee / room.players.length;

    // 计算结算结果
    const settlements = room.players.map((player) => {
      // 该玩家的存取总额
      const playerOperations = room.operations.filter(
        (o) => o.playerId === player.id,
      );
      const playerTotal = playerOperations.reduce(
        (sum, o) => sum + o.amount,
        0,
      );

      return {
        playerId: player.id,
        playerName: player.name,
        operationTotal: playerTotal,
        teaFeeShare: teaFeePerPlayer,
        netAmount: playerTotal - teaFeePerPlayer,
      };
    });

    const result = {
      roomId,
      settlements,
      poolAmount: room.poolAmount,
      totalTeaFee,
      teaFeePerPlayer,
      calculatedAt: Date.now(),
    };

    // 广播给房间所有人
    this.broadcastToRoom(roomId, {
      type: "settlementCalculated",
      data: result,
    });

    console.log("结算已计算完成");
  }

  /**
   * 解散房间
   */
  dissolveRoom(ws, data) {
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    // 标记房间为已解散
    room.status = "dissolved";

    // 广播给所有客户端
    this.broadcastToRoom(roomId, {
      type: "roomDissolved",
      data: { roomId },
    });

    // 从房间列表中删除
    this.rooms.delete(roomId);

    console.log(`房间已解散: ${room.name} (${room.inviteCode})`);
  }

  /**
   * 清零房间
   */
  resetRoom(ws, data) {
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "房间不存在" },
        }),
      );
      return;
    }

    room.poolAmount = 0;
    room.initialFund = 0;
    room.operations = [];
    room.teaRecords = [];
    room.players = room.players.map((player) => ({
      ...player,
      initialFund: 0,
    }));

    this.broadcastToRoom(roomId, {
      type: "roomReset",
      data: { room },
    });

    console.log(`房间已清零: ${room.name} (${room.inviteCode})`);
  }

  /**
   * 广播消息到房间所有客户端
   */
  broadcastToRoom(roomId, message) {
    const msg = JSON.stringify(message);

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  /**
   * 处理客户端断开
   */
  handleDisconnect(ws) {
    // 可以在这里处理断开逻辑，比如标记玩家离线
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成6位邀请码
   */
  generateInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.wsServer) {
      this.wsServer.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    console.log("服务器已停止");
  }
}

// 当直接运行此文件时，自动启动服务器
if (require.main === module) {
  const server = new EmbeddedServer();
  server.start();
}

module.exports = EmbeddedServer;
