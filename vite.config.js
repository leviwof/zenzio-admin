import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = (env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/super-admin': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/users': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/restaurants': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/orders': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/fleets': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/offers': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/bookings': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/events': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/coupons': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/banners': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/notifications': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/global-settings': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/restaurant-menu': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/restaurant_enum': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/subscriptions': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/enum': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/user': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/attendance': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/dining-spaces': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/work-types': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
})
