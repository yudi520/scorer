const socketService = require('../../utils/socket.js');

function generateOpenid() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    showModal: false,
    joinCode: '',
    recentRooms: [],
    isConnecting: false,
    isConnected: false
  },

  onLoad() {
    this.initSocket();
  },

  async initSocket() {
    if (this.data.isConnecting) return;
    
    this.setData({ isConnecting: true });
    
    let userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      userInfo = {
        openid: generateOpenid(),
        nickname: '玩家' + Math.floor(Math.random() * 1000)
      };
      wx.setStorageSync('userInfo', userInfo);
    }

    try {
      await socketService.connect();
      this.setData({ isConnected: true });
      this.loadRecentRooms();
      this.setupListeners();
    } catch (err) {
      wx.showToast({ title: '连接服务器失败', icon: 'none' });
    } finally {
      this.setData({ isConnecting: false });
    }
  },

  setupListeners() {
    socketService.on('roomJoined', (data) => {
      wx.setStorageSync('currentRoom', data.room);
      this.saveRecentRoom(data.room);
      wx.navigateTo({ url: '/pages/room/room' });
    });

    socketService.on('roomCreated', (data) => {
      wx.setStorageSync('currentRoom', data.room);
      this.saveRecentRoom(data.room);
      wx.navigateTo({ url: '/pages/room/room' });
    });

    socketService.on('error', (data) => {
      wx.showToast({ title: data.message, icon: 'none' });
    });
  },

  loadRecentRooms() {
    const recentRooms = wx.getStorageSync('recentRooms') || [];
    this.setData({ recentRooms });
  },

  saveRecentRoom(room) {
    let recentRooms = wx.getStorageSync('recentRooms') || [];
    recentRooms = recentRooms.filter(r => r.code !== room.code);
    recentRooms.unshift(room);
    if (recentRooms.length > 5) {
      recentRooms = recentRooms.slice(0, 5);
    }
    wx.setStorageSync('recentRooms', recentRooms);
    this.setData({ recentRooms });
  },

  onShow() {
    this.loadRecentRooms();
  },

  createRoom() {
    wx.navigateTo({
      url: '/pages/room/create/create'
    });
  },

  showJoinDialog() {
    this.setData({ showModal: true, joinCode: '' });
  },

  hideModal() {
    this.setData({ showModal: false, joinCode: '' });
  },

  onCodeInput(e) {
    this.setData({ joinCode: e.detail.value.toUpperCase() });
  },

  confirmJoin() {
    const code = this.data.joinCode;
    if (!code || code.length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' });
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    
    socketService.send({
      type: 'joinRoom',
      code: code,
      openid: userInfo.openid,
      nickname: userInfo.nickname,
      avatar: ''
    });
  },

  joinRoomById(e) {
    const room = e.currentTarget.dataset.room;
    wx.setStorageSync('currentRoom', room);
    wx.navigateTo({ url: '/pages/room/room' });
  },

  onUnload() {
    socketService.off('roomJoined');
    socketService.off('roomCreated');
    socketService.off('error');
  }
});
