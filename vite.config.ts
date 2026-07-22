import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,   // listen on 0.0.0.0 so phones on the same Wi-Fi can connect
    port: 5173,
  },
  // TEMP (diag-build-6): disable minification so the React component stack shown
  // in the chart error fallback is readable in prod while we pinpoint the
  // render-loop source. Revert once diagnosed.
  build: {
    minify: false,
  },
})
