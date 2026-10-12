<template>
    <view class="page">
        <!-- 顶部导航栏 -->
        <view class="navbar">
            <view class="nav-left" @tap="goBack">
                <text class="nav-icon">←</text>
            </view>
            <view class="nav-center">
                <text
                    class="nav-server"
                    v-if="serverAddress"
                    @tap="copyServerAddress"
                    >IP: {{ serverAddress }}</text
                >
                <text class="nav-title">{{ room.name }}</text>
            </view>
            <view class="nav-right">
                <view
                    class="nav-action reset-action"
                    @tap="showResetConfirm"
                    v-if="isCreator"
                >
                    <text class="nav-action-text">清零</text>
                </view>
                <view class="invite-code-badge" @tap="showRoomMenu">
                    <text>{{ room.inviteCode }}</text>
                    <text class="invite-code-arrow">▾</text>
                </view>
            </view>
        </view>

        <!-- 玩家横向滚动 -->
        <view class="players-bar">
            <scroll-view class="players-scroll-h" scroll-x>
                <view class="players-list-h">
                    <view
                        class="player-card-h"
                        v-for="player in playersWithStats"
                        :key="player.id"
                    >
                        <view
                            class="player-avatar-h"
                            :style="{ background: player.avatarColor }"
                        >
                            <text class="avatar-emoji-h">{{
                                player.avatar
                            }}</text>
                        </view>
                        <text class="player-name-h">{{ player.name }}</text>
                        <text
                            class="player-balance-h"
                            :class="
                                player.balance >= 0 ? 'positive' : 'negative'
                            "
                        >
                            {{ player.balance.toFixed(2) }}
                        </text>
                    </view>
                </view>
            </scroll-view>
        </view>

        <!-- 资金池卡片 -->
        <view class="pool-card">
            <text class="pool-label">流水池</text>
            <text class="pool-amount">{{ poolAmount.toFixed(2) }}</text>
            <view class="pool-actions">
                <button class="pool-btn deposit" @tap="showDepositModal">
                    <text class="btn-icon">💰</text>
                    <text>存入</text>
                </button>
                <button class="pool-btn withdraw" @tap="showWithdrawModal">
                    <text class="btn-icon">💸</text>
                    <text>取出</text>
                </button>
                <button class="pool-btn tea" @tap="showTeaModal">
                    <text class="btn-icon">🍵</text>
                    <text>茶水</text>
                </button>
            </view>
        </view>

        <!-- 操作记录 -->
        <view class="records-section">
            <view class="section-title">
                <text class="title-text">操作记录</text>
                <text class="title-count">{{ operations.length }}条</text>
            </view>
            <scroll-view class="records-scroll" scroll-y>
                <view class="record-item" v-for="op in operations" :key="op.id">
                    <view class="record-left">
                        <view
                            class="record-avatar"
                            :style="{
                                background: getPlayerColor(op.playerName),
                            }"
                        >
                            <text class="avatar-emoji">{{
                                getPlayerAvatar(op.playerName)
                            }}</text>
                        </view>
                        <view class="record-info">
                            <text class="record-player">{{
                                op.playerName
                            }}</text>
                            <text class="record-time">{{
                                formatTime(op.timestamp)
                            }}</text>
                        </view>
                    </view>
                    <view class="record-right">
                        <text
                            class="record-amount"
                            :class="op.amount >= 0 ? 'positive' : 'negative'"
                        >
                            {{ op.amount >= 0 ? "+" : ""
                            }}{{ op.amount.toFixed(2) }}
                        </text>
                        <text class="record-desc">{{ op.description }}</text>
                    </view>
                </view>
                <view class="empty-records" v-if="operations.length === 0">
                    <text class="empty-icon">📝</text>
                    <text class="empty-text">暂无操作记录</text>
                </view>
            </scroll-view>
        </view>

        <!-- 存入弹窗 -->
        <view
            class="modal-overlay"
            v-if="showDepositDialog"
            @tap="hideDepositModal"
        >
            <view class="modal-container fund-modal-container" @tap.stop>
                <view class="modal-header">
                    <text class="modal-title">存入</text>
                    <view class="modal-close" @tap="hideDepositModal">
                        <text>✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="input-group">
                        <view class="amount-input-box">
                            <text class="currency">¥</text>
                            <view
                                class="amount-display-box"
                                @tap="activateAmountKeyboard('deposit')"
                            >
                                <text class="amount-display-text">
                                    {{ depositAmount }}
                                </text>
                            </view>
                        </view>
                        <view class="preset-options">
                            <view
                                class="preset-row"
                                v-for="(row, rowIndex) in presetAmountRows"
                                :key="'deposit-' + rowIndex"
                            >
                                <view
                                    class="preset-option"
                                    :class="{
                                        active:
                                            depositAmount === String(amount),
                                    }"
                                    v-for="amount in row"
                                    :key="'deposit-' + amount"
                                    @tap="selectDepositAmount(amount)"
                                >
                                    {{ amount }}
                                </view>
                            </view>
                        </view>
                    </view>
                    <view class="input-group">
                        <text class="input-label">备注（选填）</text>
                        <input
                            class="text-input"
                            placeholder="例如：买入筹码"
                            v-model="depositDesc"
                            maxlength="20"
                        />
                    </view>
                </view>
                <view class="modal-footer">
                    <button class="modal-btn cancel" @tap="hideDepositModal">
                        取消
                    </button>
                    <button class="modal-btn confirm" @tap="confirmDeposit">
                        确认存入
                    </button>
                </view>
            </view>
        </view>

        <!-- 取出弹窗 -->
        <view
            class="modal-overlay"
            v-if="showWithdrawDialog"
            @tap="hideWithdrawModal"
        >
            <view class="modal-container fund-modal-container" @tap.stop>
                <view class="modal-header">
                    <text class="modal-title">取出</text>
                    <view class="modal-close" @tap="hideWithdrawModal">
                        <text>✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="input-group">
                        <view class="amount-input-box">
                            <text class="currency">¥</text>
                            <view
                                class="amount-display-box"
                                @tap="activateAmountKeyboard('withdraw')"
                            >
                                <text class="amount-display-text">
                                    {{ withdrawAmount }}
                                </text>
                            </view>
                        </view>
                        <view class="preset-options">
                            <view
                                class="preset-row"
                                v-for="(row, rowIndex) in presetAmountRows"
                                :key="'withdraw-' + rowIndex"
                            >
                                <view
                                    class="preset-option"
                                    :class="{
                                        active:
                                            withdrawAmount === String(amount),
                                    }"
                                    v-for="amount in row"
                                    :key="'withdraw-' + amount"
                                    @tap="selectWithdrawAmount(amount)"
                                >
                                    {{ amount }}
                                </view>
                            </view>
                        </view>
                    </view>
                    <view class="input-group">
                        <text class="input-label">备注（选填）</text>
                        <input
                            class="text-input"
                            placeholder="例如：兑换筹码"
                            v-model="withdrawDesc"
                            maxlength="20"
                        />
                    </view>
                </view>
                <view class="modal-footer">
                    <button class="modal-btn cancel" @tap="hideWithdrawModal">
                        取消
                    </button>
                    <button class="modal-btn confirm" @tap="confirmWithdraw">
                        确认取出
                    </button>
                </view>
            </view>
        </view>

        <!-- 茶水费弹窗 -->
        <view class="modal-overlay" v-if="showTeaDialog" @tap="hideTeaModal">
            <view class="modal-container" @tap.stop>
                <view class="modal-header">
                    <text class="modal-title">添加茶水</text>
                    <view class="modal-close" @tap="hideTeaModal">
                        <text>✕</text>
                    </view>
                </view>
                <view class="modal-body">
                    <view class="input-group">
                        <text class="input-label">金额</text>
                        <view class="amount-input-box">
                            <text class="currency">¥</text>
                            <input
                                class="amount-input"
                                type="digit"
                                placeholder="0.00"
                                v-model="teaAmount"
                                focus
                            />
                        </view>
                    </view>
                    <view class="input-group">
                        <text class="input-label">支付玩家</text>
                        <!-- #ifdef H5 -->
                        <select class="field-select" v-model="selectedPlayer">
                            <option
                                v-for="(name, index) in playerNames"
                                :key="index"
                                :value="name"
                            >
                                {{ name }}
                            </option>
                        </select>
                        <!-- #endif -->
                        <!-- #ifndef H5 -->
                        <picker
                            mode="selector"
                            :range="playerNames"
                            @change="onPlayerChange"
                        >
                            <view class="picker-input">
                                <text>{{ selectedPlayer || "选择玩家" }}</text>
                                <text class="picker-arrow">›</text>
                            </view>
                        </picker>
                        <!-- #endif -->
                    </view>
                    <view class="input-group">
                        <text class="input-label">备注（选填）</text>
                        <input
                            class="text-input"
                            placeholder="例如：茶水"
                            v-model="teaDesc"
                            maxlength="20"
                        />
                    </view>
                </view>
                <view class="modal-footer">
                    <button class="modal-btn cancel" @tap="hideTeaModal">
                        取消
                    </button>
                    <button class="modal-btn confirm" @tap="confirmTea">
                        确认添加
                    </button>
                </view>
            </view>
        </view>

        <view
            class="keyboard-overlay"
            v-if="
                showCustomKeyboard && (showDepositDialog || showWithdrawDialog)
            "
        >
            <view class="keyboard-spacer"></view>
            <view class="keyboard-panel" @tap.stop>
                <view class="custom-keyboard">
                    <view class="keyboard-row">
                        <view class="keyboard-key" @tap="appendAmountDigit('1')"
                            >1</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('2')"
                            >2</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('3')"
                            >3</view
                        >
                    </view>
                    <view class="keyboard-row">
                        <view class="keyboard-key" @tap="appendAmountDigit('4')"
                            >4</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('5')"
                            >5</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('6')"
                            >6</view
                        >
                    </view>
                    <view class="keyboard-row">
                        <view class="keyboard-key" @tap="appendAmountDigit('7')"
                            >7</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('8')"
                            >8</view
                        >
                        <view class="keyboard-key" @tap="appendAmountDigit('9')"
                            >9</view
                        >
                    </view>
                    <view class="keyboard-row">
                        <view
                            class="keyboard-key keyboard-key-muted"
                            @tap="clearAmountValue"
                        ></view>
                        <view class="keyboard-key" @tap="appendAmountDigit('0')"
                            >0</view
                        >
                        <view
                            class="keyboard-key keyboard-key-muted"
                            @tap="deleteAmountDigit"
                            >⌫</view
                        >
                    </view>
                </view>
            </view>
        </view>

        <!-- 房间菜单 -->
        <view class="modal-overlay" v-if="showMenu" @tap="hideRoomMenu">
            <view class="menu-container" @tap.stop>
                <view class="menu-item" @tap="copyInviteCode">
                    <text class="menu-icon">📋</text>
                    <text class="menu-text">复制邀请码</text>
                </view>
                <view
                    class="menu-item"
                    @tap="copyServerAddress"
                    v-if="serverAddress"
                >
                    <text class="menu-icon">🌐</text>
                    <text class="menu-text">复制地址</text>
                </view>
                <view class="menu-item danger" @tap="confirmDissolve">
                    <text class="menu-icon">🚪</text>
                    <text class="menu-text">解散房间</text>
                </view>
                <view class="menu-item" @tap="hideRoomMenu">
                    <text class="menu-text">取消</text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import socketService from "@/utils/socket.js";
import {
    saveRecentRoom,
    removeRecentRoom,
    updateStoredRoom,
    clearCurrentRoom,
} from "@/utils/roomStorage.js";

// 随机头像emoji列表
const AVATARS = [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🐔",
    "🐧",
    "🐦",
    "🦆",
    "🦅",
];

// 随机颜色列表
const COLORS = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)",
];

export default {
    data() {
        return {
            room: {},
            poolAmount: 0,
            operations: [],
            playerName: "",
            showDepositDialog: false,
            showWithdrawDialog: false,
            showTeaDialog: false,
            showMenu: false,
            depositAmount: "",
            depositDesc: "",
            withdrawAmount: "",
            withdrawDesc: "",
            presetAmountRows: [
                [1, 5, 10, 15, 20, 30],
                [40, 50, 60, 70, 80, 100],
            ],
            showCustomKeyboard: false,
            activeAmountField: "",
            teaAmount: "",
            teaDesc: "",
            selectedPlayer: "",
            playerAvatars: {}, // 存储玩家头像映射
            playerColors: {}, // 存储玩家颜色映射
            serverAddress: "",
            serverCopyAddress: "",
        };
    },

    computed: {
        isCreator() {
            return !!this.room.players?.find(
                (player) => player.name === this.playerName && player.isCreator,
            );
        },

        // 计算每个玩家的统计数据
        playersWithStats() {
            if (!this.room.players) return [];

            return this.room.players.map((player) => {
                const playerOps = this.operations.filter(
                    (op) => op.playerName === player.name,
                );
                const depositTotal = playerOps
                    .filter((op) => op.amount > 0)
                    .reduce((sum, op) => sum + op.amount, 0);
                const withdrawTotal = Math.abs(
                    playerOps
                        .filter((op) => op.amount < 0)
                        .reduce((sum, op) => sum + op.amount, 0),
                );
                // 玩家余额 = 初始资金 + 取出 - 存入
                const balance =
                    (player.initialFund || 0) + withdrawTotal - depositTotal;

                return {
                    ...player,
                    balance,
                    avatar: this.getPlayerAvatar(player.name),
                    avatarColor: this.getPlayerColor(player.name),
                };
            });
        },

        // 玩家名称列表
        playerNames() {
            return this.room.players
                ? this.room.players.map((p) => p.name)
                : [];
        },
    },

    onLoad() {
        this.loadRoomData();
        this.setupListeners();
        this.loadServerAddress();
    },

    onShow() {
        this.loadServerAddress();
    },

    onUnload() {
        socketService.off("fundAdded");
        socketService.off("fundSubtracted");
        socketService.off("teaFeeAdded");
        socketService.off("playerJoined");
        socketService.off("roomDissolved");
        socketService.off("roomReset");
    },

    methods: {
        goBack() {
            uni.navigateBack();
        },

        loadRoomData() {
            const storageRoom = uni.getStorageSync("currentRoom");
            if (!storageRoom || !storageRoom.id) {
                uni.showToast({ title: "房间信息无效", icon: "none" });
                setTimeout(() => {
                    uni.redirectTo({ url: "/pages/index/index" });
                }, 1500);
                return;
            }

            this.room = storageRoom;
            this.poolAmount = storageRoom.poolAmount || 0;
            this.operations = (storageRoom.operations || []).slice().reverse();
            saveRecentRoom(storageRoom);
            updateStoredRoom(storageRoom);

            // 获取当前玩家名称 - 从本地存储获取
            const currentPlayerName = uni.getStorageSync("currentPlayerName");
            if (currentPlayerName) {
                this.playerName = currentPlayerName;
            } else if (this.room.players && this.room.players[0]) {
                this.playerName = this.room.players[0].name;
                uni.setStorageSync("currentPlayerName", this.playerName);
            } else {
                this.playerName = "玩家";
            }

            console.log("当前玩家:", this.playerName);

            // 初始化玩家头像和颜色
            this.initPlayerAvatars();
        },

        // 初始化玩家头像和颜色
        initPlayerAvatars() {
            if (!this.room.players) return;

            this.room.players.forEach((player, index) => {
                if (!this.playerAvatars[player.name]) {
                    this.playerAvatars[player.name] =
                        AVATARS[index % AVATARS.length];
                    this.playerColors[player.name] =
                        COLORS[index % COLORS.length];
                }
            });
        },

        // 获取玩家头像
        getPlayerAvatar(playerName) {
            // 茶水bot使用固定头像
            if (playerName === "茶水") {
                return "🍵";
            }

            if (!this.playerAvatars[playerName]) {
                const index = Object.keys(this.playerAvatars).length;
                this.playerAvatars[playerName] =
                    AVATARS[index % AVATARS.length];
            }
            return this.playerAvatars[playerName];
        },

        // 获取玩家颜色
        getPlayerColor(playerName) {
            // 茶水bot使用固定颜色
            if (playerName === "茶水") {
                return "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)";
            }

            if (!this.playerColors[playerName]) {
                const index = Object.keys(this.playerColors).length;
                this.playerColors[playerName] = COLORS[index % COLORS.length];
            }
            return this.playerColors[playerName];
        },

        setupListeners() {
            socketService.on("fundAdded", (data) => {
                this.poolAmount = data.poolAmount;
                this.operations.unshift(data.operation);
                this.updateRoomStorage();
            });

            socketService.on("fundSubtracted", (data) => {
                this.poolAmount = data.poolAmount;
                this.operations.unshift(data.operation);
                this.updateRoomStorage();
            });

            socketService.on("teaFeeAdded", (data) => {
                // 茶水费添加两条操作记录
                if (data.playerOperation) {
                    this.operations.unshift(data.playerOperation);
                }
                if (data.teaOperation) {
                    this.operations.unshift(data.teaOperation);
                }
                this.updateRoomStorage();
            });

            socketService.on("playerJoined", (data) => {
                if (data && data.room) {
                    this.room = data.room;
                    this.initPlayerAvatars();
                    saveRecentRoom(data.room);
                    this.updateRoomStorage();

                    if (data.player) {
                        uni.showToast({
                            title: `${data.player.name} 加入了房间`,
                            icon: "none",
                            duration: 2000,
                        });
                    }
                }
            });

            socketService.on("roomDissolved", (data) => {
                console.log("收到房间解散通知");
                removeRecentRoom(this.room.inviteCode || data?.inviteCode);
                clearCurrentRoom();
                uni.showToast({
                    title: "房间已被解散",
                    icon: "none",
                    duration: 2000,
                });
                setTimeout(() => {
                    uni.redirectTo({ url: "/pages/index/index" });
                }, 2000);
            });

            socketService.on("roomReset", (data) => {
                if (!data?.room) {
                    return;
                }

                this.room = data.room;
                this.poolAmount = data.room.poolAmount || 0;
                this.operations = (data.room.operations || [])
                    .slice()
                    .reverse();
                this.initPlayerAvatars();
                saveRecentRoom(data.room);
                this.updateRoomStorage();
                uni.showToast({ title: "房间已清零", icon: "success" });
            });
        },

        updateRoomStorage() {
            this.room.poolAmount = this.poolAmount;
            this.room.operations = [...this.operations].reverse();
            updateStoredRoom(this.room);
        },

        loadServerAddress() {
            if (
                !socketService.isEmbeddedRuntime() &&
                (typeof window === "undefined" || !window.location)
            ) {
                return;
            }

            if (
                typeof window !== "undefined" &&
                window.nodejsServerInfo &&
                (window.nodejsServerInfo.lanIp ||
                    window.nodejsServerInfo.lanUrl)
            ) {
                this.serverAddress =
                    window.nodejsServerInfo.lanIp ||
                    window.nodejsServerInfo.lanUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/:80$/, "");
                this.serverCopyAddress =
                    window.nodejsServerInfo.lanUrl ||
                    `http://${this.serverAddress}`;
            }

            const requestUrl = socketService.isEmbeddedRuntime()
                ? "http://localhost:8080/api/server-info"
                : `${window.location.origin}/api/server-info`;

            const tryLoad = (retryCount = 0) => {
                uni.request({
                    url: requestUrl,
                    success: (res) => {
                        const info = res.data || {};
                        if (info.lanIp || info.lanUrl) {
                            this.serverAddress =
                                info.lanIp ||
                                info.lanUrl
                                    .replace(/^https?:\/\//, "")
                                    .replace(/:80$/, "");
                            this.serverCopyAddress =
                                info.lanUrl || `http://${this.serverAddress}`;
                        }
                    },
                    fail: () => {
                        if (!this.serverAddress && retryCount < 6) {
                            setTimeout(() => {
                                tryLoad(retryCount + 1);
                            }, 500);
                        }
                    },
                });
            };

            tryLoad();
        },

        formatTime(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;

            if (diff < 60000) return "刚刚";
            if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前";
            if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前";

            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hour = date.getHours().toString().padStart(2, "0");
            const minute = date.getMinutes().toString().padStart(2, "0");
            return `${month}-${day} ${hour}:${minute}`;
        },

        showDepositModal() {
            this.showDepositDialog = true;
            this.depositAmount = "";
            this.depositDesc = "";
            this.showCustomKeyboard = false;
            this.activeAmountField = "";
        },

        hideDepositModal() {
            this.showDepositDialog = false;
            this.showCustomKeyboard = false;
            this.activeAmountField = "";
        },

        showWithdrawModal() {
            this.showWithdrawDialog = true;
            this.withdrawAmount = "";
            this.withdrawDesc = "";
            this.showCustomKeyboard = false;
            this.activeAmountField = "";
        },

        hideWithdrawModal() {
            this.showWithdrawDialog = false;
            this.showCustomKeyboard = false;
            this.activeAmountField = "";
        },

        hideCustomKeyboard() {
            this.showCustomKeyboard = false;
            this.activeAmountField = "";
        },

        selectDepositAmount(amount) {
            this.depositAmount = String(amount);
        },

        selectWithdrawAmount(amount) {
            this.withdrawAmount = String(amount);
        },

        activateAmountKeyboard(field) {
            this.activeAmountField = field;
            this.showCustomKeyboard = true;
        },

        appendAmountDigit(digit) {
            if (!this.activeAmountField) {
                return;
            }

            const key =
                this.activeAmountField === "deposit"
                    ? "depositAmount"
                    : "withdrawAmount";
            const currentValue = String(this[key] || "");
            this[key] = currentValue + digit;
        },

        deleteAmountDigit() {
            if (!this.activeAmountField) {
                return;
            }

            const key =
                this.activeAmountField === "deposit"
                    ? "depositAmount"
                    : "withdrawAmount";
            this[key] = String(this[key] || "").slice(0, -1);
        },

        clearAmountValue() {
            if (!this.activeAmountField) {
                return;
            }

            const key =
                this.activeAmountField === "deposit"
                    ? "depositAmount"
                    : "withdrawAmount";
            this[key] = "";
        },

        showTeaModal() {
            this.showTeaDialog = true;
            this.teaAmount = "";
            this.teaDesc = "";
            // 默认选择第一个玩家
            this.selectedPlayer = this.playerNames[0] || this.playerName;
        },

        hideTeaModal() {
            this.showTeaDialog = false;
        },

        showRoomMenu() {
            this.showMenu = true;
        },

        hideRoomMenu() {
            this.showMenu = false;
        },

        ensureCreatorAction() {
            if (!this.isCreator) {
                uni.showToast({ title: "只有房主可以操作", icon: "none" });
                return false;
            }
            return true;
        },

        showDissolveConfirm() {
            if (!this.ensureCreatorAction()) {
                return;
            }
            uni.showModal({
                title: "确认解散",
                content:
                    "解散后房间数据将被清除，所有玩家将退出房间，是否继续？",
                confirmText: "确认解散",
                confirmColor: "#ff4d4f",
                success: (res) => {
                    if (res.confirm) {
                        this.dissolveRoom();
                    }
                },
            });
        },

        dissolveRoom() {
            // 发送解散房间消息到服务器
            socketService.send({
                type: "dissolveRoom",
                data: {
                    roomId: this.room.id,
                },
            });

            removeRecentRoom(this.room.inviteCode);
            clearCurrentRoom();

            // 返回首页
            uni.showToast({ title: "房间已解散", icon: "success" });
            setTimeout(() => {
                uni.redirectTo({ url: "/pages/index/index" });
            }, 1500);
        },

        onPlayerChange(e) {
            this.selectedPlayer = this.playerNames[e.detail.value];
        },

        copyInviteCode() {
            uni.setClipboardData({
                data: this.room.inviteCode,
                success: () => {
                    uni.showToast({ title: "邀请码已复制", icon: "success" });
                    this.hideRoomMenu();
                },
            });
        },

        confirmDissolve() {
            this.hideRoomMenu();
            if (!this.ensureCreatorAction()) {
                return;
            }
            this.showDissolveConfirm();
        },

        showResetConfirm() {
            if (!this.ensureCreatorAction()) {
                return;
            }

            uni.showModal({
                title: "确认清零",
                content:
                    "会把流水池和所有玩家金额清零，但保留房间和玩家，是否继续？",
                confirmText: "确认清零",
                confirmColor: "#fa8c16",
                success: (res) => {
                    if (res.confirm) {
                        socketService.send({
                            type: "resetRoom",
                            data: {
                                roomId: this.room.id,
                            },
                        });
                    }
                },
            });
        },

        copyServerAddress() {
            if (!this.serverAddress) {
                return;
            }

            uni.setClipboardData({
                data: this.serverCopyAddress || `http://${this.serverAddress}`,
                success: () => {
                    uni.showToast({ title: "地址已复制", icon: "success" });
                    this.hideRoomMenu();
                },
            });
        },

        confirmDeposit() {
            const amount = parseFloat(this.depositAmount);

            if (isNaN(amount) || amount <= 0) {
                uni.showToast({ title: "请输入有效金额", icon: "none" });
                return;
            }

            socketService.send({
                type: "addFund",
                data: {
                    roomId: this.room.id,
                    playerName: this.playerName,
                    amount: amount,
                    description: this.depositDesc.trim() || "存入资金",
                },
            });

            this.hideDepositModal();
            uni.showToast({
                title: "存入成功",
                icon: "success",
                duration: 300,
            });
        },

        confirmWithdraw() {
            const amount = parseFloat(this.withdrawAmount);

            if (isNaN(amount) || amount <= 0) {
                uni.showToast({ title: "请输入有效金额", icon: "none" });
                return;
            }

            socketService.send({
                type: "subtractFund",
                data: {
                    roomId: this.room.id,
                    playerName: this.playerName,
                    amount: amount,
                    description: this.withdrawDesc.trim() || "取出资金",
                },
            });

            this.hideWithdrawModal();
            uni.showToast({
                title: "取出成功",
                icon: "success",
                duration: 300,
            });
        },

        confirmTea() {
            const amount = parseFloat(this.teaAmount);

            if (isNaN(amount) || amount <= 0) {
                uni.showToast({ title: "请输入有效金额", icon: "none" });
                return;
            }

            if (!this.selectedPlayer) {
                uni.showToast({ title: "请选择支付玩家", icon: "none" });
                return;
            }

            // 茶水费：玩家扣钱，茶水bot加钱，不涉及流水池
            // 发送两条操作记录
            socketService.send({
                type: "addTeaFee",
                data: {
                    roomId: this.room.id,
                    playerName: this.selectedPlayer,
                    amount: amount,
                    description: this.teaDesc.trim() || "茶水费",
                },
            });

            this.hideTeaModal();
            uni.showToast({ title: "茶水费已添加", icon: "success" });
        },
    },
};
</script>

<style scoped>
.page {
    min-height: 100vh;
    background: #f5f7fa;
    padding-bottom: 20rpx;
}

/* 导航栏 */
.navbar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 124rpx;
    padding: 12rpx 30rpx 18rpx;
    background: #fff;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.nav-left {
    width: 80rpx;
    position: relative;
    z-index: 2;
}

.nav-icon {
    font-size: 36rpx;
    color: #333;
    font-weight: bold;
}

.nav-center {
    position: absolute;
    left: 140rpx;
    right: 140rpx;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
}

.nav-server {
    max-width: 100%;
    font-size: 22rpx;
    line-height: 1.2;
    color: #5a6b8c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    width: 100%;
}

.nav-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
    width: 100%;
}

.nav-right {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12rpx;
    min-width: 280rpx;
}

.nav-action {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 90rpx;
    height: 56rpx;
    padding: 0 16rpx;
    border-radius: 12rpx;
    background: #fff7e6;
}

.nav-action-text {
    font-size: 22rpx;
    color: #d46b08;
    font-weight: 600;
}

.invite-code-badge {
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    font-size: 22rpx;
    color: #5a6b8c;
    background: #f0f2ff;
    padding: 6rpx 12rpx;
    border-radius: 8rpx;
    font-weight: 500;
}

.invite-code-arrow {
    font-size: 18rpx;
}

/* 玩家横向滚动条 */
.players-bar {
    background: #fff;
    padding: 20rpx 0;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.players-scroll-h {
    white-space: nowrap;
}

.players-list-h {
    display: inline-flex;
    padding: 0 30rpx;
    gap: 20rpx;
}

.player-card-h {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    min-width: 100rpx;
}

.player-avatar-h {
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.avatar-emoji-h {
    font-size: 32rpx;
}

.player-name-h {
    font-size: 22rpx;
    color: #666;
    max-width: 100rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.player-balance-h {
    font-size: 24rpx;
    font-weight: bold;
}

.player-balance-h.positive {
    color: #52c41a;
}

.player-balance-h.negative {
    color: #ff4d4f;
}

/* 资金池卡片 */
.pool-card {
    margin: 20rpx 30rpx;
    padding: 40rpx 30rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 24rpx;
    box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
    text-align: center;
    box-sizing: border-box;
}

.pool-label {
    display: block;
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 15rpx;
}

.pool-amount {
    display: block;
    font-size: 72rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 30rpx;
    text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.pool-actions {
    display: flex;
    gap: 15rpx;
}

.pool-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 16rpx;
    border: none;
    font-size: 26rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
}

.pool-btn.deposit {
    background: rgba(255, 255, 255, 0.95);
    color: #52c41a;
}

.pool-btn.withdraw {
    background: rgba(255, 255, 255, 0.95);
    color: #ff4d4f;
}

.pool-btn.tea {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border: 2rpx solid rgba(255, 255, 255, 0.5);
}

.btn-icon {
    font-size: 28rpx;
}

/* 操作记录 */
.records-section {
    margin: 20rpx 30rpx;
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
}

.title-text {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
}

.title-count {
    font-size: 24rpx;
    color: #999;
}

.records-scroll {
    max-height: 500rpx;
}

.record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f5f5f5;
}

.record-item:last-child {
    border-bottom: none;
}

.record-left {
    display: flex;
    align-items: center;
    gap: 15rpx;
    flex: 1;
}

.record-avatar {
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.record-info {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.record-player {
    font-size: 26rpx;
    color: #333;
    font-weight: 500;
}

.record-time {
    font-size: 22rpx;
    color: #999;
}

.record-right {
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
}

.record-amount {
    font-size: 28rpx;
    font-weight: bold;
}

.record-amount.positive {
    color: #52c41a;
}

.record-amount.negative {
    color: #ff4d4f;
}

.record-desc {
    font-size: 22rpx;
    color: #999;
}

.empty-records {
    padding: 80rpx 0;
    text-align: center;
    box-sizing: border-box;
}

.empty-icon {
    display: block;
    font-size: 80rpx;
    margin-bottom: 20rpx;
    opacity: 0.3;
}

.empty-text {
    font-size: 26rpx;
    color: #999;
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal-container {
    width: 85%;
    max-width: 500rpx;
    background: #fff;
    border-radius: 24rpx;
    overflow: visible;
    animation: slideUp 0.3s;
    position: relative;
    z-index: 10001;
}

.fund-modal-container {
    width: 92%;
    max-width: 620rpx;
    transform: translateY(-96rpx);
}

@keyframes slideUp {
    from {
        transform: translateY(50rpx);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 30rpx;
    border-bottom: 1rpx solid #f5f5f5;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.modal-close {
    width: 50rpx;
    height: 50rpx;
    border-radius: 50%;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    color: #999;
}

.modal-body {
    padding: 30rpx;
    position: relative;
    z-index: 10002;
}

.fund-modal-container .modal-body {
    padding: 18rpx 26rpx 24rpx;
}

.fund-modal-container .modal-header {
    padding: 24rpx 26rpx 18rpx;
}

.fund-modal-container .modal-footer {
    padding: 22rpx 26rpx 24rpx;
}

.input-group {
    margin-bottom: 30rpx;
    position: relative;
    z-index: 10003;
}

.input-group:last-child {
    margin-bottom: 0;
}

.input-label {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 15rpx;
}

.amount-input-box {
    position: relative;
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border-radius: 16rpx;
    padding: 0 30rpx;
    height: 82rpx;
    width: 100%;
    margin: -24rpx auto 0;
}

.currency {
    font-size: 32rpx;
    color: #5a6b8c;
    font-weight: bold;
    margin-right: 10rpx;
}

.amount-input {
    flex: 1;
    font-size: 48rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
    box-sizing: border-box;
}

.amount-display-box {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 58rpx;
}

.amount-display-text {
    font-size: 50rpx;
    font-weight: bold;
    color: #333;
    text-align: center;
}

.preset-options {
    margin-top: 16rpx;
}

.preset-row {
    display: flex;
    justify-content: space-between;
    gap: 6rpx;
}

.preset-row + .preset-row {
    margin-top: 6rpx;
}

.preset-option {
    flex: 1;
    height: 86rpx;
    line-height: 86rpx;
    text-align: center;
    border-radius: 14rpx;
    background: #f2f4f8;
    color: #333;
    font-size: 40rpx;
    font-weight: 600;
}

.preset-option.active {
    background: #667eea;
    color: #fff;
}

.keyboard-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    pointer-events: none;
}

.keyboard-spacer {
    flex: 1;
}

.keyboard-panel {
    padding: 0 24rpx 20rpx;
    pointer-events: auto;
}

.custom-keyboard {
    background: #f8f9fa;
    border-radius: 18rpx;
    padding: 18rpx;
    box-shadow: 0 -6rpx 24rpx rgba(0, 0, 0, 0.08);
}

.keyboard-row {
    display: flex;
    gap: 14rpx;
}

.keyboard-row + .keyboard-row {
    margin-top: 14rpx;
}

.keyboard-key {
    flex: 1;
    height: 88rpx;
    border-radius: 16rpx;
    background: #ffffff;
    color: #333;
    font-size: 38rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
}

.keyboard-key-muted {
    background: #eef1f7;
    color: #7a8294;
    font-size: 34rpx;
}

.text-input {
    box-sizing: border-box;
    height: 80rpx;
    background: #f8f9fa;
    border-radius: 16rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
    color: #333;
}

.picker-input {
    box-sizing: border-box;
    height: 80rpx;
    background: #f8f9fa;
    border-radius: 16rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 10000;
}

.field-select {
    box-sizing: border-box;
    height: 80rpx;
    background: #f8f9fa;
    border-radius: 16rpx;
    padding: 0 30rpx;
    font-size: 28rpx;
    color: #333;
    border: 2rpx solid transparent;

    &:focus {
        border-color: #5a6b8c;
        background: #fff;
        outline: none;
    }
}

.picker-arrow {
    font-size: 32rpx;
    color: #999;
}

.modal-footer {
    display: flex;
    gap: 20rpx;
    padding: 30rpx;
    border-top: 1rpx solid #f5f5f5;
}

.modal-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 16rpx;
    font-size: 28rpx;
    font-weight: 500;
    border: none;
}

.modal-btn.cancel {
    background: #f5f5f5;
    color: #666;
}

.modal-btn.confirm {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
}

/* 房间菜单 */
.menu-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #fff;
    border-radius: 24rpx 24rpx 0 0;
    padding: 20rpx;
    animation: slideUp 0.3s;
}

.menu-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15rpx;
    height: 100rpx;
    border-radius: 16rpx;
    margin-bottom: 15rpx;
    background: #f8f9fa;
    font-size: 28rpx;
    color: #333;
}

.menu-item.danger {
    color: #ff4d4f;
}

.menu-icon {
    font-size: 32rpx;
}

.menu-text {
    font-weight: 500;
}
</style>
