import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR } from './paths';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Photos are served back from /uploads/<file> by app/uploads/[file]/route.ts.
export const UPLOAD_URL_PREFIX = '/uploads/';
export const UPLOAD_FILENAME_PATTERN = /^[a-z0-9-]+\.(jpg|png|webp|gif)$/;

export const IMAGE_TYPES: Record<string, { ext: string; mime: string }> = {
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
};

// HEIC is deliberately not accepted: only Safari can display it. The browser
// re-encodes photos to JPEG before upload (lib/client-image.ts), and iOS hands
// web pages JPEG copies of camera photos anyway.
// Identify the image from its magic bytes rather than trusting the
// client-supplied filename or MIME type.
export function detectImageType(buf: Buffer): keyof typeof IMAGE_TYPES | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  return null;
}

export async function saveImageBuffer(buf: Buffer): Promise<string> {
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new Error(`Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  }
  const kind = detectImageType(buf);
  if (!kind) {
    throw new Error('File is not a supported image (JPEG, PNG, WebP or GIF)');
  }
  await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `wine-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${IMAGE_TYPES[kind].ext}`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buf);
  return `${UPLOAD_URL_PREFIX}${filename}`;
}

export async function saveDataUrlImage(dataUrl: string): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/[\w.+-]+;base64,/, '');
  return saveImageBuffer(Buffer.from(base64, 'base64'));
}

// Resolve an /uploads/ URL to its file on disk; null for anything else
// (external URLs, or names that don't match what saveImageBuffer produces).
export function uploadPathFromUrl(url: string): string | null {
  if (!url.startsWith(UPLOAD_URL_PREFIX)) return null;
  const filename = url.slice(UPLOAD_URL_PREFIX.length);
  if (!UPLOAD_FILENAME_PATTERN.test(filename)) return null;
  return path.join(UPLOADS_DIR, filename);
}

export async function deleteUploadedImage(url: string): Promise<void> {
  const file = uploadPathFromUrl(url);
  if (!file) return;
  try {
    await fs.promises.unlink(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Could not delete photo ${file}:`, err);
    }
  }
}
