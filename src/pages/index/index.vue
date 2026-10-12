<template>
    <view class="page">
        <!-- 主容器 -->
        <view class="container">
            <!-- 头部卡片 -->
            <view class="header-card">
                <image
                    class="app-logo"
                    src="/static/qipai.png"
                    mode="aspectFit"
                />
                <text class="app-title">计分器</text>
                <text class="app-subtitle"
                    >轻松管理房间账目，快速算账不头痛</text
                >
            </view>

            <!-- 快速操作 -->
            <view class="quick-actions">
                <button class="action-btn primary" @tap="createRoom">
                    <view class="btn-icon">🏠</view>
                    <view class="btn-content">
                        <text class="btn-title">创建房间</text>
                        <text class="btn-desc">建立新房间</text>
                    </view>
                </button>
                <button class="action-btn secondary" @tap="showJoinDialog">
                    <view class="btn-icon">🔑</view>
                    <view class="btn-content">
                        <text class="btn-title">加入房间</text>
                        <text class="btn-desc">输入邀请码</text>
                    </view>
                </button>
            </view>

            <!-- 服务器配置按钮（仅 APP 内显示） -->
            <!-- #ifdef APP-PLUS -->
            <view class="server-config">
                <button class="server-btn" @tap="goToServer">
                    <text class="server-icon">🖥️</text>
                    <text class="server-text">服务器设置</text>
                </button>
            </view>
            <!-- #endif -->

            <!-- 房间列表 -->
            <view class="rooms-section" v-if="recentRooms.length > 0">
                <view class="section-header">
                    <text class="section-title">📌 最近加入</text>
                    <text class="section-count"
                        >{{ recentRooms.length }}个房间</text
                    >
                </view>
                <scroll-view
                    class="rooms-scroll"
                    scroll-y
                    enhanced
                    show-scrollbar
                >
                    <view class="room-list">
                        <view
                            class="room-card"
                            v-for="(item, index) in recentRooms"
                            :key="item.inviteCode"
                            @tap="joinRoomById"
                            :data-room="item"
                        >
                            <view class="room-header">
                                <view class="room-icon">🏠</view>
                                <view class="room-badge">#{{ index + 1 }}</view>
                                <view
                                    class="room-delete"
                                    @tap.stop="deleteRoom"
                                    :data-room="item"
                                >
                                    <text>✕</text>
                                </view>
                            </view>
                            <text class="room-name">{{ item.name }}</text>
                            <view class="room-footer">
                                <view class="room-code-box">
                                    <text class="code-label">邀请码</text>
                                    <text class="code-value">{{
                                        item.inviteCode
                                    }}</text>
                                    <text class="copy-hint">点击进入</text>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>

            <!-- 空状态 -->
            <view class="empty-state" v-else>
                <text class="empty-icon">📭</text>
                <text class="empty-title">还没有房间记录</text>
                <text class="empty-desc">创建或加入房间后会显示在这里</text>
            </view>

            <!-- 使用指南 -->
            <view class="guide-section">
                <text class="guide-title">💡 快速上手</text>
                <view class="guide-steps">
                    <view class="guide-step">
                        <view class="step-number">1</view>
                        <view class="step-content">
                            <text class="step-title">创建房间</text>
                            <text class="step-desc"
                                >设置房间名称和初始资金</text
                            >
                        </view>
                    </view>
                    <view class="guide-step">
                        <view class="step-number">2</view>
                        <view class="step-content">
                            <text class="step-title">分享邀请码</text>
                            <text class="step-desc">输入邀请码即可加入</text>
                        </view>
                    </view>
                    <view class="guide-step">
                        <view class="step-number">3</view>
                        <view class="step-content">
                            <text class="step-title">管理账目</text>
                            <text class="step-desc">记录资金、茶水</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <!-- 加入房间弹窗 -->
        <view class="modal-mask" v-if="showModal" @tap="hideModal">
            <view class="modal-dialog" @tap.stop>
                <view class="modal-header">
                    <text class="modal-title">🔑 加入房间</text>
                    <view class="close-btn" @tap="hideModal">
                        <text>✕</text>
                    </view>
                </view>

                <view class="modal-body">
                    <!-- 昵称输入 -->
                    <view class="input-group">
                        <text class="input-label">你的昵称</text>
                        <input
                            class="modern-input"
                            placeholder="给自已起个名字"
                            v-model="playerNickname"
                            maxlength="20"
                        />
                    </view>

                    <!-- 邀请码输入 -->
                    <view class="input-group">
                        <text class="input-label">房间邀请码</text>
                        <view class="code-input-wrapper">
                            <input
                                class="code-input"
                                placeholder="输入6位邀请码"
                                v-model="joinCode"
                                maxlength="6"
                                @input="onCodeInput"
                            />
                            <view class="code-demo" v-if="!joinCode">
                                <text>A</text>
                                <text>B</text>
                                <text>C</text>
                                <text>D</text>
                                <text>E</text>
                                <text>F</text>
                            </view>
                        </view>
                        <text class="input-hint">测试邀请码：TEST01</text>
                    </view>
                </view>

                <view class="modal-footer">
                    <button class="modal-btn cancel" @tap="hideModal">
                        <text>取消</text>
                    </button>
                    <button
                        class="modal-btn confirm"
                        @tap="confirmJoin"
                        :disabled="isJoining"
                    >
                        <text v-if="isJoining">加入中...</text>
                        <text v-else>立即加入</text>
                    </button>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import localDataService from "@/utils/localDataService.js";
import socketService from "@/utils/socket.js";
import {
    getRecentRooms,
    saveRecentRoom,
    removeRecentRoom,
} from "@/utils/roomStorage.js";

export default {
    data() {
        return {
            showModal: false,
            joinCode: "",
            playerNickname: "",
            recentRooms: [],
            isJoining: false,
            socketService, // 防止 tree-shaking
        };
    },

    onLoad() {
        this.setupListeners();
        this.checkServerConnection();
    },

    onShow() {
        this.loadRecentRooms();
    },

    onUnload() {
        localDataService.off("roomJoined");
        localDataService.off("roomCreated");
        localDataService.off("error");

        // 清理 WebSocket 监听器（所有模式）
        socketService.off("roomCreated");
        socketService.off("roomJoined");
        socketService.off("error");
    },

    methods: {
        setupListeners() {
            localDataService.on("roomJoined", (data) => {
                console.log("收到 roomJoined 事件:", data);
                this.isJoining = false;
                uni.hideLoading();

                if (data && data.room) {
                    uni.setStorageSync("currentRoom", data.room);
                    this.recentRooms = saveRecentRoom(data.room);
                    uni.navigateTo({ url: "/pages/room/room" });
                } else {
                    uni.showToast({ title: "加入失败，请重试", icon: "none" });
                }
            });

            localDataService.on("roomCreated", (data) => {
                console.log("收到 roomCreated 事件:", data);
                uni.hideLoading();

                if (data && data.room) {
                    uni.setStorageSync("currentRoom", data.room);
                    this.recentRooms = saveRecentRoom(data.room);
                    uni.navigateTo({ url: "/pages/room/room" });
                }
            });

            localDataService.on("error", (data) => {
                console.log("收到 error 事件:", data);
                this.isJoining = false;
                uni.hideLoading();

                if (data && data.message) {
                    uni.showToast({
                        title: data.message,
                        icon: "none",
                        duration: 2500,
                    });
                }
            });

            // 监听 WebSocket 消息（所有模式都支持）
            socketService.on("roomCreated", (data) => {
                console.log("收到 WebSocket roomCreated 事件:", data);
                uni.hideLoading();

                if (data && data.room) {
                    uni.setStorageSync("currentRoom", data.room);
                    this.recentRooms = saveRecentRoom(data.room);
                    uni.navigateTo({ url: "/pages/room/room" });
                } else {
                    uni.showToast({ title: "创建失败，请重试", icon: "none" });
                }
            });

            socketService.on("roomJoined", (data) => {
                console.log("收到 WebSocket roomJoined 事件:", data);
                this.isJoining = false;
                uni.hideLoading();

                if (data && data.room) {
                    uni.setStorageSync("currentRoom", data.room);
                    // 保存当前玩家名称
                    uni.setStorageSync(
                        "currentPlayerName",
                        this.playerNickname.trim(),
                    );
                    this.recentRooms = saveRecentRoom(data.room);
                    uni.navigateTo({ url: "/pages/room/room" });
                } else {
                    uni.showToast({ title: "加入失败，请重试", icon: "none" });
                }
            });

            socketService.on("error", (data) => {
                console.log("收到 WebSocket error 事件:", data);
                this.isJoining = false;
                uni.hideLoading();

                if (data && data.message) {
                    // 先关闭弹窗，再显示错误提示
                    this.hideModal();
                    setTimeout(() => {
                        uni.showToast({
                            title: data.message,
                            icon: "none",
                            duration: 2500,
                        });
                    }, 100);
                }
            });
        },

        checkServerConnection() {
            if (socketService.isEmbeddedRuntime()) {
                console.log("嵌入式运行环境，首页跳过预连接");
                return;
            }

            // H5 模式下，尝试连接到服务器
            socketService.connect().catch((err) => {
                console.log("无法连接到服务器，使用本地模式:", err);
            });
        },

        loadRecentRooms() {
            try {
                const recentRooms = getRecentRooms();
                console.log("加载最近房间:", recentRooms);
                this.recentRooms = recentRooms;
            } catch (e) {
                console.error("加载最近房间失败:", e);
                this.recentRooms = [];
            }
        },

        createRoom() {
            uni.navigateTo({
                url: "/pages/room/create/create",
            });
        },

        showJoinDialog() {
            this.showModal = true;
            this.joinCode = "";
            this.playerNickname = "";
        },

        hideModal() {
            this.showModal = false;
            this.joinCode = "";
            this.playerNickname = "";
        },

        onCodeInput(e) {
            let value = e.detail.value.toUpperCase();
            // 只保留大写字母和数字
            value = value.replace(/[^A-Z0-9]/g, "");
            this.joinCode = value;

            // 输入6位后自动提交
            if (value.length === 6) {
                setTimeout(() => {
                    this.confirmJoin();
                }, 300);
            }
        },

        confirmJoin() {
            const code = this.joinCode.trim().toUpperCase();
            const nickname = this.playerNickname.trim();

            // 验证邀请码
            if (!code) {
                uni.showToast({ title: "请输入邀请码", icon: "none" });
                return;
            }

            if (code.length !== 6) {
                uni.showToast({ title: "邀请码必须是6位", icon: "none" });
                return;
            }

            // 验证昵称
            if (!nickname) {
                uni.showToast({ title: "请输入你的昵称", icon: "none" });
                return;
            }

            if (nickname.length < 2) {
                uni.showToast({ title: "昵称至少2个字符", icon: "none" });
                return;
            }

            // 开始加入
            this.isJoining = true;
            uni.showLoading({ title: "加入中...", mask: true });

            console.log("尝试加入房间:", {
                inviteCode: code,
                playerName: nickname,
            });

            // 运行时检测是否在 Cordova 环境
            const isEmbeddedRuntime = socketService.isEmbeddedRuntime();
            const delay = isEmbeddedRuntime ? 2000 : 0;
            const timeoutDuration = isEmbeddedRuntime ? 25000 : 8000;

            console.log(
                "当前环境:",
                isEmbeddedRuntime ? "嵌入式 App" : "H5/浏览器",
                ", 延迟:",
                delay,
                "ms",
            );

            // 延迟执行（Cordova 环境需要等待 Node.js 服务器启动）
            setTimeout(() => {
                console.log("开始连接 WebSocket...");
                socketService
                    .connect()
                    .then(() => {
                        console.log("WebSocket 连接成功，发送加入房间消息");
                        socketService.send({
                            type: "joinRoom",
                            data: {
                                inviteCode: code,
                                playerName: nickname,
                            },
                        });
                    })
                    .catch((err) => {
                        console.error("连接服务器失败:", err);
                        this.isJoining = false;
                        uni.hideLoading();
                        this.hideModal();
                        setTimeout(() => {
                            uni.showToast({
                                title: "无法连接到服务器，请稍后重试",
                                icon: "none",
                                duration: 2000,
                            });
                        }, 100);
                    });

                // 设置超时处理
                setTimeout(() => {
                    if (this.isJoining) {
                        console.log("加入房间超时");
                        this.isJoining = false;
                        uni.hideLoading();
                        this.hideModal();
                        setTimeout(() => {
                            uni.showToast({
                                title: "加入房间超时，请稍后重试",
                                icon: "none",
                                duration: 3000,
                            });
                        }, 100);
                    }
                }, timeoutDuration);
            }, delay);
        },

        joinRoomById(e) {
            const room = e.currentTarget.dataset.room;
            console.log("点击房间卡片:", room);

            uni.setStorageSync("currentRoom", room);
            uni.navigateTo({ url: "/pages/room/room" });
        },

        deleteRoom(e) {
            const room = e.currentTarget.dataset.room;
            console.log("删除房间:", room);

            uni.showModal({
                title: "确认删除",
                content: `确定要删除房间 "${room.name}" 吗？`,
                success: (res) => {
                    if (res.confirm) {
                        // 从最近列表中删除
                        this.recentRooms = removeRecentRoom(room.inviteCode);

                        // 从本地服务中删除（如果是本地房间）
                        // #ifndef H5
                        if (room.id && localDataService.getRoom(room.id)) {
                            localDataService.rooms.delete(room.id);
                        }
                        // #endif

                        uni.showToast({ title: "已删除", icon: "success" });
                    }
                },
            });
        },

        goToServer() {
            uni.navigateTo({ url: "/pages/server/server" });
        },
    },
};
</script>

<style scoped>
.page {
    min-height: 100vh;
    background: #ffffff;
}

.container {
    padding: 0 30rpx 30rpx;
}

/* 头部卡片 */
.header-card {
    background: linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%);
    border-radius: 0 0 30rpx 30rpx;
    padding: 28rpx 40rpx 40rpx;
    position: relative;
    overflow: hidden;
    margin-bottom: 30rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 12rpx 30rpx rgba(24, 40, 72, 0.06);
}

.app-logo {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: 18rpx;
}

.app-title {
    display: block;
    font-size: 48rpx;
    font-weight: bold;
    color: #22304a;
    margin-bottom: 8rpx;
}

.app-subtitle {
    display: block;
    font-size: 26rpx;
    color: #6e7b91;
    line-height: 40rpx;
    text-align: center;
}

/* 快速操作 */
.quick-actions {
    display: flex;
    gap: 20rpx;
    margin-bottom: 20rpx;
}

/* 服务器配置 */
.server-config {
    margin-bottom: 30rpx;
}

.server-btn {
    width: 100%;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20rpx;
    padding: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15rpx;
    border: 2rpx solid rgba(255, 255, 255, 0.3);
}

.server-icon {
    font-size: 32rpx;
}

.server-text {
    font-size: 26rpx;
    color: #fff;
    font-weight: 500;
}

.action-btn {
    flex: 1;
    background: #fff;
    border-radius: 24rpx;
    padding: 30rpx 25rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.action-btn.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.action-btn.secondary {
    background: #fff;
    border: 2rpx solid #e8ecf4;
}

.btn-icon {
    font-size: 48rpx;
    margin-bottom: 10rpx;
}

.btn-content {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.action-btn.primary .btn-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #fff;
    margin-bottom: 5rpx;
}

.action-btn.primary .btn-desc {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.8);
}

.action-btn.secondary .btn-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 5rpx;
}

.action-btn.secondary .btn-desc {
    font-size: 22rpx;
    color: #999;
}

/* 房间列表 */
.rooms-section {
    margin-bottom: 40rpx;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding: 0 10rpx;
}

.section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.section-count {
    font-size: 24rpx;
    color: #999;
}

.rooms-scroll {
    max-height: 600rpx;
}

.room-list {
    display: flex;
    flex-direction: column;
    gap: 15rpx;
}

.room-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 25rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
    transition: all 0.3s;
}

.room-card:active {
    transform: scale(0.98);
    box-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.06);
}

.room-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15rpx;
}

.room-icon {
    font-size: 32rpx;
}

.room-badge {
    background: #f0f0f0;
    padding: 4rpx 12rpx;
    border-radius: 20rpx;
    font-size: 20rpx;
    color: #999;
}

.room-delete {
    width: 50rpx;
    height: 50rpx;
    border-radius: 50%;
    background: #ff4d4f;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    margin-left: auto;
    font-weight: bold;
}

.room-name {
    display: block;
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 15rpx;
}

.room-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.code-input-wrapper,
.code-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10rpx;
    background: #f8f9ff;
    padding: 8rpx 15rpx;
    border-radius: 10rpx;
}

.code-label {
    font-size: 22rpx;
    color: #999;
}

.code-value {
    font-size: 26rpx;
    font-weight: bold;
    color: #667eea;
    letter-spacing: 4rpx;
}

.copy-hint {
    font-size: 20rpx;
    color: #ad8b00;
}

/* 空状态 */
.empty-state {
    background: #fff;
    border-radius: 20rpx;
    padding: 80rpx 40rpx;
    text-align: center;
    margin: 40rpx 0;
}

.empty-icon {
    display: block;
    font-size: 80rpx;
    margin-bottom: 20rpx;
}

.empty-title {
    display: block;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 10rpx;
}

.empty-desc {
    display: block;
    font-size: 24rpx;
    color: #999;
}

/* 使用指南 */
.guide-section {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
}

.guide-title {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 25rpx;
}

.guide-steps {
    display: flex;
    flex-direction: column;
    gap: 25rpx;
}

.guide-step {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
}

.step-number {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 24rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.step-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5rpx;
}

.step-title {
    font-size: 26rpx;
    font-weight: 500;
    color: #333;
}

.step-desc {
    font-size: 24rpx;
    color: #999;
    line-height: 36rpx;
}

/* 弹窗 */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
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

.modal-dialog {
    width: 90%;
    max-width: 540rpx;
    background: #fff;
    border-radius: 30rpx;
    overflow: hidden;
    animation: slideUp 0.3s;
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
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
}

.close-btn {
    width: 50rpx;
    height: 50rpx;
    border-radius: 50%;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 28rpx;
}

.modal-body {
    padding: 30rpx;
}

.input-group {
    margin-bottom: 30rpx;
}

.input-label {
    display: block;
    font-size: 26rpx;
    color: #666;
    margin-bottom: 12rpx;
}

.modern-input {
    width: 100%;
    height: 80rpx;
    border: 2rpx solid #e5e5e5;
    border-radius: 12rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    color: #333;
    background: #f8f9ff;
}

.modern-input:focus {
    border-color: #667eea;
    background: #fff;
}

.code-input-wrapper {
    position: relative;
}

.code-input {
    width: 100%;
    height: 90rpx;
    border: 2rpx solid #667eea;
    border-radius: 12rpx;
    padding: 0 20rpx;
    font-size: 40rpx;
    text-align: center;
    letter-spacing: 10rpx;
    font-weight: bold;
    color: #667eea;
    background: #f8f9ff;
}

.code-demo {
    position: absolute;
    right: 15rpx;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 4rpx;
    pointer-events: none;
}

.code-demo text {
    font-size: 28rpx;
    color: rgba(102, 126, 234, 0.15);
    font-weight: bold;
}

.input-hint {
    display: block;
    font-size: 22rpx;
    color: #ad8b00;
    margin-top: 10rpx;
}

.modal-footer {
    display: flex;
    gap: 15rpx;
}

.modal-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: bold;
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

.modal-btn[disabled] {
    opacity: 0.6;
}
</style>


