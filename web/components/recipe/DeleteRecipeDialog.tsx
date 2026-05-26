"use client";

import { useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Button } from "@/components/primitives/Button";
import { deleteRecipe } from "@/lib/api/recipes";
import { removeOfflineRecipe } from "@/lib/offline/sync";
import { useToast } from "@/components/providers/ToastProvider";

export type DeleteRecipeDialogProps = {
  recipeId: string | null;
  recipeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (recipeId: string) => void;
};

export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteRecipeDialogProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!recipeId || busy) return;
    setBusy(true);
    try {
      await deleteRecipe(recipeId);
      await removeOfflineRecipe(recipeId);
      onDeleted?.(recipeId);
      onOpenChange(false);
      toast({ title: "已刪除食譜", description: recipeTitle });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "刪除失敗";
      toast({ title: "無法刪除", description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="刪除這道食譜？"
      description={`「${recipeTitle}」將從料理書移除，此動作無法復原。`}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type="button"
          variant="primary"
          className="bg-danger text-white hover:bg-danger/90"
          disabled={busy || !recipeId}
          onClick={() => void handleConfirm()}
        >
          {busy ? "刪除中…" : "刪除"}
        </Button>
      </div>
    </Dialog>
  );
}
