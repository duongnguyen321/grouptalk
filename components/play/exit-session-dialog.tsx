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

type ExitSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ExitSessionDialog({
  open,
  onOpenChange,
  onConfirm,
}: ExitSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            Thoát phiên chơi?
          </DialogTitle>
          <DialogDescription className="text-base text-ink-soft">
            Bạn có thể quay lại bằng mã phiên.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-cat-couple-deep text-white hover:bg-cat-couple-deep/90"
          >
            Thoát
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
