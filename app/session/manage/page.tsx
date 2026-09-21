import type { Metadata } from "next";
import { SessionManager } from "@/components/session/session-manager";

export const metadata: Metadata = {
  title: "Quản lý phiên chơi",
  description:
    "Theo dõi và quản lý các phiên chơi gần đây trên thiết bị của bạn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SessionManagePage() {
  return <SessionManager />;
}
