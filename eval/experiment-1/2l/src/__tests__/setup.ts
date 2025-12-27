import { beforeEach } from 'vitest';
import db from '@/lib/db';

// Clean database before each test
export function cleanDatabase() {
  db.prepare('DELETE FROM bookmark_tags').run();
  db.prepare('DELETE FROM bookmarks').run();
  db.prepare('DELETE FROM tags').run();
}

// Helper to create test bookmark
export function createTestBookmark(data: {
  url?: string;
  title?: string;
  description?: string;
}) {
  const defaults = {
    url: `https://example-${Date.now()}.com`,
    title: 'Example Site',
    description: '',
  };
  const bookmark = { ...defaults, ...data };

  const result = db.prepare(`
    INSERT INTO bookmarks (url, title, description)
    VALUES (?, ?, ?)
  `).run(bookmark.url, bookmark.title, bookmark.description);

  return {
    id: Number(result.lastInsertRowid),
    ...bookmark,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Helper to create test tag
export function createTestTag(name: string) {
  const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
  return {
    id: Number(result.lastInsertRowid),
    name,
  };
}

// Helper to link bookmark to tag
export function linkBookmarkToTag(bookmarkId: number, tagId: number) {
  db.prepare(`
    INSERT INTO bookmark_tags (bookmark_id, tag_id)
    VALUES (?, ?)
  `).run(bookmarkId, tagId);
}

// Reset database before each test file
beforeEach(() => {
  cleanDatabase();
});
