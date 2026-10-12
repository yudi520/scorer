import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		uni({
			// H5 配置
			h5: {
				// 公共基础路径
				publicPath: './',
				// 开发服务器端口
				devServer: {
					port: 3000,
					open: true,
				},
				// 路由模式
				router: {
					mode: 'hash',
					base: './',
				},
				// 优化配置
				optimization: {
					treeShaking: {
						enable: true,
					},
				},
			},
		}),
	],
	// 构建配置
	build: {
		// 目标浏览器
		target: 'es2015',
		// 压缩配置
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: false,
				drop_debugger: false,
			},
		},
		// 分块策略
		rollupOptions: {
			output: {
				manualChunks: {
					'vue-vendor': ['vue', '@vue/runtime-core'],
					'uni-vendor': ['@dcloudio/uni-h5'],
				},
			},
		},
	},
	// 开发配置
	server: {
		port: 3000,
		host: '0.0.0.0',
		open: true,
		cors: true,
	},
	// CSS 预处理器配置
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@import "@/static/common.css";`,
			},
		},
	},
});
