// app/api/health/route.ts

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    message: 'Hello World',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}