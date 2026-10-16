import fs from 'fs';
import { DATA_DIR } from './paths';

// All writes to the data volume go through this one queue so concurrent
// requests (e.g. both phones saving at once) can't interleave a
// read-modify-write and lose an update.
let writeQueue: Promise<unknown> = Promise.resolve();
export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Write to a temp file then rename, so a crash or full disk mid-write can
// never leave a truncated file behind.
export async function writeJsonAtomic(file: string, data: unknown, mode?: number) {
  ensureDataDir();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode });
  await fs.promises.rename(tmp, file);
}

// Missing file -> fallback. A file that exists but won't parse throws, so a
// damaged-but-recoverable file is never silently replaced by an empty one.
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  ensureDataDir();
  let raw: string;
  try {
    raw = await fs.promises.readFile(file, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
  return JSON.parse(raw) as T;
}
