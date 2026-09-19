import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { AuthType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.googleId = user.googleId ?? undefined;
      session.user.displayName = user.displayName ?? user.name ?? null;
      return session;
    },
  },
  events: {
    async linkAccount({ user, account }) {
      if (account.provider !== "google" || !user.id) {
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          authType: AuthType.GOOGLE,
          googleId: account.providerAccountId,
          displayName: user.name ?? user.displayName ?? null,
        },
      });
    },
  },
});
