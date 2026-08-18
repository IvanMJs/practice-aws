import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'aif-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getCredentials() {
  const user = process.env.APP_USERNAME;
  const pass = process.env.APP_PASSWORD;
  return user && pass ? { user, pass } : null;
}

function generateToken(user: string, pass: string): string {
  const raw = `${user}:${pass}:aif-c01-secret`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: Request) {
  const creds = getCredentials();
  if (!creds) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const body = await request.json() as { username?: string; password?: string };

  if (body.username !== creds.user || body.password !== creds.pass) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  const token = generateToken(creds.user, creds.pass);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const creds = getCredentials();
  if (!creds) {
    return NextResponse.json({ authenticated: true, authDisabled: true });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const expectedToken = generateToken(creds.user, creds.pass);

  return NextResponse.json({
    authenticated: sessionCookie?.value === expectedToken,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
