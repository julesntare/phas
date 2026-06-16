import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { signCitizenToken } from '@/lib/auth';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  exp: string;
  email_verified: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const idToken: string = body?.idToken ?? '';

  if (!idToken) {
    return NextResponse.json({ error: 'idToken required' }, { status: 400 });
  }

  // Verify the Google ID token via Google's tokeninfo endpoint.
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!infoRes.ok) {
    return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
  }

  const info: GoogleTokenInfo = await infoRes.json();

  // Token must not be expired and must be issued for our app.
  const validAudiences = [
    process.env.GOOGLE_CLIENT_ID,        // web
    process.env.GOOGLE_ANDROID_CLIENT_ID, // android (optional)
    process.env.GOOGLE_IOS_CLIENT_ID,     // ios (optional)
  ].filter(Boolean);

  if (validAudiences.length > 0 && !validAudiences.includes(info.aud)) {
    return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 });
  }

  if (info.email_verified !== 'true') {
    return NextResponse.json({ error: 'Email not verified' }, { status: 401 });
  }

  // Upsert citizen account.
  const [citizen] = await sql<{ id: string }[]>`
    INSERT INTO citizen_accounts (google_id, email, name, avatar_url)
    VALUES (
      ${info.sub},
      ${info.email},
      ${info.name ?? info.email},
      ${info.picture ?? null}
    )
    ON CONFLICT (google_id) DO UPDATE
      SET email      = EXCLUDED.email,
          name       = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url
    RETURNING id
  `;

  const token = await signCitizenToken({
    sub: citizen.id,
    type: 'citizen_google',
    email: info.email,
  });

  return NextResponse.json({
    token,
    user: {
      id: citizen.id,
      email: info.email,
      name: info.name ?? info.email,
      avatarUrl: info.picture ?? null,
      authType: 'google',
    },
  });
}
