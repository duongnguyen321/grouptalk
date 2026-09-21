"use client";

import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className = "" }: SiteFooterProps) {
  return (
    <footer
      className={`mt-auto flex items-center justify-center gap-2 py-6 text-xs text-ink-muted ${className}`}
    >
      <span>GroupTalk</span>
      <span aria-hidden="true" className="opacity-40">
        •
      </span>
      <motion.a
        href="https://github.com/duongnguyen321/grouptalk"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Mã nguồn GroupTalk trên GitHub"
        whileTap={{ scale: TAP_SCALE }}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <GitBranch className="size-3.5" />
        <span className="font-medium">GitHub</span>
      </motion.a>
    </footer>
  );
}
