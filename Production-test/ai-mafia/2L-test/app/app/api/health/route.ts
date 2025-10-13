import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db/client';

/**
 * Health check endpoint for Railway deployment monitoring.
 *
 * Checks:
 * - Database connectivity
 * - Anthropic API key presence
 *
 * Returns 200 if healthy, 500 if unhealthy.
 */
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Anthropic API key exists
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    // Check if API key is non-empty and valid format
    const apiKeyValid = hasApiKey &&
      process.env.ANTHROPIC_API_KEY!.startsWith('sk-ant-');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        apiKey: apiKeyValid ? 'configured' : (hasApiKey ? 'invalid' : 'missing'),
      },
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {
          database: 'disconnected',
          apiKey: process.env.ANTHROPIC_API_KEY ? 'present' : 'missing',
        },
      },
      { status: 500 }
    );
  }
}
