import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Standardbygget delar koden i delar (3D, Excel, PDF läses först när de behövs).
// `npm run build:single` ger en enda fristående index.html (SINGLEFILE=1).
const singlefile = process.env.SINGLEFILE === '1'

export default defineConfig({
  plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
})
