import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "../db";
import { verifyPassword } from "./password";
import { loginSchema } from "../validation/auth";

/**
 * Auth.js configuration with Credentials provider
 * Session strategy is "jwt" per ADR-013
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate credentials exist and have correct shape
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!user) {
          return null;
        }

        // Verify password with Argon2id
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // Return user object (without passwordHash)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.emailVerified =
          typeof token.emailVerified === "string"
            ? new Date(token.emailVerified)
            : (token.emailVerified ?? null);
      }
      return session;
    },
  },
  // Prevent logging sensitive info
  logger: {
    error: (error) => {
      // Log error code only, not full details
      console.error("[AUTH ERROR]", error.name);
    },
    warn: (code) => {
      console.warn("[AUTH WARN]", code);
    },
    debug: () => {
      // No debug logging in production
    },
  },
  trustHost: true,
});
