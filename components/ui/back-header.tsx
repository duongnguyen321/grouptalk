import { ChevronLeft, Home } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BackHeaderProps = {
  backHref: string;
  title?: string;
  showHome?: boolean;
  children?: ReactNode;
};

export function BackHeader({
  backHref,
  title,
  showHome = true,
  children,
}: BackHeaderProps) {
  const shouldRenderHome = showHome && backHref !== "/session";

  return (
    <header className="flex items-center justify-between gap-2 px-4 pt-5 pb-2">
      <Link
        href={backHref}
        aria-label="Quay lại"
        className="flex size-11 items-center justify-center rounded-full bg-ink/8 text-ink transition hover:bg-ink/12 active:scale-95"
      >
        <ChevronLeft className="size-5" />
      </Link>
      {title ? (
        <p className="flex-1 text-center text-sm font-semibold text-ink-muted">
          {title}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex size-11 items-center justify-center">
        {children ? (
          children
        ) : shouldRenderHome ? (
          <Link
            href="/session"
            aria-label="Về trang chủ"
            className="flex size-11 items-center justify-center rounded-full bg-ink/8 text-ink transition hover:bg-ink/12 active:scale-95"
          >
            <Home className="size-5" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
