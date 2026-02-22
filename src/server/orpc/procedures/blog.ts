import { os, ORPCError, type Ctx } from './types'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadImageToCloudinary } from '@/lib/cloudinary'
import { sendEmail } from '@/lib/email'
import { env } from '@/env'
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

async function requireEditor(context: Ctx) {
  const session = await auth.api.getSession({ headers: context.headers })
  if (!session?.user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'You must be logged in' })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    throw new ORPCError('FORBIDDEN', { message: 'Editor or admin access required' })
  }
  return session
}

const blogSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImage: z.string().url().optional().nullable(),
  published: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  readingTimeMinutes: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
})

const authorProfileSchema = z.object({
  linkedin: z.string().url().optional().nullable().or(z.literal('')),
  x: z.string().url().optional().nullable().or(z.literal('')),
  facebook: z.string().url().optional().nullable().or(z.literal('')),
  telegram: z.string().optional().nullable().or(z.literal('')),
  bio: z.string().optional().nullable(),
})

export const blogProcedures = {
  list: os
    .$context<Ctx>()
    .input(
      z.object({
        publishedOnly: z.boolean().optional().default(true),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        categorySlug: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      if (!input.publishedOnly) {
        await requireEditor(context)
      }
      const where: { published?: boolean; category?: { slug: string } } = input.publishedOnly ? { published: true } : {}
      if (input.categorySlug) {
        where.category = { slug: input.categorySlug }
      }
      const posts = await prisma.blog.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: input.limit,
        skip: input.offset,
        include: {
          author: { select: { id: true, name: true, image: true, blog_editor_profile: true } },
          category: { select: { id: true, slug: true, name: true } },
        },
      })
      const total = await prisma.blog.count({ where })
      return { posts, total }
    }),

  getById: os
    .$context<Ctx>()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await requireEditor(context)
      const post = await prisma.blog.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, name: true, image: true, blog_editor_profile: true } },
          category: { select: { id: true, slug: true, name: true } },
        },
      })
      if (!post) {
        throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
      }
      return post
    }),

  getBySlug: os
    .$context<Ctx>()
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input, context }) => {
      const post = await prisma.blog.findUnique({
        where: { slug: input.slug },
        include: {
          author: { select: { id: true, name: true, image: true, blog_editor_profile: true } },
          category: { select: { id: true, slug: true, name: true } },
        },
      })
      if (!post) {
        throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
      }
      if (!post.published) {
        try {
          await requireEditor(context)
        } catch {
          throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
        }
      }
      return post
    }),

  create: os
    .$context<Ctx>()
    .input(blogSchema)
    .handler(async ({ input, context }) => {
      const session = await requireEditor(context)
      const existing = await prisma.blog.findUnique({ where: { slug: input.slug } })
      if (existing) {
        throw new ORPCError('BAD_REQUEST', { message: 'A blog post with this slug already exists' })
      }
      const { categoryId, readingTimeMinutes, tags, featured, ...rest } = input
      const post = await prisma.blog.create({
        data: {
          ...rest,
          authorId: session.user.id,
          published: input.published ?? false,
          categoryId: categoryId || null,
          readingTimeMinutes: readingTimeMinutes ?? null,
          tags: tags ?? [],
          featured: featured ?? false,
        },
        include: {
          author: { select: { id: true, name: true, image: true, blog_editor_profile: true } },
          category: { select: { id: true, slug: true, name: true } },
        },
      })
      return post
    }),

  update: os
    .$context<Ctx>()
    .input(
      z.object({
        id: z.string(),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
        title: z.string().min(1).optional(),
        excerpt: z.string().optional().nullable(),
        content: z.string().min(1).optional(),
        coverImage: z.string().url().optional().nullable(),
        published: z.boolean().optional(),
        categoryId: z.string().optional().nullable(),
        readingTimeMinutes: z.number().min(0).optional().nullable(),
        tags: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const session = await requireEditor(context)
      const existing = await prisma.blog.findUnique({ where: { id: input.id } })
      if (!existing) {
        throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
      }
      if (existing.authorId !== session.user.id && (await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }))?.role !== 'admin') {
        throw new ORPCError('FORBIDDEN', { message: 'You can only edit your own posts' })
      }
      const { id, ...data } = input
      const post = await prisma.blog.update({
        where: { id },
        data: data as Record<string, unknown>,
        include: {
          author: { select: { id: true, name: true, image: true, blog_editor_profile: true } },
          category: { select: { id: true, slug: true, name: true } },
        },
      })
      return post
    }),

  delete: os
    .$context<Ctx>()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const session = await requireEditor(context)
      const existing = await prisma.blog.findUnique({ where: { id: input.id } })
      if (!existing) {
        throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
      if (existing.authorId !== session.user.id && user?.role !== 'admin') {
        throw new ORPCError('FORBIDDEN', { message: 'Only admins can delete others\' posts' })
      }
      await prisma.blog.delete({ where: { id: input.id } })
      return { ok: true }
    }),

  uploadCoverImage: os
    .$context<Ctx>()
    .input(z.object({ fileName: z.string(), base64Data: z.string() }))
    .handler(async ({ input, context }) => {
      await requireEditor(context)
      const buffer = Buffer.from(input.base64Data, 'base64')
      const blob = new Blob([buffer], { type: 'image/jpeg' })
      const { url } = await uploadImageToCloudinary(blob, input.fileName)
      return { url }
    }),

  // ─── Editor management (admin only) ───
  listEditors: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await requireAdmin(context)
      const users = await prisma.user.findMany({
        where: { role: { in: ['admin', 'editor'] } },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          blog_editor_profile: true,
        },
        orderBy: { name: 'asc' },
      })
      return users
    }),

  addEditor: os
    .$context<Ctx>()
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      const user = await prisma.user.findUnique({ where: { id: input.userId } })
      if (!user) {
        throw new ORPCError('NOT_FOUND', { message: 'User not found' })
      }
      const newRole = user.role === 'admin' ? 'admin' : 'editor'
      await prisma.user.update({
        where: { id: input.userId },
        data: { role: newRole },
      })
      try {
        await sendEmail({
          to: user.email,
          subject: "You've been added as a blog editor — EIPsInsight",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0f172a;">You've been added as a blog editor</h2>
              <p>Hi ${user.name},</p>
              <p>An admin has granted you blog editor access on EIPsInsight. You can now create and edit blog posts.</p>
              <p><a href="${env.BETTER_AUTH_URL}/admin/blogs" style="display: inline-block; padding: 10px 20px; background: linear-gradient(to right, #10b981, #22d3ee); color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Manage Blogs</a></p>
              <p style="color: #64748b; font-size: 12px;">If you didn't expect this, you can ignore this email.</p>
            </div>
          `,
        })
      } catch (e) {
        console.warn('[addEditor] Failed to send notification email:', e)
      }
      return { ok: true }
    }),

  removeEditor: os
    .$context<Ctx>()
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      const user = await prisma.user.findUnique({ where: { id: input.userId } })
      if (!user) {
        throw new ORPCError('NOT_FOUND', { message: 'User not found' })
      }
      if (user.role === 'admin') {
        throw new ORPCError('BAD_REQUEST', { message: 'Cannot remove admin role' })
      }
      await prisma.user.update({
        where: { id: input.userId },
        data: { role: 'user' },
      })
      return { ok: true }
    }),

  searchUsers: os
    .$context<Ctx>()
    .input(z.object({ email: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      const users = await prisma.user.findMany({
        where: { email: { contains: input.email, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, image: true, role: true },
        take: 10,
      })
      return users
    }),

  // ─── Categories ───
  listCategories: os
    .$context<Ctx>()
    .handler(async () => {
      return prisma.blog_category.findMany({
        orderBy: { name: 'asc' },
      })
    }),

  createCategory: os
    .$context<Ctx>()
    .input(z.object({ slug: z.string().min(1), name: z.string().min(1), description: z.string().optional() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      const slug = input.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const existing = await prisma.blog_category.findUnique({ where: { slug } })
      if (existing) {
        throw new ORPCError('BAD_REQUEST', { message: 'Category with this slug already exists' })
      }
      return prisma.blog_category.create({
        data: { slug, name: input.name, description: input.description },
      })
    }),

  // ─── Author profile (editor updates own) ───
  getMyEditorProfile: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      const session = await requireEditor(context)
      const profile = await prisma.blog_editor_profile.findUnique({
        where: { user_id: session.user.id },
      })
      return profile
    }),

  updateMyEditorProfile: os
    .$context<Ctx>()
    .input(authorProfileSchema)
    .handler(async ({ input, context }) => {
      const session = await requireEditor(context)
      const clean = {
        linkedin: input.linkedin || null,
        x: input.x || null,
        facebook: input.facebook || null,
        telegram: input.telegram || null,
        bio: input.bio || null,
      }
      await prisma.blog_editor_profile.upsert({
        where: { user_id: session.user.id },
        create: { user_id: session.user.id, ...clean },
        update: clean,
      })
      return { ok: true }
    }),

  // ─── Likes (public) ───
  getLikeCount: os
    .$context<Ctx>()
    .input(z.object({ blogId: z.string() }))
    .handler(async ({ input }) => {
      return prisma.blog_like.count({ where: { blogId: input.blogId } })
    }),

  toggleLike: os
    .$context<Ctx>()
    .input(z.object({ blogId: z.string(), likeKey: z.string().min(1) }))
    .handler(async ({ input }) => {
      const existing = await prisma.blog_like.findUnique({
        where: { blogId_likeKey: { blogId: input.blogId, likeKey: input.likeKey } },
      })
      if (existing) {
        await prisma.blog_like.delete({ where: { id: existing.id } })
        return { liked: false }
      }
      await prisma.blog_like.create({
        data: { blogId: input.blogId, likeKey: input.likeKey },
      })
      return { liked: true }
    }),

  checkLiked: os
    .$context<Ctx>()
    .input(z.object({ blogId: z.string(), likeKey: z.string().min(1) }))
    .handler(async ({ input }) => {
      const existing = await prisma.blog_like.findUnique({
        where: { blogId_likeKey: { blogId: input.blogId, likeKey: input.likeKey } },
      })
      return { liked: !!existing }
    }),

  // ─── Comments (public read, auth required to post) ───
  getComments: os
    .$context<Ctx>()
    .input(z.object({ blogId: z.string() }))
    .handler(async ({ input }) => {
      return prisma.blog_comment.findMany({
        where: { blogId: input.blogId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      })
    }),

  addComment: os
    .$context<Ctx>()
    .input(z.object({
      blogId: z.string(),
      content: z.string().min(1).max(2000),
    }))
    .handler(async ({ input, context }) => {
      const session = await auth.api.getSession({ headers: context.headers })
      if (!session?.user) {
        throw new ORPCError('UNAUTHORIZED', { message: 'You must be logged in to comment' })
      }
      const blog = await prisma.blog.findUnique({ where: { id: input.blogId } })
      if (!blog || !blog.published) {
        throw new ORPCError('NOT_FOUND', { message: 'Blog post not found' })
      }
      return prisma.blog_comment.create({
        data: {
          blogId: input.blogId,
          userId: session.user.id,
          authorName: session.user.name ?? 'Anonymous',
          authorEmail: session.user.email ?? null,
          content: input.content,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      })
    }),

  deleteComment: os
    .$context<Ctx>()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await requireAdmin(context)
      await prisma.blog_comment.delete({ where: { id: input.id } })
      return { ok: true }
    }),
}
