import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/chat/quran`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        limit: 3,
        threshold: 0.1,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Quran backend error body:', body);
      try {
        const parsed = JSON.parse(body);
        return NextResponse.json({ error: parsed.error || parsed.details || body }, { status: response.status });
      } catch (e) {
        return NextResponse.json({ error: `Backend chat failed: ${body}` }, { status: response.status });
      }
    }

    const body = await response.json();
    return NextResponse.json(body);
  } catch (error) {
    console.error('Error in Quran API:', error);
    return NextResponse.json({ error: 'Failed to proxy request to backend' }, { status: 500 });
  }
}
