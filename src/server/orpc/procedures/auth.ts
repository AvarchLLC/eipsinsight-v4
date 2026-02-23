import { os, type Ctx } from './types'
import { auth } from '@/lib/auth'

export const authProcedures = {
  getSession: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      try {
        const result = await auth.api.getSession({
          headers: new Headers(context.headers),
        })
        return result ?? null
      } catch {
        // Return null instead of 500 when session fetch fails (e.g. DB connection, config)
        return null
      }
    }),
}
