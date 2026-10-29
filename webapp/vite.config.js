import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Output goes straight into /public (served at :3000 and packaged into the APK).
// emptyOutDir=false keeps data/, vendor/, game.html and the APK file intact.
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: '../public',
    emptyOutDir: false,
    target: 'es2018',
    chunkSizeWarningLimit: 1500
  }
})
