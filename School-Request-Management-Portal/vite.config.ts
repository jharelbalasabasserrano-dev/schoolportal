import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const requiredFrontendEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_MESSAGE_ATTACHMENTS_BUCKET',
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const missing = requiredFrontendEnv.filter((key) => !env[key]?.trim())

  if (missing.length > 0) {
    throw new Error([
      '[vite env] Missing required Supabase frontend environment variables:',
      ...missing.map((key) => `- ${key}`),
      'Add them to School-Request-Management-Portal/.env for local dev.',
      'For Render or other production builds, add the same VITE_* variables to the frontend service environment and redeploy.',
    ].join('\n'))
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8080',
      },
    },
  }
})
