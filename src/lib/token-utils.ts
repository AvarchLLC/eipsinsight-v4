import crypto from 'crypto'

const TOKEN_PREFIX = 'eips_'
const TOKEN_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a secure API token
 * Format: eips_[32 random characters]
 */
export function generateToken(): string {
  let token = TOKEN_PREFIX
  const randomBytes = crypto.randomBytes(24)
  
  for (let i = 0; i < 24; i++) {
    token += TOKEN_CHARSET[randomBytes[i] % TOKEN_CHARSET.length]
  }
  
  return token
}

/**
 * Hash a token for storage in database
 * Using SHA-256 with a salt for security
 */
export function hashToken(token: string, salt?: string): string {
  const tokenSalt = salt || 'eips_prod_v1'
  return crypto
    .createHash('sha256')
    .update(token + tokenSalt)
    .digest('hex')
}

/**
 * Verify a token against its hash
 */
export function verifyToken(token: string, hash: string, salt?: string): boolean {
  return hashToken(token, salt) === hash
}

/**
 * Mask a token for display (show only last 8 chars)
 */
export function maskToken(token: string): string {
  if (token.length <= 8) return '••••••••'
  return '••••••••' + token.slice(-8)
}

/**
 * Get token prefix for UI display
 */
export function getTokenPrefix(): string {
  return TOKEN_PREFIX
}

/**
 * Calculate token age in a human-readable format
 */
export function getTokenAge(createdAt: Date): string {
  const now = new Date()
  const diff = now.getTime() - createdAt.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

/**
 * Calculate time until expiration
 */
export function getTimeUntilExpiration(expiresAt: Date | null): string | null {
  if (!expiresAt) return null
  
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `Expires in ${days}d`
  if (hours > 0) return `Expires in ${hours}h`
  if (minutes > 0) return `Expires in ${minutes}m`
  return `Expires in ${seconds}s`
}
