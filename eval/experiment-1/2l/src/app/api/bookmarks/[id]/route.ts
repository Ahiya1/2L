import db from '@/lib/db';
import { updateBookmarkSchema } from '@/lib/schema';
import type { BookmarkRow, Bookmark, Tag } from '@/lib/types';

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

// GET /api/bookmarks/[id] - Get a single bookmark
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid bookmark ID' }, { status: 400 });
    }

    const row = db.prepare(`
      SELECT b.id, b.url, b.title, b.description, b.created_at, b.updated_at,
             GROUP_CONCAT(t.name) as tag_names
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(id) as BookmarkRow | undefined;

    if (!row) {
      return Response.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return Response.json({ data: rowToBookmark(row) });
  } catch (error) {
    console.error('GET /api/bookmarks/[id] error:', error);
    return Response.json({ error: 'Failed to fetch bookmark' }, { status: 500 });
  }
}

// PUT /api/bookmarks/[id] - Update a bookmark
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid bookmark ID' }, { status: 400 });
    }

    // Check if bookmark exists
    const existing = db.prepare('SELECT id FROM bookmarks WHERE id = ?').get(id);
    if (!existing) {
      return Response.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBookmarkSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { url, title, description, tags } = parsed.data;

    // Check for duplicate URL if URL is being updated
    if (url) {
      const duplicate = db.prepare('SELECT id FROM bookmarks WHERE url = ? AND id != ?').get(url, id);
      if (duplicate) {
        return Response.json(
          { error: 'A bookmark with this URL already exists' },
          { status: 409 }
        );
      }
    }

    // Update bookmark and tags in a transaction
    const updateBookmarkWithTags = db.transaction((
      bookmarkId: number,
      bookmarkUrl: string | undefined,
      bookmarkTitle: string | undefined,
      bookmarkDescription: string | undefined,
      tagNames: string[] | undefined
    ) => {
      // Build update query dynamically
      const updates: string[] = [];
      const updateParams: (string | number)[] = [];

      if (bookmarkUrl !== undefined) {
        updates.push('url = ?');
        updateParams.push(bookmarkUrl);
      }
      if (bookmarkTitle !== undefined) {
        updates.push('title = ?');
        updateParams.push(bookmarkTitle);
      }
      if (bookmarkDescription !== undefined) {
        updates.push('description = ?');
        updateParams.push(bookmarkDescription);
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        updateParams.push(bookmarkId);

        db.prepare(`
          UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?
        `).run(...updateParams);
      }

      // Update tags if provided
      if (tagNames !== undefined) {
        // Remove existing tag links
        db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').run(bookmarkId);

        // Add new tag links
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
      }
    });

    updateBookmarkWithTags(id, url, title, description, tags);

    // Fetch the updated bookmark
    const row = db.prepare(`
      SELECT b.id, b.url, b.title, b.description, b.created_at, b.updated_at,
             GROUP_CONCAT(t.name) as tag_names
      FROM bookmarks b
      LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
      LEFT JOIN tags t ON bt.tag_id = t.id
      WHERE b.id = ?
      GROUP BY b.id
    `).get(id) as BookmarkRow;

    return Response.json({ data: rowToBookmark(row) });
  } catch (error) {
    console.error('PUT /api/bookmarks/[id] error:', error);
    return Response.json({ error: 'Failed to update bookmark' }, { status: 500 });
  }
}

// DELETE /api/bookmarks/[id] - Delete a bookmark
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid bookmark ID' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('DELETE /api/bookmarks/[id] error:', error);
    return Response.json({ error: 'Failed to delete bookmark' }, { status: 500 });
  }
}
