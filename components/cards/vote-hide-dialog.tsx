"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VoteHideDialogProps = {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function VoteHideDialog({
  open,
  busy,
  onOpenChange,
  onConfirm,
}: VoteHideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            Ẩn câu hỏi này?
          </DialogTitle>
          <DialogDescription className="text-base text-ink-soft">
            Ẩn câu hỏi này khỏi các lượt chơi sau của bạn?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button type="button" disabled={busy} onClick={onConfirm}>
            Đồng ý ẩn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
