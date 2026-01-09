import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
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