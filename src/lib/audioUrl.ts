import { supabase } from '@/lib/supabase';
import type { Track } from '@/types';

const SIGNED_URL_EXPIRY = 3600;

export function getAudioCacheKey(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      const u = new URL(filePath);
      return u.pathname;
    } catch {
      return filePath;
    }
  }
  // For storage paths, construct the full object pathname
  return `/storage/v1/object/sign/vinyl-audio/${filePath}`;
}

export async function getAudioUrl(filePath: string): Promise<string> {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const { data, error } = await supabase.storage
    .from('vinyl-audio')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
}

export async function getTrackAudioUrl(track: Track): Promise<string> {
  return getAudioUrl(track.file_path);
}
