import db from '@/lib/db';
import { updateTagSchema } from '@/lib/schema';

// GET /api/tags/[id] - Get a single tag
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const row = db.prepare(`
      SELECT t.id, t.name, COUNT(bt.bookmark_id) as count
      FROM tags t
      LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(id) as { id: number; name: string; count: number } | undefined;

    if (!row) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    return Response.json({ data: row });
  } catch (error) {
    console.error('GET /api/tags/[id] error:', error);
    return Response.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}

// PUT /api/tags/[id] - Rename a tag
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    // Check if tag exists
    const existing = db.prepare('SELECT id, name FROM tags WHERE id = ?').get(id) as { id: number; name: string } | undefined;
    if (!existing) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTagSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Check for duplicate name (case-insensitive, excluding current tag)
    const duplicate = db.prepare('SELECT id FROM tags WHERE name = ? AND id != ?').get(name, id);
    if (duplicate) {
      return Response.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, id);

    // Fetch updated tag with count
    const row = db.prepare(`
      SELECT t.id, t.name, COUNT(bt.bookmark_id) as count
      FROM tags t
      LEFT JOIN bookmark_tags bt ON t.id = bt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `).get(id) as { id: number; name: string; count: number };

    return Response.json({ data: row });
  } catch (error) {
    console.error('PUT /api/tags/[id] error:', error);
    return Response.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - Delete a tag
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    if (result.changes === 0) {
      return Response.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Note: bookmark_tags entries are automatically deleted due to CASCADE

    return Response.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('DELETE /api/tags/[id] error:', error);
    return Response.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
