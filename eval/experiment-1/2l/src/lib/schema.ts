import { z } from 'zod';

export const createBookmarkSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().default(''),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
});

export const updateBookmarkSchema = z.object({
  url: z.string().url('Invalid URL format').optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
});

export const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name too long'),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
