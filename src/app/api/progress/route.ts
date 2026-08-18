import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

const PROGRESS_KEYS = [
  'aws-aif-c01-results',
  'aws-aif-c01-used-questions',
  'aws-aif-c01-wrong-answers',
  'aws-aif-c01-daily-stats',
  'aws-aif-c01-streak',
  'aws-aif-c01-bookmarks',
  'flashcard-known',
];

function getExpectedToken(): string | null {
  const user = process.env.APP_USERNAME;
  const pass = process.env.APP_PASSWORD;
  if (!user || !pass) return null;
  const raw = `${user}:${pass}:aif-c01-secret`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function isAuthenticated(): Promise<boolean> {
  const expectedToken = getExpectedToken();
  if (!expectedToken) return true;
  const cookieStore = await cookies();
  const session = cookieStore.get('aif-session');
  return session?.value === expectedToken;
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('progress')
    .select('key, data')
    .in('key', PROGRESS_KEYS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const progress: Record<string, unknown> = {};
  for (const row of data || []) {
    progress[row.key] = row.data;
  }

  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as Record<string, unknown>;

  const rows = Object.entries(body)
    .filter(([key]) => PROGRESS_KEYS.includes(key))
    .map(([key, data]) => ({
      key,
      data,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from('progress')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
