// C:\job-matching\web\src\app\api\billing\checkout\route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId, planCode, priceId } = await req.json();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const res = await fetch(`${apiBase}/billing/checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      planCode, 
      priceId,  // (προαιρετικά αν ποτέ θες custom)
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return new NextResponse(
      text || 'Failed to create checkout session',
      { status: 500 },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
