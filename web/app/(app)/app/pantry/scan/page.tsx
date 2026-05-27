"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { PantryReviewSessionPayload } from "@/application/pantry/vision/review-types";
import { confidenceLabel } from "@/application/pantry/vision/review-commit";

type VisionResponse =
  | { status: "review"; session_id: string; session_type: string; payload: PantryReviewSessionPayload }
  | { status: "recipe"; message: string }
  | { status: "clarify"; message: string; options: string[] }
  | { status: "error"; message: string };

export default function PantryScanPage() {
  const [intent, setIntent] = useState<"auto" | "fridge" | "receipt">("auto");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [payload, setPayload] = useState<PantryReviewSessionPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");

  const upload = useCallback(
    async (file: File) => {
      setLoading(true);
      setMessage(null);
      const form = new FormData();
      form.append("image", file);
      form.append("intent", intent);
      try {
        const res = await fetch("/api/pantry/vision", { method: "POST", body: form });
        const data = (await res.json()) as VisionResponse;
        if (data.status === "review") {
          setSessionId(data.session_id);
          setPayload(data.payload);
        } else {
          setSessionId(null);
          setPayload(null);
          setMessage(
            data.status === "error"
              ? data.message
              : data.status === "recipe"
                ? data.message
                : data.message,
          );
        }
      } catch {
        setMessage("上傳失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    },
    [intent],
  );

  const commit = async () => {
    if (!sessionId) return;
    setLoading(true);
    const res = await fetch(
      `/api/pantry/vision/review/${sessionId}?action=commit`,
      { method: "POST" },
    );
    const data = await res.json();
    setMessage(data.message ?? (res.ok ? "已加入" : data.error));
    if (res.ok) {
      setSessionId(null);
      setPayload(null);
    }
    setLoading(false);
  };

  const removeItem = async (index: number) => {
    if (!sessionId) return;
    const res = await fetch(`/api/pantry/vision/review/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove_index: index }),
    });
    const data = await res.json();
    if (data.payload) setPayload(data.payload);
  };

  const submitManual = async () => {
    setLoading(true);
    const res = await fetch("/api/pantry/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: manualText }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `已登錄 ${data.count} 項\n${(data.summary as string[]).join("\n")}`
        : data.error,
    );
    setLoading(false);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/app" className="text-sm text-brand-primary hover:underline">
        ← 返回今晚
      </Link>
      <h1 className="mt-4 font-serif text-2xl text-text-ink">盤點冰箱 / 掃收據</h1>
      <p className="mt-2 text-sm text-text-muted">
        拍照後先確認辨識結果，再寫入庫存。每日掃描次數有限制。
      </p>

      <div className="mt-6 flex gap-2">
        {(["auto", "fridge", "receipt"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setIntent(m)}
            className={`rounded-full px-3 py-1 text-sm ${
              intent === m
                ? "bg-brand-primary text-white"
                : "bg-surface-muted text-text-body"
            }`}
          >
            {m === "auto" ? "自動" : m === "fridge" ? "冰箱" : "收據"}
          </button>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-border-subtle bg-surface-muted px-4 py-8">
        <span className="text-sm text-text-body">
          {loading ? "辨識中…" : "點擊選擇照片"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>

      {payload && sessionId && (
        <section className="mt-8 space-y-3">
          <h2 className="font-medium text-text-ink">
            {payload.type === "receipt" ? "🧾 收據辨識" : "📸 冰箱辨識"}（
            {payload.items.length} 項）
          </h2>
          {payload.store_name && (
            <p className="text-sm text-text-muted">
              {payload.store_name}
              {payload.purchased_at ? ` · ${payload.purchased_at}` : ""}
              {payload.total_amount != null ? ` · $${payload.total_amount}` : ""}
            </p>
          )}
          <ul className="space-y-2">
            {payload.items.map((item, i) => {
              const conf = item.recognition_confidence ?? item.confidence ?? 1;
              const label = confidenceLabel(conf);
              const low = conf < 0.5 && !item.user_edited;
              return (
                <li
                  key={`${item.item_key}-${i}`}
                  className="rounded-lg border border-border-subtle bg-surface-elevated p-3 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span>
                      {low ? "⚠️" : "✅"} {item.display_name ?? item.raw_name}
                      {item.expires_at ? ` · 📅 ${item.expires_at}` : ""}
                    </span>
                    <span className="text-text-muted">{label}</span>
                  </div>
                  {item.unit_price != null && (
                    <p className="text-xs text-text-muted">${item.unit_price}</p>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-xs text-red-600"
                    onClick={() => void removeItem(i)}
                  >
                    移除
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void commit()}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-white"
            >
              全部加入
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                await fetch(
                  `/api/pantry/vision/review/${sessionId}?action=cancel`,
                  { method: "POST" },
                );
                setSessionId(null);
                setPayload(null);
                setMessage("已取消");
              }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              取消
            </button>
          </div>
        </section>
      )}

      <section className="mt-10 border-t pt-8">
        <h2 className="font-medium">手動新增</h2>
        <textarea
          className="mt-2 w-full rounded-lg border p-3 text-sm"
          rows={3}
          placeholder="番茄 3 顆、香菇 200g、豆腐 2 盒"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
        />
        <button
          type="button"
          disabled={loading || !manualText.trim()}
          onClick={() => void submitManual()}
          className="mt-2 rounded-lg bg-surface-muted px-4 py-2 text-sm"
        >
          加入冰箱
        </button>
      </section>

      {message && (
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm">
          {message}
        </p>
      )}
    </main>
  );
}
