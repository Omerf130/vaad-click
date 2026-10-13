export const LOGIN_RATE_LIMIT = {
  points: 8,
  durationSeconds: 15 * 60,
  blockDurationSeconds: 15 * 60,
} as const;

export const REGISTER_RATE_LIMIT = {
  points: 5,
  durationSeconds: 60 * 60,
  blockDurationSeconds: 60 * 60,
} as const;

export function loginRateLimitKey(ip: string, email: string): string {
  return `login:${ip}:${email}`;
}

export function registerRateLimitKey(ip: string): string {
  return `register:${ip}`;
}
