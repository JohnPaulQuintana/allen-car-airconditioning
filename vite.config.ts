import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace this with your actual Cloudflare tunnel domain
const cloudflareHost = "families-named-infections-tongue.trycloudflare.com";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [cloudflareHost],
    host: true,
  },
  base: "/", // default is fine
})
