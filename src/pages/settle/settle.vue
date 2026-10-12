<template>
	<view class="settle-page">
		<view class="settle-header">
			<text class="settle-title">结算</text>
			<view class="total-amount">
				<text class="amount-label">总金额</text>
				<text class="amount-value">¥{{ totalAmount }}</text>
			</view>
			<view class="per-amount">
				<text class="amount-label">人均金额</text>
				<text class="amount-value">¥{{ perPersonAmount }}</text>
			</view>
		</view>

		<view class="settle-list">
			<text class="list-title">玩家结算</text>
			<scroll-view scroll-y class="player-list">
				<view
					v-for="(item, index) in settleList"
					:key="item.playerId"
					class="player-item"
				>
					<view class="player-info">
						<text class="player-name">{{ item.playerName }}</text>
						<text class="player-score"
							>资金: ¥{{ item.totalFunds }}</text
						>
					</view>
					<view class="player-amount">
						<text
							:class="[
								'amount-text',
								item.netAmount >= 0 ? 'positive' : 'negative',
							]"
						>
							{{ item.netAmount >= 0 ? '+' : '' }}{{ item.netAmount.toFixed(2) }}
						</text>
					</view>
				</view>
				<view v-if="settleList.length === 0" class="empty-tip">
					<text>暂无结算数据</text>
				</view>
			</scroll-view>
		</view>

		<view class="settle-actions">
			<button class="confirm-btn" @click="handleCalculateSettle">
				计算结算
			</button>
		</view>
	</view>
</template>

<script>
import localDataService from '@/utils/localDataService.js'

export default {
  data() {
    return {
      totalAmount: 0,
      perPersonAmount: 0,
      settleList: [],
      currentRoom: null,
      settlementCalculatedHandler: null
    }
  },

  onLoad() {
    this.loadSettleData();
    this.setupListeners();
  },

  onUnload() {
    if (this.settlementCalculatedHandler) {
      localDataService.off('settlementCalculated', this.settlementCalculatedHandler);
    }
  },

  methods: {
    loadSettleData() {
      const room = localDataService.getCurrentRoom();
      const storageRoom = uni.getStorageSync('currentRoom');

      this.currentRoom = room || storageRoom;

      if (!this.currentRoom || !this.currentRoom.id) {
        uni.showToast({
          title: '房间信息无效',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
        return;
      }
    },

    setupListeners() {
      this.settlementCalculatedHandler = (data) => {
        this.totalAmount = data.totalTeaFee || 0;
        this.perPersonAmount = data.teaFeePerPlayer || 0;
        this.settleList = data.settlements || [];

        uni.showToast({
          title: '结算计算完成',
          icon: 'success',
        });
      };
      localDataService.on('settlementCalculated', this.settlementCalculatedHandler);
    },

    handleCalculateSettle() {
      uni.showModal({
        title: '计算结算',
        content: '确认要计算当前房间结算吗？',
        success: (res) => {
          if (res.confirm) {
            localDataService.calculateSettlement({
              roomId: this.currentRoom.id
            });
          }
        },
      });
    }
  }
}
</script>

<style scoped lang="scss">
.settle-page {
	padding: 20rpx;
}

.settle-header {
	padding: 30rpx;
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	border-radius: 20rpx;
	margin-bottom: 30rpx;
}

.settle-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #ffffff;
	display: block;
	margin-bottom: 20rpx;
}

.total-amount,
.per-amount {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15rpx;
}

.amount-label {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.9);
}

.amount-value {
	font-size: 40rpx;
	font-weight: bold;
	color: #ffffff;
}

.settle-list {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
}

.list-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
	margin-bottom: 20rpx;
	display: block;
}

.player-list {
	max-height: 600rpx;
}

.player-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 25rpx;
	background: #f8f9fa;
	border-radius: 15rpx;
	margin-bottom: 20rpx;
}

.player-info {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.player-name {
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
	margin-bottom: 8rpx;
}

.player-score {
	font-size: 24rpx;
	color: #999999;
}

.player-amount {
	display: flex;
	align-items: center;
}

.amount-text {
	font-size: 36rpx;
	font-weight: bold;
}

.amount-text.positive {
	color: #f5576c;
}

.amount-text.negative {
	color: #4caf50;
}

.empty-tip {
	text-align: center;
	padding: 60rpx 0;
	color: #999999;
	font-size: 28rpx;
}

.settle-actions {
	margin-top: 30rpx;
}

.confirm-btn {
	width: 100%;
	height: 90rpx;
	background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
	border-radius: 45rpx;
	color: #ffffff;
	font-size: 32rpx;
	border: none;
}
</style>
