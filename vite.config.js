import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleNewsRequest } from './server/newsHandler.js'

// Mirrors api/news.js so /api/news works under `npm run dev` without Vercel.
function harboredApi() {
  return {
    name: 'harbored-api',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const { status, body } = await handleNewsRequest(
          url.searchParams.get('q'),
          Number(url.searchParams.get('limit')) || 5
        )
        res.statusCode = status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), harboredApi()],
})
