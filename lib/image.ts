import 'server-only';
import sharp from 'sharp';

// §2 attachments: "Resize to max 1600px on upload — phone photos are 4MB+
// and staff may be on mobile data." .rotate() with no args reads the EXIF
// orientation tag and bakes it in, then strips it — otherwise a portrait
// phone photo can render sideways once the tag is dropped downstream.
export async function resizeForUpload(input: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { buffer, contentType: 'image/jpeg' };
}
