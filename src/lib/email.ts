import nodemailer from "nodemailer";
import { env } from "@/env";

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.EMAIL_FROM,
    pass: env.EMAIL_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for plain text fallback
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}
