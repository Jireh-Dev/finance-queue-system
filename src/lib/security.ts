import crypto from 'crypto';

/**
 * Generate a cryptographically secure pseudo-random token using Node's crypto.randomBytes
 * This produces 64 hex characters (256 bits of entropy) resistant to brute-force or guessing.
 */
export function generateCSPRNGToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a sensitive token using SHA-256 before persisting to database
 * This ensures that even if database records are exposed, tokens cannot be forged or used.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Validate token string format
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // Accept standard 64-char hex token or prefixed tokens
  const clean = token.trim();
  return /^[a-fA-F0-9]{64}$/.test(clean) || (clean.startsWith('UA-') && clean.length > 20);
}

/**
 * Generates a human-friendly queue display code based on the queue number
 * e.g., A-101, B-105
 */
export function formatQueueNumber(queueNumber: number | null | undefined): string {
  if (!queueNumber) return 'Pending Check-in';
  return `Q-${String(queueNumber).padStart(3, '0')}`;
}

