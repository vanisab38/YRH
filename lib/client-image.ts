// §3.4: "Resize in the browser before upload... phone photos run 4-8MB,
// Vercel caps serverless request bodies around 4.5MB." lib/image.ts already
// resizes server-side via sharp, but that runs *after* the original bytes
// have already reached the server — on Vercel, a large-enough original can
// blow the request body limit before the server ever gets to resize it.
// This shrinks the file client-side first, so what actually gets sent is
// already small (~100-400KB) — the server-side resize stays as a backstop
// for anything this can't run for (unsupported browser, non-image file).
//
// createImageBitmap's imageOrientation:'from-image' bakes in the EXIF
// rotation tag while decoding, so the canvas is already right-side-up —
// canvas export never carries EXIF forward, so there's nothing left to
// lose. Without this option, a portrait phone photo renders sideways once
// downstream code drops the orientation tag (the exact bug §3.4 calls out).
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    // Resize is a nicety, not a requirement — the server-side resize in
    // lib/image.ts still runs on whatever reaches it.
    return file;
  }
}
