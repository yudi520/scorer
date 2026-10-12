<template>
	<view class="tea-page">
		<view class="tea-header">
			<text class="tea-title">茶水费</text>
			<text class="tea-amount">¥{{ teaAmount }}</text>
		</view>

		<view class="tea-actions">
			<button class="tea-btn" @click="handleAddTea">添加茶水费</button>
		</view>

		<view class="tea-history">
			<text class="history-title">茶水费记录</text>
			<scroll-view scroll-y class="history-list">
				<view
					v-for="(item, index) in teaHistory"
					:key="item.id"
					class="history-item"
				>
					<view class="item-left">
						<text class="item-amount">¥{{ item.amount }}</text>
						<text class="item-time">{{ formatTime(item.timestamp) }}</text>
					</view>
					<view class="item-right">
						<text class="item-remark" v-if="item.description">{{
							item.description
						}}</text>
					</view>
				</view>
				<view v-if="teaHistory.length === 0" class="empty-tip">
					<text>暂无茶水费记录</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import localDataService from '@/utils/localDataService.js'

export default {
  data() {
    return {
      teaAmount: 0,
      teaHistory: [],
      currentRoom: null,
      teaFeeAddedHandler: null
    }
  },

  onLoad() {
    this.loadTeaData();
    this.setupListeners();
  },

  onUnload() {
    if (this.teaFeeAddedHandler) {
      localDataService.off('teaFeeAdded', this.teaFeeAddedHandler);
    }
  },

  methods: {
    loadTeaData() {
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

      this.calculateTeaTotal();
    },

    setupListeners() {
      this.teaFeeAddedHandler = (data) => {
        if (data.teaFee) {
          this.teaHistory.push(data.teaFee);
          this.calculateTeaTotal();
          uni.showToast({ title: '茶水费已添加', icon: 'success' });
        }
      };
      localDataService.on('teaFeeAdded', this.teaFeeAddedHandler);
    },

    calculateTeaTotal() {
      const total = this.teaHistory.reduce((sum, item) => sum + item.amount, 0);
      this.teaAmount = total;
    },

    handleAddTea() {
      uni.showModal({
        title: '添加茶水费',
        content: '请输入茶水费金额',
        editable: true,
        placeholderText: '请输入金额',
        success: (res) => {
          if (res.confirm && res.content) {
            const amount = parseFloat(res.content);

            if (isNaN(amount) || amount <= 0) {
              uni.showToast({ title: '请输入有效金额', icon: 'none' });
              return;
            }

            localDataService.addTeaFee({
              roomId: this.currentRoom.id,
              amount: amount,
              description: '茶水费'
            });
          }
        }
      });
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}/${date.getDate()} ${String(
        date.getHours()
      ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }
}
</script>

<style scoped lang="scss">
.tea-page {
	padding: 20rpx;
}

.tea-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	margin-bottom: 30rpx;
}

.tea-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #ffffff;
}

.tea-amount {
	font-size: 48rpx;
	font-weight: bold;
	color: #ffffff;
}

.tea-actions {
	margin-bottom: 30rpx;
}

.tea-btn {
	width: 100%;
	height: 90rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 45rpx;
	color: #ffffff;
	font-size: 32rpx;
	border: none;
}

.tea-history {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
}

.history-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
	margin-bottom: 20rpx;
	display: block;
}

.history-list {
	max-height: 800rpx;
}

.history-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 25rpx;
	background: #f8f9fa;
	border-radius: 15rpx;
	margin-bottom: 20rpx;
}

.item-left {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.item-amount {
	font-size: 36rpx;
	font-weight: bold;
	color: #667eea;
	margin-bottom: 8rpx;
}

.item-time {
	font-size: 24rpx;
	color: #999999;
}

.item-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.item-payer {
	font-size: 28rpx;
	color: #333333;
	margin-bottom: 8rpx;
}

.item-remark {
	font-size: 24rpx;
	color: #999999;
}

.empty-tip {
	text-align: center;
	padding: 60rpx 0;
	color: #999999;
	font-size: 28rpx;
}
</style>
