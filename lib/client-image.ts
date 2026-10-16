// Browser-only helpers for preparing bottle photos before upload.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Phone photos are 3-8 MB and often HEIC. Re-encode to a JPEG no larger than
// MAX_EDGE on the long side: small enough to store and load quickly, readable
// by every browser, and still sharp enough for Gemini to read the label.
// createImageBitmap applies the EXIF orientation, so portrait shots stay upright.
export async function prepareBottlePhoto(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ratio = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo'))), 'image/jpeg', JPEG_QUALITY)
    );
    return { blob, dataUrl: await blobToDataUrl(blob) };
  } finally {
    bitmap.close();
  }
}
