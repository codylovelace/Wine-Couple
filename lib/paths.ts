import path from 'path';

// In Docker these point at the mounted volumes (see docker-compose.yml).
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_DIR, 'uploads');
