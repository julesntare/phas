import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import sql from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        await sql`
          INSERT INTO citizen_accounts (google_id, email, name, avatar_url)
          VALUES (
            ${account.providerAccountId},
            ${user.email},
            ${user.name ?? user.email},
            ${user.image ?? null}
          )
          ON CONFLICT (google_id) DO UPDATE
            SET email      = EXCLUDED.email,
                name       = EXCLUDED.name,
                avatar_url = EXCLUDED.avatar_url
        `;
      }
      return true;
    },

    async jwt({ token }) {
      // Run on every token check so sessions created before migration 011
      // automatically get citizenId on the next request.
      if (!token.citizenId && token.sub) {
        try {
          const [citizen] = await sql<{ id: string }[]>`
            INSERT INTO citizen_accounts (google_id, email, name, avatar_url)
            VALUES (
              ${token.sub},
              ${token.email ?? ''},
              ${token.name ?? token.email ?? ''},
              ${(token as Record<string, unknown>).picture as string ?? null}
            )
            ON CONFLICT (google_id) DO UPDATE
              SET email      = EXCLUDED.email,
                  name       = EXCLUDED.name,
                  avatar_url = EXCLUDED.avatar_url
            RETURNING id
          `;
          if (citizen) token.citizenId = citizen.id;
        } catch {
          // citizen_accounts table not yet migrated — leave citizenId unset
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.citizenId) {
        session.user.id = token.citizenId as string;
      }
      return session;
    },
  },
});
