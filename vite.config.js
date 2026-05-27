import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: set `base` to match your GitHub repository name.
// e.g. if your repo is github.com/bilge-kobas/sourcebook, use '/sourcebook/'
// For a user/org root site (username.github.io) use '/'
// ─────────────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  base: '/sourcebook/',   // ← change this if your repo has a different name
})
