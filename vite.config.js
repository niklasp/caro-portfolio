import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages liefert unter /caro-portfolio/ aus, Vercel & Co. unter /.
export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES ? '/caro-portfolio/' : '/',
})
