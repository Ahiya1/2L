/**
 * Rate Limiting Utilities
 *
 * DEPENDENCY: This file should be created by Builder-1
 *
 * This is a placeholder to enable Builder-3 development.
 * Builder-1 will replace this with the actual implementation.
 */

import { RateLimiterMemory } from 'rate-limiter-flexible'

// Admin login: 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60, // 15 minutes in seconds
})

// Project password: 10 attempts per hour per project
export const passwordRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 60, // 1 hour in seconds
})

// API endpoints: 100 requests per minute per IP
export const apiRateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60, // 1 minute
})

export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    await limiter.consume(key)
    return { allowed: true }
  } catch (error) {
    console.error('Rate limit consumption error:', error)
    return {
      allowed: false,
      message: 'Too many requests. Please try again later.'
    }
  }
}
