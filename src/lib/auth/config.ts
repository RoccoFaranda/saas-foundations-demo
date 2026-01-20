import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "../db";

/**
 * Auth.js configuration with Credentials provider and Prisma adapter
 * Session strategy is "database" per ADR-013
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
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
      async authorize(_credentials) {
        void _credentials;
        // Authorization logic will be implemented in auth pages task
        // This is a placeholder that returns null (no auth yet)
        // The actual implementation will:
        // 1. Validate credentials exist
        // 2. Find user by email
        // 3. Verify password with Argon2id
        // 4. Return user object or null
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      // Add user ID and verification status to session
      if (session.user) {
        session.user.id = user.id;
        session.user.emailVerified = user.emailVerified ?? null;
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
