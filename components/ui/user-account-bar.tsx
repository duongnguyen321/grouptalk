"use client";

import { motion } from "framer-motion";
import { LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import Image from "next/image";
import { signInWithGoogle, signOutAction } from "@/app/auth/actions";
import { TAP_SCALE } from "@/lib/motion";

export type UserAccountBarProps = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    displayName?: string | null;
  } | null;
  googleSignInAvailable?: boolean;
  className?: string;
};

export function UserAccountBar({
  user,
  googleSignInAvailable = true,
  className = "",
}: UserAccountBarProps) {
  const isGoogle = Boolean(user);
  const displayName = user?.displayName || user?.name || user?.email || "Người dùng";

  if (isGoogle) {
    return (
      <div
        className={`flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(28,25,23,0.04)] ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {user?.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full border border-ink/10 object-cover"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cat-friends/30 font-display text-sm font-extrabold text-cat-friends-deep">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-extrabold text-ink">
              {displayName}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
              <ShieldCheck className="size-3 text-cat-friends-deep" />
              <span>Tài khoản Google</span>
            </span>
          </div>
        </div>

        <form action={signOutAction} className="shrink-0 ml-2">
          <motion.button
            whileTap={{ scale: TAP_SCALE }}
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-canvas px-3 py-2 text-xs font-bold text-cat-couple-deep transition hover:bg-cat-couple/10"
          >
            <LogOut className="size-3.5" />
            <span>Đăng xuất</span>
          </motion.button>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-[0_2px_10px_rgba(28,25,23,0.04)] ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-muted">
          <User className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-ink">
            Chế độ ẩn danh
          </span>
          <span className="text-[11px] font-medium text-ink-muted">
            Lịch sử lưu trên máy này
          </span>
        </div>
      </div>

      {googleSignInAvailable ? (
        <form action={signInWithGoogle} className="shrink-0 ml-2">
          <motion.button
            whileTap={{ scale: TAP_SCALE }}
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-ink/10 bg-canvas px-3 py-2 text-xs font-bold text-ink transition hover:border-ink/25 hover:bg-ink/5"
          >
            <LogIn className="size-3.5 text-cat-friends-deep" />
            <span>Đăng nhập</span>
          </motion.button>
        </form>
      ) : null}
    </div>
  );
}
