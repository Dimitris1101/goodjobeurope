import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const apiBase = process.env.API_URL; // π.χ. http://localhost:3001
  if (!apiBase) {
    return NextResponse.json(
      { error: 'Missing API_URL env' },
      { status: 500 },
    );
  }

  const r = await fetch(`${apiBase}/billing/confirm?session_id=${sessionId}`, {
    method: 'POST',
    headers: { 'x-internal': '1' },
    cache: 'no-store',
  });

  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
