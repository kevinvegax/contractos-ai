import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import postgresHandler from './api/postgres.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'local-postgres-api',
      configureServer(server) {
        server.middlewares.use('/api/postgres', (request, response) => {
          void postgresHandler(request, response)
        })
      },
    },
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
