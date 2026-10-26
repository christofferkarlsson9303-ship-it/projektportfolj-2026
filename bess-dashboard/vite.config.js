import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Standardbygget delar koden i delar (3D, Excel, PDF läses först när de behövs).
// `npm run build:single` ger en enda fristående index.html (SINGLEFILE=1).
const singlefile = process.env.SINGLEFILE === '1'

/* Säkerhetsheaders står på ett ställe, vercel.json. `vite preview` — som
   e2e-testerna kör mot — skickar samma headers, så att en för snäv CSP
   fångas av testerna innan den når produktion. */
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'))
const sakerhetsheaders = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))

export default defineConfig({
  plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
  preview: { headers: sakerhetsheaders },
})
