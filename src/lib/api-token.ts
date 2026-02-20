"use server";

import { prisma } from "@/lib/prisma";
import crypto from "crypto";  // 👈 use crypto directly

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token + 'eips_prod_v1')
    .digest('hex')
}

export type ResolvedApiToken = {
  userId: string;
  userRole: string;
  apiTokenId: string;
  scopes: string[];
};

export class ApiTokenError extends Error {
  code: "INVALID_TOKEN" | "EXPIRED_TOKEN";
  constructor(code: "INVALID_TOKEN" | "EXPIRED_TOKEN") {
    super(code);
    this.code = code;
  }
}

export async function resolveApiToken(headers: Record<string, string>) {
  const apiTokenValue = headers["x-api-token"];
  if (!apiTokenValue) return null;

  const tokenHash = hashToken(apiTokenValue);  // ✅ sync, no await

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!token) throw new ApiTokenError("INVALID_TOKEN");

  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    throw new ApiTokenError("EXPIRED_TOKEN");
  }

  await prisma.apiToken.update({
    where: { id: token.id },
    data: { lastUsed: new Date() },
  });

  return {
    userId: token.user.id,
    userRole: token.user.role,
    apiTokenId: token.id,
    scopes: token.scopes ?? [],
  } satisfies ResolvedApiToken;
}