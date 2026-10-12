const socketService = require("../../utils/socket.js");

function formatTime(isoString) {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    currentUser: null,
    records: [],
    showModal: false,
    modalType: "deposit",
    amount: "",
    note: "",
    presetAmountRows: [
      ["1", "5", "10", "15", "20", "30"],
      ["40", "50", "60", "70", "80", "100"],
    ],
  },

  onShow() {
    this.loadData();
    this.setupListeners();
  },

  setupListeners() {
    socketService.on("balanceUpdated", (data) => {
      const room = wx.getStorageSync("currentRoom");
      if (room) {
        const userInfo = wx.getStorageSync("userInfo");
        if (data.openid === userInfo.openid) {
          this.loadData();
        }
      }
    });
  },

  loadData() {
    const room = wx.getStorageSync("currentRoom");
    const userInfo = wx.getStorageSync("userInfo");

    if (!room || !userInfo) {
      wx.showToast({ title: "请先加入房间", icon: "none" });
      return;
    }

    const member = room.members.find((m) => m.openid === userInfo.openid);
    const records = (room.fundRecords || [])
      .filter((r) => r.openid === userInfo.openid)
      .reverse();

    this.setData({
      currentUser: member,
      records: records,
    });
  },

  showDepositModal() {
    this.setData({
      showModal: true,
      modalType: "deposit",
      amount: "",
      note: "",
    });
  },

  showWithdrawModal() {
    this.setData({
      showModal: true,
      modalType: "withdraw",
      amount: "",
      note: "",
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  selectAmount(e) {
    const { amount } = e.currentTarget.dataset;
    this.setData({ amount: String(amount) });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  confirmAction() {
    const { modalType, amount, note } = this.data;

    if (!amount || parseFloat(amount) <= 0) {
      wx.showToast({ title: "请输入有效金额", icon: "none" });
      return;
    }

    const room = wx.getStorageSync("currentRoom");
    const userInfo = wx.getStorageSync("userInfo");
    const member = room.members.find((m) => m.openid === userInfo.openid);

    const amountNum = parseFloat(amount);

    if (modalType === "withdraw" && member.balance < amountNum) {
      wx.showToast({ title: "余额不足", icon: "none" });
      return;
    }

    socketService.send({
      type: modalType,
      roomCode: room.code,
      openid: userInfo.openid,
      amount: amountNum,
      note: note || "",
    });

    this.setData({ showModal: false });
  },

  onUnload() {
    socketService.off("balanceUpdated");
  },
});
