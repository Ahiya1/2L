import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tags/route';
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/tags/[id]/route';
import { cleanDatabase, createTestBookmark, createTestTag, linkBookmarkToTag } from '../setup';

describe('Tags API', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('GET /api/tags', () => {
    it('returns empty array when no tags exist', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toEqual([]);
    });

    it('returns all tags with counts', async () => {
      const tag1 = createTestTag('javascript');
      const tag2 = createTestTag('typescript');

      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });
      linkBookmarkToTag(bookmark.id, tag1.id);
      linkBookmarkToTag(bookmark.id, tag2.id);

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toHaveLength(2);

      const jsTag = data.data.find((t: { name: string }) => t.name === 'javascript');
      expect(jsTag.count).toBe(1);
    });

    it('returns tags sorted alphabetically', async () => {
      createTestTag('zebra');
      createTestTag('apple');
      createTestTag('mango');

      const response = await GET();
      const data = await response.json();

      expect(data.data[0].name).toBe('apple');
      expect(data.data[1].name).toBe('mango');
      expect(data.data[2].name).toBe('zebra');
    });
  });

  describe('POST /api/tags', () => {
    it('creates a new tag', async () => {
      const request = new Request('http://localhost/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-tag' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data.name).toBe('new-tag');
      expect(data.data.count).toBe(0);
    });

    it('rejects duplicate tag name', async () => {
      createTestTag('existing');

      const request = new Request('http://localhost/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'existing' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);
    });

    it('rejects empty tag name', async () => {
      const request = new Request('http://localhost/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tags/[id]', () => {
    it('returns a single tag with count', async () => {
      const tag = createTestTag('test-tag');
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });
      linkBookmarkToTag(bookmark.id, tag.id);

      const request = new Request(`http://localhost/api/tags/${tag.id}`);
      const response = await GET_ONE(request, { params: Promise.resolve({ id: String(tag.id) }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.name).toBe('test-tag');
      expect(data.data.count).toBe(1);
    });

    it('returns 404 for non-existent tag', async () => {
      const request = new Request('http://localhost/api/tags/99999');
      const response = await GET_ONE(request, { params: Promise.resolve({ id: '99999' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tags/[id]', () => {
    it('renames a tag', async () => {
      const tag = createTestTag('old-name');

      const request = new Request(`http://localhost/api/tags/${tag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-name' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: String(tag.id) }) });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.name).toBe('new-name');
    });

    it('rejects duplicate name on rename', async () => {
      const tag1 = createTestTag('first');
      createTestTag('second');

      const request = new Request(`http://localhost/api/tags/${tag1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'second' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: String(tag1.id) }) });
      expect(response.status).toBe(409);
    });

    it('returns 404 for non-existent tag', async () => {
      const request = new Request('http://localhost/api/tags/99999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-name' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '99999' }) });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tags/[id]', () => {
    it('deletes a tag', async () => {
      const tag = createTestTag('to-delete');

      const request = new Request(`http://localhost/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: String(tag.id) }) });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent tag', async () => {
      const request = new Request('http://localhost/api/tags/99999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '99999' }) });
      expect(response.status).toBe(404);
    });

    it('removes tag associations when deleted', async () => {
      const tag = createTestTag('linked-tag');
      const bookmark = createTestBookmark({ url: 'https://test.com', title: 'Test' });
      linkBookmarkToTag(bookmark.id, tag.id);

      const request = new Request(`http://localhost/api/tags/${tag.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: String(tag.id) }) });
      expect(response.status).toBe(200);

      // Verify bookmark still exists but without the tag
      const bookmarkRequest = new Request(`http://localhost/api/bookmarks/${bookmark.id}`);
      const { GET: GET_BOOKMARK } = await import('@/app/api/bookmarks/[id]/route');
      const bookmarkResponse = await GET_BOOKMARK(bookmarkRequest, {
        params: Promise.resolve({ id: String(bookmark.id) }),
      });

      const bookmarkData = await bookmarkResponse.json();
      expect(bookmarkData.data.tags).toHaveLength(0);
    });
  });
});
