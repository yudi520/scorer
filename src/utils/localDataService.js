/**
 * 本地数据服务 - 替代 WebSocket 依赖
 * 提供与 socketService 相同的 API 接口，使用本地数据存储
 */

class LocalDataService {
  constructor() {
    // 内存存储
    this.rooms = new Map();
    this.currentRoom = null;
    this.listeners = new Map();

    // 初始化一些测试数据
    this._initTestData();
  }

  /**
   * 初始化测试数据
   * @private
   */
  _initTestData() {
    const testRoom = {
      id: "test-room-001",
      name: "测试房间",
      inviteCode: "TEST01",
      players: [
        {
          id: "player-1",
          name: "张三",
          isHost: true,
          joinedAt: Date.now(),
        },
        {
          id: "player-2",
          name: "李四",
          isHost: false,
          joinedAt: Date.now() + 1000,
        },
      ],
      funds: [
        {
          id: "fund-1",
          playerId: "player-1",
          amount: 100,
          timestamp: Date.now(),
          description: "初始资金",
        },
      ],
      teaFees: [
        {
          id: "tea-1",
          amount: 50,
          timestamp: Date.now(),
          description: "茶水费",
        },
      ],
      createdAt: Date.now(),
      status: "active",
    };

    this.rooms.set(testRoom.id, testRoom);
    console.log("本地数据服务已初始化，测试房间已创建");
  }

  /**
   * 生成唯一ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成6位邀请码
   * @returns {string} 邀请码
   */
  generateInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 排除易混淆字符
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 创建房间
   * @param {Object} data - 房间数据 { name, playerName, playerCount, initialFund }
   * @returns {Object} roomCreated 事件数据
   */
  createRoom(data) {
    const { name, playerName, playerCount = 2, initialFund = 0 } = data;

    // 创建新房间
    const roomId = this._generateId();
    const inviteCode = this.generateInviteCode();

    // 创建房主
    const creator = {
      id: this._generateId(),
      name: playerName,
      isCreator: true,
      joinedAt: Date.now(),
    };

    const room = {
      id: roomId,
      name: name,
      inviteCode: inviteCode,
      players: [creator],
      funds:
        initialFund > 0
          ? [
              {
                id: this._generateId(),
                playerId: creator.id,
                amount: initialFund,
                timestamp: Date.now(),
                description: "初始资金",
                playerName: playerName,
              },
            ]
          : [],
      fundRecords:
        initialFund > 0
          ? [
              {
                id: this._generateId(),
                playerId: creator.id,
                amount: initialFund,
                timestamp: Date.now(),
                description: "初始资金",
                playerName: playerName,
              },
            ]
          : [],
      teaRecords: [],
      teaFees: [],
      playerCount: playerCount,
      initialFund: initialFund,
      createdAt: Date.now(),
      status: "active",
    };

    // 添加其他虚拟玩家（如果是单机使用）
    for (let i = 1; i < playerCount; i++) {
      room.players.push({
        id: this._generateId(),
        name: `玩家${i + 1}`,
        isCreator: false,
        joinedAt: Date.now() + i,
      });
    }

    this.rooms.set(roomId, room);
    this.currentRoom = room;

    // 触发 roomCreated 事件
    this.emit("roomCreated", {
      room: room,
    });

    console.log(`房间已创建: ${name} (${inviteCode})`);
    return room;
  }

  /**
   * 加入房间
   * @param {Object} data - 加入数据 { inviteCode, playerName }
   * @returns {Object} roomJoined 事件数据
   */
  joinRoom(data) {
    const { inviteCode, playerName } = data;

    // 查找房间
    const room = Array.from(this.rooms.values()).find(
      (r) => r.inviteCode === inviteCode,
    );

    if (!room) {
      this.emit("error", {
        message: "房间不存在或邀请码错误",
      });
      return;
    }

    // 检查玩家是否已在房间中
    const existingPlayer = room.players.find((p) => p.name === playerName);
    if (existingPlayer) {
      // 如果玩家已存在，直接返回房间（允许重连）
      this.currentRoom = room;
      this.emit("roomJoined", {
        room: room,
      });
      return;
    }

    // 添加玩家到房间
    const newPlayer = {
      id: this._generateId(),
      name: playerName,
      isCreator: false,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);
    this.currentRoom = room;

    // 触发 roomJoined 事件
    this.emit("roomJoined", {
      room: room,
    });

    console.log(`玩家 ${playerName} 加入房间 ${room.name}`);
    return room;
  }

  /**
   * 添加玩家到房间
   * @param {Object} data - 玩家数据 { roomId, playerName }
   * @returns {Object} playerAdded 事件数据
   */
  addPlayer(data) {
    const { roomId, playerName } = data;
    const room = this.rooms.get(roomId) || this.currentRoom;

    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    // 检查玩家是否已存在
    const existingPlayer = room.players.find((p) => p.name === playerName);
    if (existingPlayer) {
      this.emit("error", {
        message: "玩家已存在",
      });
      return;
    }

    // 添加新玩家
    const newPlayer = {
      id: this._generateId(),
      name: playerName,
      isCreator: false,
      joinedAt: Date.now(),
    };

    room.players.push(newPlayer);

    // 触发 playerAdded 事件
    this.emit("playerAdded", {
      room: room,
      player: newPlayer,
    });

    console.log(`玩家 ${playerName} 已添加到房间`);
    return newPlayer;
  }

  /**
   * 增加资金
   * @param {Object} data - 资金数据 { roomId, playerName, amount, description }
   * @returns {Object} fundAdded 事件数据
   */
  addFund(data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId) || this.currentRoom;
    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    // 找到玩家ID
    const player = room.players.find((p) => p.name === playerName);
    const playerId = player ? player.id : room.players[0].id;

    const fund = {
      id: this._generateId(),
      playerId: playerId,
      amount: parseFloat(amount),
      timestamp: Date.now(),
      description,
      playerName: playerName,
    };

    // 添加到两个数组（兼容新旧代码）
    room.funds.push(fund);
    if (!room.fundRecords) room.fundRecords = [];
    room.fundRecords.push(fund);

    // 初始化并更新共享资金池
    if (!room.poolAmount) room.poolAmount = 0;
    if (!room.operations) room.operations = [];
    room.poolAmount += fund.amount;
    room.operations.push(fund);

    // 触发 fundAdded 事件
    this.emit("fundAdded", {
      roomId: room.id,
      operation: fund,
      poolAmount: room.poolAmount,
      fund: fund, // 兼容旧代码
    });

    console.log(`资金已添加: ${amount}元 (${description || "无描述"})`);
    return fund;
  }

  /**
   * 减少资金
   * @param {Object} data - 资金数据 { roomId, playerName, amount, description }
   * @returns {Object} fundSubtracted 事件数据
   */
  subtractFund(data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId) || this.currentRoom;
    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    // 找到玩家ID
    const player = room.players.find((p) => p.name === playerName);
    const playerId = player ? player.id : room.players[0].id;

    const fund = {
      id: this._generateId(),
      playerId: playerId,
      amount: -parseFloat(amount), // 负数表示减少
      timestamp: Date.now(),
      description,
      playerName: playerName,
    };

    // 添加到两个数组
    room.funds.push(fund);
    if (!room.fundRecords) room.fundRecords = [];
    room.fundRecords.push(fund);

    // 初始化并更新共享资金池
    if (!room.poolAmount) room.poolAmount = 0;
    if (!room.operations) room.operations = [];
    room.poolAmount += fund.amount; // fund.amount 是负数
    room.operations.push(fund);

    // 触发 fundSubtracted 事件
    this.emit("fundSubtracted", {
      roomId: room.id,
      operation: fund,
      poolAmount: room.poolAmount,
      fund: fund, // 兼容旧代码
    });

    console.log(`资金已减少: ${amount}元 (${description || "无描述"})`);
    return fund;
  }

  /**
   * 添加茶水费
   * @param {Object} data - 茶水费数据 { roomId, playerName, amount, description }
   * @returns {Object} teaFeeAdded 事件数据
   */
  addTeaFee(data) {
    const { roomId, playerName, amount, description = "" } = data;

    const room = this.rooms.get(roomId) || this.currentRoom;
    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    const teaFee = {
      id: this._generateId(),
      amount: parseFloat(amount),
      timestamp: Date.now(),
      description,
      playerName: playerName,
    };

    // 添加到两个数组
    room.teaFees.push(teaFee);
    if (!room.teaRecords) room.teaRecords = [];
    room.teaRecords.push(teaFee);

    // 触发 teaFeeAdded 事件
    this.emit("teaFeeAdded", {
      roomId: room.id,
      teaFee: teaFee,
    });

    console.log(`茶水费已添加: ${amount}元 (${description || "无描述"})`);
    return teaFee;
  }

  /**
   * 计算结算
   * @param {Object} data - 结算数据 { roomId }
   * @returns {Object} settlementCalculated 事件数据
   */
  calculateSettlement(data) {
    const { roomId } = data;
    const room = this.rooms.get(roomId) || this.currentRoom;

    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    // 计算每个玩家的净收益
    const playerBalances = {};
    room.players.forEach((player) => {
      playerBalances[player.id] = {
        id: player.id,
        name: player.name,
        totalFunds: 0,
      };
    });

    // 汇总资金
    room.funds.forEach((fund) => {
      if (playerBalances[fund.playerId]) {
        playerBalances[fund.playerId].totalFunds += fund.amount;
      }
    });

    // 计算茶水费总额
    const totalTeaFee = room.teaFees.reduce((sum, fee) => sum + fee.amount, 0);

    // 计算每个玩家应分摊的茶水费
    const playerCount = room.players.length;
    const teaFeePerPlayer = totalTeaFee / playerCount;

    // 计算最终结算
    const settlements = Object.values(playerBalances).map((player) => {
      const netAmount = player.totalFunds - teaFeePerPlayer;
      return {
        playerId: player.id,
        playerName: player.name,
        totalFunds: player.totalFunds,
        teaFeeShare: teaFeePerPlayer,
        netAmount: netAmount,
      };
    });

    // 计算转账关系
    const transfers = [];
    const winners = settlements.filter((s) => s.netAmount > 0);
    const losers = settlements.filter((s) => s.netAmount < 0);

    losers.forEach((loser) => {
      const amountNeeded = Math.abs(loser.netAmount);
      let remaining = amountNeeded;

      winners.forEach((winner) => {
        if (remaining > 0 && winner.netAmount > 0) {
          const transferAmount = Math.min(remaining, winner.netAmount);
          transfers.push({
            from: loser.playerName,
            to: winner.playerName,
            amount: transferAmount,
          });
          remaining -= transferAmount;
        }
      });
    });

    const result = {
      roomId: room.id,
      settlements,
      totalTeaFee,
      teaFeePerPlayer,
      transfers,
      calculatedAt: Date.now(),
    };

    // 触发 settlementCalculated 事件
    this.emit("settlementCalculated", result);

    console.log("结算已计算完成");
    return result;
  }

  /**
   * 获取当前房间
   * @returns {Object|null} 当前房间
   */
  getCurrentRoom() {
    return this.currentRoom;
  }

  /**
   * 获取房间列表
   * @returns {Array} 房间列表
   */
  getRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * 根据ID获取房间
   * @param {string} roomId - 房间ID
   * @returns {Object|null} 房间
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * 根据邀请码获取房间
   * @param {string} inviteCode - 邀请码
   * @returns {Object|null} 房间
   */
  getRoomByInviteCode(inviteCode) {
    return Array.from(this.rooms.values()).find(
      (room) => room.inviteCode === inviteCode,
    );
  }

  /**
   * 注册事件监听器
   * @param {string} type - 事件类型
   * @param {Function} callback - 回调函数
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
    console.log(`事件监听已注册: ${type}`);
  }

  /**
   * 移除事件监听器
   * @param {string} type - 事件类型
   * @param {Function} callback - 回调函数
   */
  off(type, callback) {
    if (!this.listeners.has(type)) {
      return;
    }

    const callbacks = this.listeners.get(type);
    const index = callbacks.indexOf(callback);

    if (index > -1) {
      callbacks.splice(index, 1);
      console.log(`事件监听已移除: ${type}`);
    }

    // 如果没有回调了，删除这个事件类型
    if (callbacks.length === 0) {
      this.listeners.delete(type);
    }
  }

  /**
   * 触发事件
   * @param {string} type - 事件类型
   * @param {*} data - 事件数据
   */
  emit(type, data) {
    if (!this.listeners.has(type)) {
      return;
    }

    const callbacks = this.listeners.get(type);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`事件回调执行错误 [${type}]:`, error);
      }
    });

    console.log(`事件已触发: ${type}`, data);
  }

  /**
   * 清除所有数据（用于测试）
   */
  clearAll() {
    this.rooms.clear();
    this.currentRoom = null;
    this._initTestData();
    console.log("所有数据已清除，测试数据已重新初始化");
  }

  resetRoom(data) {
    const { roomId } = data;
    const room = this.rooms.get(roomId) || this.currentRoom;

    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    room.initialFund = 0;
    room.poolAmount = 0;
    room.funds = [];
    room.fundRecords = [];
    room.teaFees = [];
    room.teaRecords = [];
    room.operations = [];
    room.players = room.players.map((player) => ({
      ...player,
      initialFund: 0,
    }));

    this.emit("roomReset", { room });
    return room;
  }

  dissolveRoom(data) {
    const { roomId } = data;
    const room = this.rooms.get(roomId) || this.currentRoom;

    if (!room) {
      this.emit("error", {
        message: "房间不存在",
      });
      return;
    }

    this.rooms.delete(room.id);
    if (this.currentRoom && this.currentRoom.id === room.id) {
      this.currentRoom = null;
    }

    this.emit("roomDissolved", {
      roomId: room.id,
      inviteCode: room.inviteCode,
    });
    return room;
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态
   */
  getStatus() {
    return {
      isReady: true,
      roomCount: this.rooms.size,
      currentRoomId: this.currentRoom?.id || null,
      listenerCount: Array.from(this.listeners.values()).reduce(
        (sum, callbacks) => sum + callbacks.length,
        0,
      ),
    };
  }
}

// 创建单例实例
const localDataService = new LocalDataService();

// 导出单例和类（方便测试）
export default localDataService;
export { LocalDataService };
