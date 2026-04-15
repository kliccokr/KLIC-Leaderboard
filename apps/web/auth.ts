import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, users, accounts, sessions, verificationTokens } from "@klic/db";
import { eq } from "drizzle-orm";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(hasDatabase
    ? {
        adapter: DrizzleAdapter(db, {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        }),
      }
    : {}),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
              params: {
                hd: process.env.AUTH_GOOGLE_DOMAIN,
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl;
      const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/ko") ? "ko" : "ko";

      if (pathname.includes("/admin") && auth?.user?.role !== "admin") {
        return Response.redirect(new URL(`/${locale}/login`, request.url));
      }

      const isPublicPath = pathname.includes("/login") || pathname.includes("/api/auth") || pathname.startsWith("/cli/") || /\/(ko|en)\/(profile|team)\//.test(pathname) || /\.(svg|png|ico|jpg|jpeg|webp)$/i.test(pathname);
      if (!isPublicPath && !auth) {
        return Response.redirect(new URL(`/${locale}/login`, request.url));
      }

      return true;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const domain = process.env.AUTH_GOOGLE_DOMAIN;
        if (domain && !user.email?.endsWith(`@${domain}`)) {
          return false;
        }
        // Auto-sync orgUnit from Google Directory on login
        if (user.email && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          try {
            const { getDirectoryUsers } = await import("@/lib/google-directory");
            const dirUsers = await getDirectoryUsers();
            const dirUser = dirUsers.find((d) => d.email === user.email);
            if (dirUser) {
              await db
                .update(users)
                .set({ department: dirUser.department, team: dirUser.orgUnit })
                .where(eq(users.email, user.email!));
            }
          } catch (e) {
            console.error("[auth] Failed to sync orgUnit:", e);
          }
        }
      }
      if (account?.provider === "github" && user.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });
        if (existingUser && profile?.login) {
          await db
            .update(users)
            .set({ githubUsername: profile.login as string })
            .where(eq(users.id, existingUser.id));
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.level = dbUser.level;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/ko/login",
    error: "/ko/login",
  },
});
