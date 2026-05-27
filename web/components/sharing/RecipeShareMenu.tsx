"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { Dialog } from "@/components/primitives/Dialog";
import { useToast } from "@/components/providers/ToastProvider";
import {
  createShareLink,
  revokeShareLink,
} from "@/application/api/sharing";
import { buildShareUrl } from "@/platform/config/site-url";
import { capture } from "@/platform/analytics/events";

type Props = {
  recipeId: string;
  initialToken?: string | null;
  initialPublishedAt?: string | null;
};

export function RecipeShareMenu({
  recipeId,
  initialToken,
  initialPublishedAt,
}: Props) {
  const { toast } = useToast();
  const [token, setToken] = useState(initialToken ?? null);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt ?? null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"revoke" | "republish" | null>(null);

  const shareUrl = token ? buildShareUrl(token) : null;
  const isShared = Boolean(token);

  const publish = useCallback(
    async (republish: boolean) => {
      setBusy(true);
      try {
        const res = await createShareLink(recipeId, republish);
        setToken(res.share_token);
        setPublishedAt(res.published_at);
        capture("recipe_shared", { republish });
        toast({ title: republish ? "已重新發布" : "公開連結已建立" });
        setConfirm(null);
      } catch (e) {
        toast({
          title: "分享失敗",
          description: e instanceof Error ? e.message : "請稍後再試",
          variant: "error",
        });
      } finally {
        setBusy(false);
      }
    },
    [recipeId, toast],
  );

  const revoke = useCallback(async () => {
    setBusy(true);
    try {
      await revokeShareLink(recipeId);
      setToken(null);
      setPublishedAt(null);
      toast({ title: "已取消分享" });
      setConfirm(null);
      setOpen(false);
    } catch (e) {
      toast({
        title: "取消失敗",
        description: e instanceof Error ? e.message : "請稍後再試",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }, [recipeId, toast]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "已複製連結" });
    } catch {
      toast({ title: "無法複製", variant: "error" });
    }
  }, [shareUrl, toast]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={busy && !open}
        onClick={() => {
          setOpen(true);
          if (!isShared && !busy) {
            void publish(false);
          }
        }}
      >
        <Share2 className="size-5" aria-hidden />
        {isShared ? "分享中" : "分享"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={isShared ? "分享中" : "分享食譜"}
        description="任何持有連結的人都可以查看，但不能編輯。"
      >
        {confirm === "revoke" ? (
          <div className="space-y-4">
            <p className="text-sm text-text-body">
              取消後，既有連結會立即失效。確定要繼續嗎？
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                返回
              </Button>
              <Button variant="primary" loading={busy} onClick={revoke}>
                確認取消分享
              </Button>
            </div>
          </div>
        ) : confirm === "republish" ? (
          <div className="space-y-4">
            <p className="text-sm text-text-body">
              會產生新連結，舊連結將失效，並以目前最新版本重新發布。
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                返回
              </Button>
              <Button
                variant="primary"
                loading={busy}
                onClick={() => publish(true)}
              >
                確認重新發布
              </Button>
            </div>
          </div>
        ) : isShared ? (
          <div className="space-y-3">
            {shareUrl && (
              <p className="break-all rounded bg-surface-muted p-2 text-xs text-text-muted">
                {shareUrl}
              </p>
            )}
            {publishedAt && (
              <p className="text-xs text-text-muted">
                發布於 {new Date(publishedAt).toLocaleString("zh-TW")}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={copyLink}>
                複製連結
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirm("republish")}
                disabled={busy}
              >
                重新發布（新連結）
              </Button>
              <Button
                variant="ghost"
                className="text-danger"
                onClick={() => setConfirm("revoke")}
                disabled={busy}
              >
                取消分享
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              產生連結後，內容會凍結在發布當下的版本；你之後的修改不會自動出現在分享頁。
            </p>
            <Button loading={busy} onClick={() => publish(false)}>
              產生公開連結
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
