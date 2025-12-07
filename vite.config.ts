import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Note: Vite automatically loads .env.local files (highest priority)
// File loading order: .env.local > .env.[mode].local > .env.[mode] > .env
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_', // Only expose env variables prefixed with VITE_ to the client
})

