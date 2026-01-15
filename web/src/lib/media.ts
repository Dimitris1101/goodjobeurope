export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_API_URL ??
  '';

export function mediaUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

export function normalizeCvUrl(raw: string): string {
  if (!raw) return '';
  if (raw.includes('/media/cv/')) return raw;
  if (raw.includes('/uploads/cv/')) {
    return `/media/cv/${raw.split('/').pop()}`;
  }
  return raw;
}

export function normalizeReferenceUrl(raw: string): string {
  if (!raw) return '';
  if (raw.includes('/media/reference/')) return raw;
  if (raw.includes('/uploads/reference-letters/')) {
    return `/media/reference/${raw.split('/').pop()}`;
  }
  return raw;
}
