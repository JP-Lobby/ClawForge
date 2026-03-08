import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import type { RouteContext, Note } from '../types.js';
import { openTasksDb, DEFAULT_DB_PATH } from '../../tasks/store.js';

function rowToNote(row: Record<string, unknown>): Note {
  return {
    id: row['id'] as string,
    content: row['content'] as string,
    pinned: Boolean(row['pinned']),
    createdAt: row['created_at'] as number,
    updatedAt: row['updated_at'] as number,
  };
}

export function createNotesRouter(ctx: RouteContext): Router {
  const router = Router();
  const dbPath = ctx.config.tasks?.dbPath ?? DEFAULT_DB_PATH;
  const db = openTasksDb(dbPath);

  // GET /api/notes — list all notes (pinned first, then newest)
  router.get('/', (_req, res) => {
    const rows = db.prepare(
      'SELECT * FROM notes ORDER BY pinned DESC, created_at DESC'
    ).all() as Record<string, unknown>[];
    res.json({ notes: rows.map(rowToNote) });
  });

  // POST /api/notes — create note
  router.post('/', (req, res) => {
    const { content, pinned = false } = req.body as { content?: string; pinned?: boolean };
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'content is required' }); return;
    }
    const id = randomUUID();
    const now = Date.now();
    db.prepare(
      'INSERT INTO notes (id, content, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, content, pinned ? 1 : 0, now, now);
    const note = rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>);
    ctx.broadcast('note:created', { note });
    res.status(201).json({ note });
  });

  // PATCH /api/notes/:id — update note
  router.patch('/:id', (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) { res.status(404).json({ error: 'Note not found' }); return; }

    const { content, pinned } = req.body as { content?: string; pinned?: boolean };
    const now = Date.now();
    const fields: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (content !== undefined) { fields.unshift('content = ?'); values.unshift(content); }
    if (pinned !== undefined) { fields.unshift('pinned = ?'); values.unshift(pinned ? 1 : 0); }

    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
    const note = rowToNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Record<string, unknown>);
    ctx.broadcast('note:updated', { note });
    res.json({ note });
  });

  // DELETE /api/notes/:id — delete note
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) { res.status(404).json({ error: 'Note not found' }); return; }
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    ctx.broadcast('note:deleted', { id });
    res.status(204).send();
  });

  return router;
}
