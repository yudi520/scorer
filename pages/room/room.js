const socketService = require('../../utils/socket.js');

Page({
  data: {
    room: null,
    isOwner: false,
    showModal: false,
    teaPerPerson: 0
  },

  onShow() {
    this.loadRoomData();
    this.setupListeners();
  },

  setupListeners() {
    socketService.on('memberJoined', (data) => {
      const room = wx.getStorageSync('currentRoom');
      if (room) {
        room.members.push(data.member);
        wx.setStorageSync('currentRoom', room);
        this.loadRoomData();
      }
    });

    socketService.on('memberRemoved', (data) => {
      const userInfo = wx.getStorageSync('userInfo');
      if (data.openid === userInfo.openid) {
        wx.showToast({ title: '你已被移出房间', icon: 'none' });
        wx.removeStorageSync('currentRoom');
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/index/index' });
        }, 1500);
      } else {
        this.loadRoomData();
      }
    });

    socketService.on('balanceUpdated', (data) => {
      const room = wx.getStorageSync('currentRoom');
      if (room) {
        const member = room.members.find(m => m.openid === data.openid);
        if (member) {
          member.balance = data.balance;
        }
        room.fundRecords.push(data.record);
        wx.setStorageSync('currentRoom', room);
        this.loadRoomData();
      }
    });

    socketService.on('teaUpdated', (data) => {
      const room = wx.getStorageSync('currentRoom');
      if (room) {
        room.teaTotal = data.teaTotal;
        room.teaRecords.push(data.record);
        wx.setStorageSync('currentRoom', room);
        this.loadRoomData();
      }
    });
  },

  loadRoomData() {
    const room = wx.getStorageSync('currentRoom');
    if (!room) {
      wx.showToast({ title: '请先加入房间', icon: 'none' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    const isOwner = room.ownerOpenid === userInfo.openid;
    
    const memberCount = room.members ? room.members.length : 1;
    const teaPerPerson = room.teaTotal ? (room.teaTotal / memberCount).toFixed(2) : 0;

    this.setData({
      room: room,
      isOwner: isOwner,
      teaPerPerson: teaPerPerson
    });
  },

  copyCode() {
    if (this.data.room && this.data.room.code) {
      wx.setClipboardData({
        data: this.data.room.code,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  showInviteDialog() {
    this.setData({ showModal: true });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  copyInviteCode() {
    if (this.data.room && this.data.room.code) {
      wx.setClipboardData({
        data: this.data.room.code,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' });
          this.setData({ showModal: false });
        }
      });
    }
  },

  removeMember(e) {
    const openid = e.currentTarget.dataset.openid;
    
    wx.showModal({
      title: '提示',
      content: '确定要移除该成员吗？',
      success: (res) => {
        if (res.confirm) {
          this.doRemoveMember(openid);
        }
      }
    });
  },

  doRemoveMember(targetOpenid) {
    const room = wx.getStorageSync('currentRoom');
    const userInfo = wx.getStorageSync('userInfo');

    socketService.send({
      type: 'removeMember',
      roomCode: room.code,
      targetOpenid: targetOpenid,
      openid: userInfo.openid
    });

    this.loadRoomData();
  },

  shareRoom() {
    this.setData({ showModal: true });
  },

  onUnload() {
    socketService.off('memberJoined');
    socketService.off('memberRemoved');
    socketService.off('balanceUpdated');
    socketService.off('teaUpdated');
  }
});
