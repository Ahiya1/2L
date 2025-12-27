import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/bookmarks/route';
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/bookmarks/[id]/route';
import { cleanDatabase, createTestBookmark, createTestTag, linkBookmarkToTag } from '../setup';

// Mock fetch for title fetching
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('Bookmarks API', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('GET /api/bookmarks', () => {
    it('returns empty array when no bookmarks exist', async () => {
      const request = new Request('http://localhost/api/bookmarks');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual([]);
    });

    it('returns all bookmarks', async () => {
      createTestBookmark({ url: 'https://example1.com', title: 'Example 1' });
      createTestBookmark({ url: 'https://example2.com', title: 'Example 2' });

      const request = new Request('http://localhost/api/bookmarks');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(2);
    });

    it('filters bookmarks by search query', async () => {
      createTestBookmark({ url: 'https://google.com', title: 'Google' });
      createTestBookmark({ url: 'https://github.com', title: 'GitHub' });

      const request = new Request('http://localhost/api/bookmarks?search=google');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Google');
    });

    it('filters bookmarks by tag', async () => {
      const bookmark1 = createTestBookmark({ url: 'https://react.dev', title: 'React' });
      const bookmark2 = createTestBookmark({ url: 'https://vue.org', title: 'Vue' });
      const tag = createTestTag('frontend');

      linkBookmarkToTag(bookmark1.id, tag.id);

      const request = new Request('http://localhost/api/bookmarks?tag=frontend');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('React');
    });
  });

  describe('POST /api/bookmarks', () => {
    it('creates a bookmark with provided title', async () => {
      const request = new Request('http://localhost/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          title: 'Example Site',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data).toHaveProperty('id');
      expect(data.data.url).toBe('https://example.com');
      expect(data.data.title).toBe('Example Site');
    });

    it('creates a bookmark with tags', async () => {
      const request = new Request('http://localhost/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          title: 'Example',
          tags: ['tech', 'tutorial'],
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data.tags).toHaveLength(2);
      expect(data.data.tags.map((t: { name: string }) => t.name)).toContain('tech');
      expect(data.data.tags.map((t: { name: string }) => t.name)).toContain('tutorial');
    });

    it('rejects invalid URL', async () => {
      const request = new Request('http://localhost/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'not-a-valid-url',
          title: 'Test',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Invalid URL format');
    });

    it('rejects duplicate URL', async () => {
      createTestBookmark({ url: 'https://duplicate.com', title: 'First' });

      const request = new Request('http://localhost/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://duplicate.com',
          title: 'Second',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toContain('already exists');
    });
  });

  describe('GET /api/bookmarks/[id]', () => {
    it('returns a single bookmark', async () => {
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });

      const request = new Request(`http://localhost/api/bookmarks/${bookmark.id}`);
      const response = await GET_ONE(request, { params: Promise.resolve({ id: String(bookmark.id) }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(bookmark.id);
      expect(data.data.title).toBe('Test');
    });

    it('returns 404 for non-existent bookmark', async () => {
      const request = new Request('http://localhost/api/bookmarks/99999');
      const response = await GET_ONE(request, { params: Promise.resolve({ id: '99999' }) });

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid ID', async () => {
      const request = new Request('http://localhost/api/bookmarks/invalid');
      const response = await GET_ONE(request, { params: Promise.resolve({ id: 'invalid' }) });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/bookmarks/[id]', () => {
    it('updates bookmark title', async () => {
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Old Title' });

      const request = new Request(`http://localhost/api/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: String(bookmark.id) }) });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.title).toBe('New Title');
    });

    it('updates bookmark tags', async () => {
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });

      const request = new Request(`http://localhost/api/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: ['new-tag', 'another-tag'] }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: String(bookmark.id) }) });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.tags).toHaveLength(2);
    });

    it('returns 404 for non-existent bookmark', async () => {
      const request = new Request('http://localhost/api/bookmarks/99999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '99999' }) });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/bookmarks/[id]', () => {
    it('deletes a bookmark', async () => {
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });

      const request = new Request(`http://localhost/api/bookmarks/${bookmark.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: String(bookmark.id) }) });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent bookmark', async () => {
      const request = new Request('http://localhost/api/bookmarks/99999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '99999' }) });
      expect(response.status).toBe(404);
    });
  });
});
