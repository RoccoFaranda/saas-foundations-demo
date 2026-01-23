import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      emailVerified?: Date | null;
      sessionVersion?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: Date | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    emailVerified?: Date | string | null;
    sessionVersion?: number;
  }
}
