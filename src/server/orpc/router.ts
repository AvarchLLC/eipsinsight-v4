import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

// Context carries headers as a plain record
type Ctx = { headers: Record<string, string> }

export const router = {
  auth: {
    getSession: os
      .$context<Ctx>()
      .handler(async ({ context }) => {
        const result = await auth.api.getSession({ headers: context.headers })
        if (!result?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }
        return result
      }),
  },
  account: {
    update: os
      .$context<Ctx>()
      .input(
        z.object({
          name: z.string().min(1).optional(),
          image: z.string().url().optional(),
          avatarUrl: z.string().url().optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const session = await auth.api.getSession({ headers: context.headers })
        if (!session?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            name: input.name ?? undefined,
            image: input.image ?? undefined,
          },
        })
        return { ok: true }
      }),
    uploadAvatar: os
      .$context<Ctx>()
      .input(z.object({ fileName: z.string(), base64Data: z.string() }))
      .handler(async ({ input, context }) => {
        const session = await auth.api.getSession({ headers: context.headers })
        if (!session?.user) {
          throw new ORPCError('UNAUTHORIZED')
        }

        // Decode base64 to blob
        const buffer = Buffer.from(input.base64Data, 'base64')
        const blob = new Blob([buffer], { type: 'image/jpeg' })

        const { url } = await uploadImageToCloudinary(blob, input.fileName)

        await prisma.user.update({
          where: { id: session.user.id },
          data: { image: url, avatarUrl: url },
        })

        return { url }
      }),
  },
}
