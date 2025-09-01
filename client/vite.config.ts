import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'      // if your template uses @vitejs/plugin-react, import that instead
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
})
