import { NextResponse } from 'next/server'

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_FAILED', message, 401)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429)
  }
}

export function errorResponse(error: unknown): NextResponse {
  // Known AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        }
      },
      { status: error.statusCode }
    )
  }

  // Unexpected error
  console.error('Unexpected error:', error)
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    },
    { status: 500 }
  )
}
