import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default(
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"
    ),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_ACCESS_TOKEN: z.string().min(1),
    EMAIL_SERVICE: z.string().min(1),
    EMAIL_HOST: z.string().min(1),
    EMAIL_PORT: z.coerce.number(),
    EMAIL_USERNAME: z.string().min(1),
    EMAIL_PASSWORD: z.string().min(1),
    EMAIL_FROM: z.string().email(),
    CLOUDINARY_URL: z.string().url(),
    CLOUDINARY_UPLOAD_PRESET: z.string().min(1).optional(),
    // Ghost CMS (optional)
    GHOST_CONTENT_API_KEY: z.string().optional(),
    GHOST_ADMIN_API_KEY: z.string().optional(),
    GHOST_API_URL: z.string().url().optional(),
    // Cloudflare (optional — note: .env may have CLOUDFARE typo)
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_API_TOKEN: z.string().optional(),
    COHERE_API_KEY: z.string().min(1).optional(),

    REDIS_URL: z.string().url(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime. Use NEXT_PUBLIC_ to match Next.js client env convention.
   */
  clientPrefix: "NEXT_PUBLIC_",

  client: {
    NEXT_PUBLIC_FEATURE_PERSONA_ONBOARDING: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
    NEXT_PUBLIC_FEATURE_PERSONA_SWITCHER: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
    NEXT_PUBLIC_FEATURE_PERSONA_NAV_REORDER: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
    NEXT_PUBLIC_FEATURE_PERSONA_CONTEXT_HEADERS: z
      .enum(["true", "false"])
      .optional()
      .default("false"),
  },

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: process.env,

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
});