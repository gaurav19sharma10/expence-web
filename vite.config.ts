import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // `tailwindcss()` has to come after `react()`: it hooks the CSS pipeline, and
  // the React plugin rewrites JSX but leaves stylesheets alone.
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Firebase ships many small entry points, and forcing them into one
        // manual chunk made Rollup look for an entry file that does not exist
        // ("Missing '.' specifier in 'firebase'"). Letting Rollup decide is
        // both correct and simpler.
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})