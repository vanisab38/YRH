import 'server-only';
import { createClient } from '@supabase/supabase-js';

// §7 default stack: "Supabase also gives auth, file storage and row-level
// security in the free tier." §2 attachments: "Supabase Storage or S3."
// Bucket is PRIVATE — these are photos of guest rooms, not public assets —
// so display always goes through a short-lived signed URL, never a public one.
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'attachments';

// §3.5: "if storage isn't configured, hide the photo section entirely
// rather than showing a broken one" — a cheap boolean check, so pages can
// decide up front rather than discovering it by catching an exception
// (which only happens to work when there's already at least one photo to
// fetch a signed URL for — an empty gallery on an unconfigured bucket
// wouldn't hit that path at all).
export function isPhotoStorageConfigured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — see README "Photos" section for setup.'
    );
  }
  // Service role key, used server-side only (Server Actions / Route
  // Handlers) — never expose this to the browser.
  return createClient(url, serviceRoleKey);
}

export async function uploadAttachmentFile(path: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
}

export async function getSignedAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const client = getClient();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAttachmentFile(path: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
