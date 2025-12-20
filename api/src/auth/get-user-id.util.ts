export function getUserId(user: any): number {
  const raw = user?.id ?? user?.sub ?? user?.userId;
  const id = Number(raw);
  if (!id || Number.isNaN(id)) {
    throw new Error('User id missing from JWT payload');
  }
  return id;
}