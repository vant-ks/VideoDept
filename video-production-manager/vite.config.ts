import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3011,
    strictPort: true,
    open: false,
  },
  preview: {
    port: parseInt(process.env.PORT || '3011'),
    host: '0.0.0.0',
  },
})
