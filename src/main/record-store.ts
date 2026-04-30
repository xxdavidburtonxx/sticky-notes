import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type Record = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  bounds?: { x: number; y: number; width: number; height: number };
};

const STORE_DIR = (): string => path.join(app.getPath('userData'), 'records');

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORE_DIR(), { recursive: true });
}

function recordPath(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('invalid record id');
  return path.join(STORE_DIR(), `${id}.json`);
}

export async function listAllRecordIds(): Promise<string[]> {
  await ensureDir();
  const entries = await fs.readdir(STORE_DIR());
  return entries
    .filter((n) => n.endsWith('.json'))
    .map((n) => n.slice(0, -5))
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
}

export async function readRecord(id: string): Promise<Record | null> {
  try {
    const text = await fs.readFile(recordPath(id), 'utf8');
    const raw = JSON.parse(text) as Partial<Record> & { id: string };
    // Backfill defaults for older records that pre-date the title field.
    return {
      id: raw.id,
      title: raw.title ?? '',
      body: raw.body ?? '',
      createdAt: raw.createdAt ?? Date.now(),
      updatedAt: raw.updatedAt ?? Date.now(),
      bounds: raw.bounds,
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function writeRecordFile(record: Record): Promise<void> {
  await ensureDir();
  const p = recordPath(record.id);
  const tmp = `${p}.tmp.${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(record, null, 2), 'utf8');
  await fs.rename(tmp, p);
}

export async function createRecord(): Promise<string> {
  const id = randomUUID();
  const now = Date.now();
  await writeRecordFile({ id, title: '', body: '', createdAt: now, updatedAt: now });
  return id;
}

export async function updateRecord(
  id: string,
  partial: { title?: string; body?: string },
): Promise<void> {
  const existing = await readRecord(id);
  const now = Date.now();
  await writeRecordFile({
    id,
    title: partial.title ?? existing?.title ?? '',
    body: partial.body ?? existing?.body ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    bounds: existing?.bounds,
  });
}

export async function updateRecordBounds(
  id: string,
  bounds: { x: number; y: number; width: number; height: number },
): Promise<void> {
  const existing = await readRecord(id);
  if (!existing) return;
  // Window-position changes don't bump updatedAt — that field tracks content edits.
  await writeRecordFile({ ...existing, bounds });
}

export async function deleteRecord(id: string): Promise<void> {
  try {
    await fs.unlink(recordPath(id));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
