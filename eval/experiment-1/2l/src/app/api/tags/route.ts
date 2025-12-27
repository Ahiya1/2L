import db from '@/lib/db';
import { createTagSchema } from '@/lib/schema';
import type { TagRow } from '@/lib/types';

// GET /api/tags - List all tags with bookmark counts
export async function GET() {
  try {
    const rows = db.prepare(`
      SELECT t.id, t.name, COUNT(bt.bookmark_id) as count
      FROM tags t
      LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
      GROUP BY t.id
      ORDER BY t.name COLLATE NOCASE
    `).all() as TagRow[];

    return Response.json({ data: rows });
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return Response.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTagSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Check for duplicate (case-insensitive due to COLLATE NOCASE)
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) {
      return Response.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);

    return Response.json({
      data: {
        id: Number(result.lastInsertRowid),
        name,
        count: 0,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tags error:', error);
    return Response.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
