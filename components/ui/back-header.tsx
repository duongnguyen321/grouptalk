import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type BackHeaderProps = {
  backHref: string;
  title?: string;
  children?: ReactNode;
};

export function BackHeader({ backHref, title, children }: BackHeaderProps) {
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
      <div className="flex size-11 items-center justify-center">{children}</div>
    </header>
  );
}
