import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      googleId?: string;
      displayName?: string | null;
    };
  }

  interface User {
    googleId?: string | null;
    displayName?: string | null;
  }
}
