import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const gatewayUrl = process.env.VITE_API_GATEWAY_URL || 'http://localhost:8888'

  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/identity':       { target: gatewayUrl, changeOrigin: true },
        '/profile':        { target: gatewayUrl, changeOrigin: true },
        '/books':          { target: gatewayUrl, changeOrigin: true },
        '/file':           { target: gatewayUrl, changeOrigin: true },
        '/post':           { target: gatewayUrl, changeOrigin: true },
        '/recommendation': { target: gatewayUrl, changeOrigin: true },
        '/notification':   { target: gatewayUrl, changeOrigin: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split vendor chunks for better browser caching
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts';
            }
            if (id.includes('@tanstack')) {
              return 'query';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('axios')) {
              return 'http';
            }
          },
        },
      },
    },
  }
})
