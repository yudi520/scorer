const socketService = require('../../../utils/socket.js');

Page({
  data: {
    roomName: '',
    initialBalance: '100',
    nickname: ''
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ nickname: userInfo.nickname || '' });
    }
  },

  onNameInput(e) {
    this.setData({ roomName: e.detail.value });
  },

  onBalanceInput(e) {
    this.setData({ initialBalance: e.detail.value });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  createRoom() {
    const { roomName, initialBalance, nickname } = this.data;

    if (!roomName.trim()) {
      wx.showToast({ title: '请输入房间名称', icon: 'none' });
      return;
    }

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    const balance = parseFloat(initialBalance) || 100;
    const userInfo = wx.getStorageSync('userInfo');
    
    userInfo.nickname = nickname.trim();
    wx.setStorageSync('userInfo', userInfo);

    socketService.send({
      type: 'createRoom',
      name: roomName.trim(),
      initialBalance: balance,
      openid: userInfo.openid,
      nickname: nickname.trim(),
      avatar: ''
    });

    const tempRoom = {
      code: '...',
      name: roomName.trim(),
      ownerOpenid: userInfo.openid,
      initialBalance: balance,
      teaTotal: 0,
      teaRecords: [],
      fundRecords: [],
      members: [{
        openid: userInfo.openid,
        nickname: nickname.trim(),
        avatar: '',
        balance: balance,
        isOwner: true,
        joinTime: new Date().toISOString()
      }]
    };
    
    wx.setStorageSync('currentRoom', tempRoom);
    wx.navigateTo({ url: '/pages/room/room' });
  }
});
