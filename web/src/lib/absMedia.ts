export function absMedia(pathOrUrl?: string | null) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  const clean = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${clean}`;
}
