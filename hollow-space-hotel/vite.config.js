import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'icons',
              test: /node_modules[\\/]ionicons[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['ionicons'],
  },
})
