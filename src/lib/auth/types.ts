import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      emailVerified?: Date | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: Date | null;
  }
}
