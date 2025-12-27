import db from '@/lib/db';
import { createBookmarkSchema } from '@/lib/schema';
import type { BookmarkRow, Bookmark, Tag } from '@/lib/types';

// Fetch page title from URL
async function fetchPageTitle(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BookmarkManager/1.0' },
    });

    clearTimeout(timeout);

    const html = await response.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : new URL(url).hostname;
  } catch {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}

// Transform database row to Bookmark object
function rowToBookmark(row: BookmarkRow): Bookmark {
  const tags: Tag[] = row.tag_names
    ? row.tag_names.split(',').map((name, index) => ({ id: index, name: name.trim() }))
    : [];

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags,
  };
}

// GET /api/bookmarks - List all bookmarks with optional search and tag filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    let query = `
      SELECT b.id, b.url, b.title, b.description, b.created_at, b.updated_at,
             GROUP_CONCAT(t.name) as tag_names
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
    `;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push(`(b.title LIKE ? OR b.url LIKE ? OR b.description LIKE ?)`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (tag) {
      // Subquery to filter bookmarks that have the specified tag
      conditions.push(`b.id IN (
        SELECT bt2.bookmark_id FROM bookmark_tags bt2
        JOIN tags t2 ON bt2.tag_id = t2.id
        WHERE t2.name = ?
      )`);
      params.push(tag);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY b.id ORDER BY b.created_at DESC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as BookmarkRow[];
    const bookmarks = rows.map(rowToBookmark);

    return Response.json({ data: bookmarks });
  } catch (error) {
    console.error('GET /api/bookmarks error:', error);
    return Response.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

// POST /api/bookmarks - Create a new bookmark
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createBookmarkSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { url, title: providedTitle, description, tags } = parsed.data;

    // Check for duplicate URL
    const existing = db.prepare('SELECT id FROM bookmarks WHERE url = ?').get(url);
    if (existing) {
      return Response.json(
        { error: 'A bookmark with this URL already exists' },
        { status: 409 }
      );
    }

    // Auto-fetch title if not provided
    const title = providedTitle || await fetchPageTitle(url);

    // Insert bookmark and tags in a transaction
    const insertBookmarkWithTags = db.transaction((
      bookmarkUrl: string,
      bookmarkTitle: string,
      bookmarkDescription: string,
      tagNames: string[]
    ) => {
      // Insert bookmark
      const result = db.prepare(`
        INSERT INTO bookmarks (url, title, description)
        VALUES (?, ?, ?)
      `).run(bookmarkUrl, bookmarkTitle, bookmarkDescription);

      const bookmarkId = result.lastInsertRowid;

      // Insert tags and link
      for (const tagName of tagNames) {
        // Get or create tag
        let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number } | undefined;

        if (!tag) {
          const tagResult = db.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
          tag = { id: Number(tagResult.lastInsertRowid) };
        }

        // Link bookmark to tag
        db.prepare(`
          INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
          VALUES (?, ?)
        `).run(bookmarkId, tag.id);
      }

      return bookmarkId;
    });

    const bookmarkId = insertBookmarkWithTags(url, title, description || '', tags || []);

    // Fetch the created bookmark with tags
    const row = db.prepare(`
      SELECT b.id, b.url, b.title, b.description, b.created_at, b.updated_at,
             GROUP_CONCAT(t.name) as tag_names
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(bookmarkId) as BookmarkRow;

    return Response.json({ data: rowToBookmark(row) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/bookmarks error:', error);
    return Response.json({ error: 'Failed to create bookmark' }, { status: 500 });
  }
}
