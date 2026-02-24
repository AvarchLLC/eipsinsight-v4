import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { env } from "@/env";
import { prismaAuth } from "@/lib/prisma-auth";
import { sendEmail } from "@/lib/email";
// The published @better-auth/core package may not expose the `SocialProviders`
// type at its top-level exports across versions. Define a narrow local type
// that matches the fields we use (github & google) and allow other providers.
type SocialProviders = {
  github?: { clientId: string; clientSecret: string; enabled?: boolean };
  google?: {
    clientId: string;
    clientSecret: string;
    accessType?: "offline" | "online";
    prompt?: "select_account consent" | "select_account" | "consent" | "login" | "none";
    enabled?: boolean;
  };
  [key: string]: unknown;
};

const githubClientId = env.GITHUB_CLIENT_ID.trim();
const githubClientSecret = env.GITHUB_CLIENT_SECRET.trim();
const googleClientId = env.GOOGLE_CLIENT_ID.trim();
const googleClientSecret = env.GOOGLE_CLIENT_SECRET.trim();

const socialProviders: SocialProviders = {
  ...(githubClientId && githubClientSecret
    ? {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        },
      }
    : {}),
  ...(googleClientId && googleClientSecret
      ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          accessType: "offline" as const,
          prompt: "select_account consent" as const,
        },
      }
    : {}),
};

export const auth = betterAuth({
  database: prismaAdapter(prismaAuth, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  logger: {
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
  },
  socialProviders,
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        let subject = "";
        let html = "";

        if (type === "sign-in") {
          subject = "Sign in to EIPsInsight";
          html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22d3ee;">Sign in to EIPsInsight</h2>
              <p>Your one-time password is:</p>
              <h1 style="background: linear-gradient(to right, #10b981, #22d3ee, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 48px; letter-spacing: 8px;">${otp}</h1>
              <p>This code will expire in 5 minutes.</p>
              <p style="color: #888; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `;
        } else if (type === "email-verification") {
          subject = "Verify your email - EIPsInsight";
          html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22d3ee;">Verify your email</h2>
              <p>Thank you for signing up! Your verification code is:</p>
              <h1 style="background: linear-gradient(to right, #10b981, #22d3ee, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 48px; letter-spacing: 8px;">${otp}</h1>
              <p>This code will expire in 5 minutes.</p>
            </div>
          `;
        } else {
          subject = "Reset your password - EIPsInsight";
          html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22d3ee;">Reset your password</h2>
              <p>You requested to reset your password. Your verification code is:</p>
              <h1 style="background: linear-gradient(to right, #10b981, #22d3ee, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 48px; letter-spacing: 8px;">${otp}</h1>
              <p>This code will expire in 5 minutes.</p>
              <p style="color: #888; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `;
        }

        await sendEmail({
          to: email,
          subject,
          html,
        });
      },
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
    }),
  ],
});
