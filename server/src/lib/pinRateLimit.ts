// A 6-digit PIN has only a million combinations — far weaker than a password
// — so PIN login gets its own basic brute-force throttle, keyed by IP. This
// is in-memory only (resets on server restart, doesn't share state across
// multiple server instances), which is fine for this app's single-process
// deployment; swap for a shared store (e.g. Redis) if that ever changes.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptEntry>();

function currentEntry(key: string): AttemptEntry {
  const now = Date.now();
  const existing = attempts.get(key);
  if (existing && existing.resetAt > now) return existing;

  const fresh: AttemptEntry = { count: 0, resetAt: now + WINDOW_MS };
  attempts.set(key, fresh);
  return fresh;
}

export function isPinRateLimited(key: string): boolean {
  return currentEntry(key).count >= MAX_ATTEMPTS;
}

export function recordFailedPinAttempt(key: string): void {
  currentEntry(key).count += 1;
}

export function resetPinAttempts(key: string): void {
  attempts.delete(key);
}
