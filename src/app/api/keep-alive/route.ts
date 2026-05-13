import { NextResponse } from 'next/server';
import { supabase, isMockMode } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isMockMode) {
    return NextResponse.json(
      { ok: false, error: 'mock mode (NEXT_PUBLIC_SUPABASE_URL not set)' },
      { status: 503 },
    );
  }

  const { error } = await supabase
    .from('visits')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
