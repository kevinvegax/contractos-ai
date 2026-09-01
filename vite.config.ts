import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import type { IncomingMessage, ServerResponse } from 'node:http'
import invitations from './api/invitations.js'
import acceptInvitation from './api/invitations/accept.js'
import session from './api/auth/session.js'
import signin from './api/auth/signin.js'
import signout from './api/auth/signout.js'
import workspace from './api/workspace.js'
import workspaces from './api/workspaces.js'
import projects from './api/projects.js'

type ApiHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>

const apiRoutes: Record<string, ApiHandler> = {
  '/api/auth/session': session,
  '/api/auth/signin': signin,
  '/api/auth/signout': signout,
  '/api/invitations': invitations,
  '/api/invitations/accept': acceptInvitation,
  '/api/workspace': workspace,
  '/api/workspaces': workspaces,
  '/api/projects': projects,
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not automatically put .env values on process.env. The API
  // handlers use process.env because they also run as serverless functions.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      {
        name: 'local-api-routes',
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
            const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
            const handler = apiRoutes[pathname]
            if (!handler) { next(); return }
            await handler(request, response)
          })
        },
      },
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
  }
})
