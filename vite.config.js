import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/super-admin': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/restaurants': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/orders': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/fleets': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/offers': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/bookings': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/events': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/coupons': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/banners': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/notifications': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/global-settings': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/restaurant-menu': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/restaurant_enum': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/subscriptions': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/enum': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/user': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/attendance': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/dining-spaces': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      '/work-types': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
