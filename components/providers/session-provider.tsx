"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { getOrCreateDeviceId } from "@/lib/device";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    getOrCreateDeviceId();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

