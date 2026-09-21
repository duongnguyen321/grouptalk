import type { Metadata } from "next";
import { SessionManager } from "@/components/session/session-manager";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Quản lý phiên chơi",
  description:
    "Theo dõi và quản lý các phiên chơi gần đây trên thiết bị của bạn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SessionManagePage() {
  const session = await auth();

  return (
    <SessionManager
      user={session?.user ?? null}
      googleSignInAvailable={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
    />
  );
}

