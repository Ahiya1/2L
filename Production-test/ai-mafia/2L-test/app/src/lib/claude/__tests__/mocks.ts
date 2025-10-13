/**
 * Mock utilities for testing Claude API interactions
 */

import { vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

/**
 * Mock successful Claude API responses
 */
export function mockClaudeAPI(responses: string[]) {
  let callIndex = 0;

  const mockCreate = vi.fn().mockImplementation(() => {
    const response = responses[callIndex % responses.length];
    callIndex++;

    return Promise.resolve({
      content: [{ type: 'text', text: response }],
      usage: {
        input_tokens: 1000,
        output_tokens: 50,
        cache_read_input_tokens: 500,
        cache_creation_input_tokens: 0,
      },
    } as Anthropic.Message);
  });

  return mockCreate;
}

/**
 * Mock Claude API error
 */
export function mockClaudeError(error: Error & { status?: number }) {
  return vi.fn().mockRejectedValue(error);
}

/**
 * Mock Claude API with custom usage
 */
export function mockClaudeAPIWithUsage(
  text: string,
  usage: Anthropic.Messages.Usage
) {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text }],
    usage,
  } as Anthropic.Message);
}

/**
 * Create a mock Anthropic client
 */
export function createMockAnthropicClient(mockCreate: ReturnType<typeof vi.fn>) {
  return {
    messages: {
      create: mockCreate,
    },
  } as unknown as Anthropic;
}
