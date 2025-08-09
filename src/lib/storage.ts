import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  try {
    // Capacitor v5+ exposes isNativePlatform
    // Fallback to checking platform if needed
    // @ts-ignore - optional chaining for environments without Capacitor
    return typeof Capacitor?.isNativePlatform === 'function'
      ? // @ts-ignore
        Capacitor.isNativePlatform()
      : false;
  } catch {
    return false;
  }
}

export function parseStorageUrl(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(fileUrl);
    // Example path: /storage/v1/object/public/medical-documents/userid/file.pdf
    const parts = url.pathname.split('/').filter(Boolean);
    const objectIdx = parts.findIndex((p) => p === 'object');
    if (objectIdx >= 0 && parts.length > objectIdx + 2) {
      // parts[objectIdx + 1] is visibility (public|authenticated)
      const bucket = parts[objectIdx + 2];
      const path = parts.slice(objectIdx + 3).join('/');
      return { bucket, path };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSignedUrl(params: {
  bucket?: string;
  path?: string;
  fileUrl?: string;
  expiresIn?: number; // seconds
}): Promise<{ url: string; bucket: string; path: string } | null> {
  const { bucket, path, fileUrl, expiresIn = 600 } = params;
  let b = bucket;
  let p = path;

  if (!b || !p) {
    if (!fileUrl) return null;
    const parsed = parseStorageUrl(fileUrl);
    if (!parsed) return null;
    b = parsed.bucket;
    p = parsed.path;
  }

  const { data, error } = await supabase.storage.from(b!).createSignedUrl(p!, expiresIn);
  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL', error);
    return null;
  }

  return { url: data.signedUrl, bucket: b!, path: p! };
}

export async function downloadAsBlob(params: {
  bucket?: string;
  path?: string;
  fileUrl?: string;
}): Promise<Blob | null> {
  let { bucket, path, fileUrl } = params;

  if ((!bucket || !path) && fileUrl) {
    const parsed = parseStorageUrl(fileUrl);
    if (parsed) {
      bucket = parsed.bucket;
      path = parsed.path;
    }
  }

  if (!bucket || !path) return null;

  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) {
    console.error('Download failed', error);
    return null;
  }
  return data;
}
