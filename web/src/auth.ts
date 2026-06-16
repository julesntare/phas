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

    async jwt({ token, account }) {
      if (account?.provider === 'google') {
        const [citizen] = await sql<{ id: string }[]>`
          SELECT id FROM citizen_accounts WHERE google_id = ${token.sub!}
        `;
        if (citizen) token.citizenId = citizen.id;
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
