<template>
    <view class="container">
        <view class="fund-info">
            <text class="label">资金池总额</text>
            <text class="amount">¥{{ poolAmount.toFixed(2) }}</text>
        </view>

        <view class="action-buttons">
            <button class="btn-add" @tap="showAddDialog">存入资金</button>
            <button class="btn-subtract" @tap="showSubtractDialog">
                取出资金
            </button>
        </view>

        <view v-if="showAmountDialog" class="amount-modal">
            <view class="amount-modal-mask" @tap="hideAmountDialog"></view>
            <view class="amount-modal-content">
                <text class="amount-modal-title">{{
                    dialogType === "add" ? "存入资金" : "取出资金"
                }}</text>
                <view class="amount-display-wrap" @tap="toggleAmountOptions">
                    <text class="amount-currency">¥</text>
                    <view class="amount-display">{{
                        selectedAmount || "请选择金额"
                    }}</view>
                </view>
                <view v-if="showAmountOptions" class="amount-options">
                    <view
                        v-for="(row, rowIndex) in presetAmountRows"
                        :key="rowIndex"
                        class="amount-option-row"
                    >
                        <view
                            v-for="amount in row"
                            :key="amount"
                            class="amount-option"
                            :class="{
                                active: selectedAmount === String(amount),
                            }"
                            @tap="selectAmount(amount)"
                        >
                            {{ amount }}
                        </view>
                    </view>
                </view>
                <view class="amount-modal-actions">
                    <button class="amount-btn cancel" @tap="hideAmountDialog">
                        取消
                    </button>
                    <button
                        class="amount-btn confirm"
                        :class="dialogType"
                        @tap="confirmAmountDialog"
                    >
                        确定
                    </button>
                </view>
            </view>
        </view>

        <view class="history-section">
            <text class="section-title">操作记录</text>
            <view class="history-list">
                <view
                    class="history-item"
                    v-for="op in operations"
                    :key="op.id"
                >
                    <view class="record-info">
                        <text class="record-desc">{{
                            op.description || "无备注"
                        }}</text>
                        <text class="record-time">{{
                            formatTime(op.timestamp)
                        }}</text>
                    </view>
                    <text
                        class="record-amount"
                        :class="{
                            positive: op.amount > 0,
                            negative: op.amount < 0,
                        }"
                    >
                        {{ op.amount > 0 ? "+" : "" }}{{ op.amount.toFixed(2) }}
                    </text>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
import localDataService from "@/utils/localDataService.js";

export default {
    data() {
        return {
            poolAmount: 0,
            operations: [],
            currentRoom: null,
            playerName: "",
            fundAddedHandler: null,
            fundSubtractedHandler: null,
            showAmountDialog: false,
            showAmountOptions: false,
            dialogType: "add",
            selectedAmount: "",
            presetAmountRows: [
                [1, 5, 10, 15, 20, 30],
                [40, 50, 60, 70, 80, 100],
            ],
        };
    },

    onLoad() {
        this.loadFundData();
        this.setupListeners();
    },

    onUnload() {
        if (this.fundAddedHandler) {
            localDataService.off("fundAdded", this.fundAddedHandler);
        }
        if (this.fundSubtractedHandler) {
            localDataService.off("fundSubtracted", this.fundSubtractedHandler);
        }
    },

    methods: {
        loadFundData() {
            const room = localDataService.getCurrentRoom();
            const storageRoom = uni.getStorageSync("currentRoom");

            this.currentRoom = room || storageRoom;

            if (!this.currentRoom || !this.currentRoom.id) {
                uni.showToast({
                    title: "房间信息无效",
                    icon: "none",
                });
                setTimeout(() => {
                    uni.navigateBack();
                }, 1500);
                return;
            }

            // 获取玩家名称
            this.playerName =
                this.currentRoom.players && this.currentRoom.players[0]
                    ? this.currentRoom.players[0].name
                    : "玩家";

            // 加载共享资金池数据
            this.poolAmount = this.currentRoom.poolAmount || 0;
            this.operations = (this.currentRoom.operations || [])
                .slice()
                .reverse();
        },

        setupListeners() {
            this.fundAddedHandler = (data) => {
                if (data.poolAmount !== undefined) {
                    this.poolAmount = data.poolAmount;
                    this.operations.unshift(data.operation);
                    uni.showToast({ title: "已存入资金池", icon: "success" });
                }
            };
            localDataService.on("fundAdded", this.fundAddedHandler);

            this.fundSubtractedHandler = (data) => {
                if (data.poolAmount !== undefined) {
                    this.poolAmount = data.poolAmount;
                    this.operations.unshift(data.operation);
                    uni.showToast({ title: "已从资金池取出", icon: "success" });
                }
            };
            localDataService.on("fundSubtracted", this.fundSubtractedHandler);
        },

        formatTime(timestamp) {
            if (!timestamp) return "";
            const date = new Date(timestamp);
            return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        },

        showAddDialog() {
            this.showAmountDialog = true;
            this.showAmountOptions = true;
            this.dialogType = "add";
            this.selectedAmount = "";
        },

        showSubtractDialog() {
            this.showAmountDialog = true;
            this.showAmountOptions = true;
            this.dialogType = "subtract";
            this.selectedAmount = "";
        },

        hideAmountDialog() {
            this.showAmountDialog = false;
            this.showAmountOptions = false;
            this.selectedAmount = "";
        },

        toggleAmountOptions() {
            this.showAmountOptions = !this.showAmountOptions;
        },

        selectAmount(amount) {
            this.selectedAmount = String(amount);
        },

        confirmAmountDialog() {
            const amount = parseFloat(this.selectedAmount);

            if (isNaN(amount) || amount <= 0) {
                uni.showToast({ title: "请选择有效金额", icon: "none" });
                return;
            }

            if (this.dialogType === "add") {
                this.addFund(amount);
            } else {
                this.subtractFund(amount);
            }

            this.hideAmountDialog();
        },

        addFund(amount) {
            if (isNaN(amount) || amount === 0) {
                uni.showToast({ title: "请输入有效金额", icon: "none" });
                return;
            }

            localDataService.addFund({
                roomId: this.currentRoom.id,
                playerName: this.playerName,
                amount: amount,
                description: "存入",
            });
        },

        subtractFund(amount) {
            if (isNaN(amount) || amount === 0) {
                uni.showToast({ title: "请输入有效金额", icon: "none" });
                return;
            }

            localDataService.subtractFund({
                roomId: this.currentRoom.id,
                playerName: this.playerName,
                amount: amount,
                description: "取出",
            });
        },
    },
};
</script>

<style scoped>
.container {
    min-height: 100vh;
    background: #f5f5f5;
    padding: 30rpx;
}

.fund-info {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20rpx;
    padding: 50rpx;
    text-align: center;
    margin-bottom: 30rpx;
}

.label {
    display: block;
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 20rpx;
}

.amount {
    display: block;
    font-size: 60rpx;
    font-weight: bold;
    color: #fff;
}

.action-buttons {
    display: flex;
    gap: 20rpx;
    margin-bottom: 30rpx;
}

.btn-add,
.btn-subtract {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    border: none;
}

.btn-add {
    background: #52c41a;
    color: #fff;
}

.btn-subtract {
    background: #ff4d4f;
    color: #fff;
}

.history-section {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
}

.amount-modal {
    position: fixed;
    inset: 0;
    z-index: 999;
}

.amount-modal-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
}

.amount-modal-content {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 82%;
    background: #fff;
    border-radius: 24rpx;
    padding: 40rpx 32rpx 32rpx;
    box-sizing: border-box;
}

.amount-modal-title {
    display: block;
    text-align: center;
    font-size: 34rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 32rpx;
}

.amount-display-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 28rpx;
}

.amount-currency {
    font-size: 46rpx;
    color: #333;
    margin-right: 10rpx;
}

.amount-display {
    width: 320rpx;
    min-height: 84rpx;
    line-height: 84rpx;
    text-align: center;
    font-size: 56rpx;
    font-weight: bold;
    color: #333;
    border-bottom: 2rpx solid #e5e5e5;
}

.amount-options {
    margin-bottom: 32rpx;
}

.amount-option-row {
    display: flex;
    justify-content: space-between;
}

.amount-option-row + .amount-option-row {
    margin-top: 16rpx;
}

.amount-option {
    width: 88rpx;
    height: 72rpx;
    line-height: 72rpx;
    text-align: center;
    border-radius: 12rpx;
    background: #f3f4f6;
    color: #333;
    font-size: 28rpx;
}

.amount-option.active {
    background: #1890ff;
    color: #fff;
}

.amount-modal-actions {
    display: flex;
    gap: 20rpx;
}

.amount-btn {
    flex: 1;
    height: 84rpx;
    line-height: 84rpx;
    border-radius: 42rpx;
    font-size: 30rpx;
    border: none;
}

.amount-btn.cancel {
    background: #f3f4f6;
    color: #666;
}

.amount-btn.confirm {
    color: #fff;
}

.amount-btn.confirm.add {
    background: #52c41a;
}

.amount-btn.confirm.subtract {
    background: #ff4d4f;
}

.section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
}

.record-info {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
}

.record-desc {
    font-size: 28rpx;
    color: #333;
}

.record-time {
    font-size: 24rpx;
    color: #999;
}

.record-amount {
    font-size: 32rpx;
    font-weight: bold;
}

.record-amount.positive {
    color: #52c41a;
}

.record-amount.negative {
    color: #ff4d4f;
}
</style>
