import { os, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

async function requireAdmin(context: Ctx) {
  const session = await auth.api.getSession({ headers: context.headers })
  if (!session?.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'You must be logged in' })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || user.role !== 'admin') {
    throw new ORPCError('FORBIDDEN', { message: 'Admin access required' })
  }
  return session
}

// Extract YouTube video ID from URL
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

const videoSchema = z.object({
  youtubeUrl: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  published: z.boolean().optional(),
  displayOrder: z.number().optional(),
})

export const videoProcedures = {
  list: os
    .$context<Ctx>()
    .input(
      z.object({
        publishedOnly: z.boolean().optional().default(true),
        limit: z.number().min(1).max(100).optional().default(10),
        offset: z.number().min(0).optional().default(0),
        tags: z.array(z.string()).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!input.publishedOnly) {
        await requireAdmin(context)
      }
      const where: any = input.publishedOnly ? { published: true } : {}
      
      // Filter by tags if provided
      if (input.tags && input.tags.length > 0) {
        where.tags = {
          hasSome: input.tags,
        }
      }
      
      const videos = await prisma.video.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        take: input.limit,
        skip: input.offset,
      })
      const total = await prisma.video.count({ where })
      return { videos, total }
    }),

  getAllTags: os
    .$context<Ctx>()
    .handler(async () => {
      const videos = await prisma.video.findMany({
        where: { published: true },
        select: { tags: true },
      })
      
      const allTags = new Set<string>()
      videos.forEach(video => {
        video.tags.forEach(tag => allTags.add(tag))
      })
      
      return Array.from(allTags).sort()
    }),

  getById: os
    .$context<Ctx>()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      const video = await prisma.video.findUnique({
        where: { id: input.id },
      })
      if (!video) {
        throw new ORPCError('NOT_FOUND', { message: 'Video not found' })
      }
      return video
    }),

  create: os
    .$context<Ctx>()
    .input(videoSchema)
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      
      const videoId = extractYouTubeVideoId(input.youtubeUrl)
      if (!videoId) {
        throw new ORPCError('BAD_REQUEST', { message: 'Invalid YouTube URL' })
      }

      // Get the highest display order
      const maxOrder = await prisma.video.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      })

      const displayOrder = input.displayOrder ?? (maxOrder?.displayOrder ?? 0) + 1
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

      const video = await prisma.video.create({
        data: {
          youtubeUrl: input.youtubeUrl,
          youtubeVideoId: videoId,
          title: input.title,
          description: input.description ?? null,
          thumbnail,
          tags: input.tags ?? [],
          published: input.published ?? false,
          displayOrder,
        },
      })
      return video
    }),

  update: os
    .$context<Ctx>()
    .input(
      z.object({
        id: z.string(),
        youtubeUrl: z.string().url().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().optional(),
        displayOrder: z.number().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      
      const existing = await prisma.video.findUnique({
        where: { id: input.id },
      })
      if (!existing) {
        throw new ORPCError('NOT_FOUND', { message: 'Video not found' })
      }

      let videoId = existing.youtubeVideoId
      let thumbnail = existing.thumbnail

      if (input.youtubeUrl) {
        const newVideoId = extractYouTubeVideoId(input.youtubeUrl)
        if (!newVideoId) {
          throw new ORPCError('BAD_REQUEST', { message: 'Invalid YouTube URL' })
        }
        videoId = newVideoId
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }

      const video = await prisma.video.update({
        where: { id: input.id },
        data: {
          ...(input.youtubeUrl && { youtubeUrl: input.youtubeUrl, youtubeVideoId: videoId, thumbnail }),
          ...(input.title && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.tags !== undefined && { tags: input.tags }),
          ...(input.published !== undefined && { published: input.published }),
          ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        },
      })
      return video
    }),

  delete: os
    .$context<Ctx>()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      await prisma.video.delete({
        where: { id: input.id },
      })
      return { success: true }
    }),

  reorder: os
    .$context<Ctx>()
    .input(z.object({ videoIds: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      
      // Update display order for each video
      const updates = input.videoIds.map((id, index) =>
        prisma.video.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
      
      await prisma.$transaction(updates)
      return { success: true }
    }),
}
