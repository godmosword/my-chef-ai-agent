"use client";

/** @deprecated Use `/app` + InputHero; kept for `/legacy` until next major release. */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LegacyRecipeCard } from "./LegacyRecipeCard";
import type { AiRecipePayload } from "@/domain/recipe/generate-recipe";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; recipe: AiRecipePayload }
  | { id: string; role: "error"; text: string };

type QuotaState = {
  remaining: number;
  limit: number;
  used: number;
  db_configured: boolean;
};

type FavoriteItem = {
  id: number;
  recipe_name: string;
  recipe_data: AiRecipePayload;
  created_at: string;
};

export function ChatPanel() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [cuisineKey, setCuisineKey] = useState<string | null>(null);
  const [cuisineLabelText, setCuisineLabelText] = useState("不拘");
  const [cuisineOptions, setCuisineOptions] = useState<
    Array<{ key: string; label: string }>
  >([]);

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/quota");
      const data = await res.json();
      if (data.ok) {
        setQuota({
          remaining: data.remaining,
          limit: data.limit,
          used: data.used,
          db_configured: data.db_configured,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    const res = await fetch("/api/favorites");
    const data = await res.json();
    if (data.ok) setFavorites(data.items || []);
  }, []);

  const loadCuisine = useCallback(async () => {
    try {
      const res = await fetch("/api/cuisine");
      const data = await res.json();
      if (data.ok) {
        setCuisineKey(data.active_cuisine ?? null);
        setCuisineLabelText(data.label || "不拘");
        setCuisineOptions(data.options || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshQuota();
    loadCuisine();
  }, [refreshQuota, loadCuisine]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: userId, role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const rawText = await res.text();
      let data: { ok?: boolean; error?: string; recipe?: AiRecipePayload; quota?: QuotaState };
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }
      if (res.status === 404) {
        throw new Error(
          "找不到 /api/recipes。請確認 Vercel 專案 Root Directory 為 web，或已部署最新 Web 版。",
        );
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          recipe: data.recipe as AiRecipePayload,
        },
      ]);
      if (data.quota) {
        setQuota({
          remaining: data.quota.remaining,
          limit: data.quota.limit,
          used: data.quota.used,
          db_configured: quota?.db_configured ?? true,
        });
      } else {
        await refreshQuota();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "請求失敗";
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "error", text: msg },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function clearMemory() {
    const res = await fetch("/api/memory", { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      setItems([]);
      flash(data.cleared ? "已清除對話記憶" : (data.message || "完成"));
    }
  }

  async function openFavorites() {
    await loadFavorites();
    setShowFavorites(true);
  }

  async function selectCuisine(key: string) {
    const res = await fetch("/api/cuisine", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuisine: key }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      flash(data.error || "無法設定菜系");
      return;
    }
    setCuisineKey(data.active_cuisine);
    setCuisineLabelText(data.label);
    flash(`已切換：${data.label}`);
  }

  async function generateHero(recipe: AiRecipePayload): Promise<string | null> {
    const res = await fetch("/api/recipes/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe_name: recipe.recipe_name,
        recipe_data: recipe,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "主圖生成失敗");
    }
    await refreshQuota();
    flash(data.source === "generated" ? "主圖已生成" : "已使用備援圖");
    return data.image_url as string;
  }

  async function downloadPoster(
    recipe: AiRecipePayload,
    photoUrl?: string | null,
  ) {
    const res = await fetch("/api/recipes/poster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe_data: recipe,
        photo_url: photoUrl || undefined,
      }),
    });
    if (!res.ok) {
      let err = "海報下載失敗";
      try {
        const j = await res.json();
        err = j.error || err;
      } catch {
        /* html error body */
      }
      throw new Error(err);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${recipe.recipe_name || "recipe"}-poster.html`;
    a.click();
    URL.revokeObjectURL(url);
    flash("海報 HTML 已下載（可用瀏覽器列印為 PDF）");
  }

  async function saveFavorite(recipe: AiRecipePayload) {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe_name: recipe.recipe_name,
        recipe_data: recipe,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "收藏失敗");
    }
    flash(`已收藏「${recipe.recipe_name}」`);
  }

  async function removeFavorite(id: number) {
    await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    await loadFavorites();
  }

  const favoritesEnabled = quota?.db_configured ?? false;

  return (
    <div className="chat">
      <header className="chat__header">
        <div className="chat__header-top">
          <h1>職人料理大腦</h1>
          {quota && (
            <span className="chat__quota">
              今日剩餘 {quota.remaining}/{quota.limit}
              {!quota.db_configured && "（未連 DB）"}
            </span>
          )}
        </div>
        <p>輸入想吃的、手邊的食材，主廚為你研發食譜。</p>
        {cuisineOptions.length > 0 && (
          <div className="chat__cuisine">
            <span className="chat__cuisine-label">
              菜系：{cuisineLabelText}
              {!quota?.db_configured && "（需 DB）"}
            </span>
            <div className="chat__cuisine-chips">
              {cuisineOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`chat__chip${cuisineKey === opt.key ? " chat__chip--active" : ""}`}
                  disabled={!quota?.db_configured}
                  onClick={() => selectCuisine(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="chat__toolbar">
          <button type="button" className="chat__tool" onClick={clearMemory}>
            清除記憶
          </button>
          <button
            type="button"
            className="chat__tool"
            onClick={openFavorites}
            disabled={!favoritesEnabled}
            title={favoritesEnabled ? "" : "需設定 DATABASE_URL"}
          >
            我的最愛
          </button>
          <a className="chat__tool chat__tool--link" href="/legal/disclaimer">
            免責
          </a>
          <a className="chat__tool chat__tool--link" href="/legal/privacy">
            隱私
          </a>
        </div>
      </header>

      {toast && <div className="chat__toast">{toast}</div>}

      {showFavorites && (
        <div className="chat__overlay" role="dialog" aria-label="我的最愛">
          <div className="chat__drawer">
            <div className="chat__drawer-head">
              <h2>我的最愛</h2>
              <button type="button" onClick={() => setShowFavorites(false)}>
                關閉
              </button>
            </div>
            {favorites.length === 0 ? (
              <p className="chat__drawer-empty">尚無收藏食譜</p>
            ) : (
              <ul className="chat__fav-list">
                {favorites.map((f) => (
                  <li key={f.id}>
                    <span>{f.recipe_name}</span>
                    <button type="button" onClick={() => removeFavorite(f.id)}>
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="chat__messages" aria-live="polite">
        {items.length === 0 && (
          <p className="chat__hint">例如：番茄炒蛋、清冰箱剩食、四歲小孩晚餐</p>
        )}
        {items.map((item) => {
          if (item.role === "user") {
            return (
              <div key={item.id} className="bubble bubble--user">
                {item.text}
              </div>
            );
          }
          if (item.role === "error") {
            return (
              <div key={item.id} className="bubble bubble--error">
                {item.text}
              </div>
            );
          }
          return (
            <div key={item.id} className="bubble bubble--assistant">
              <LegacyRecipeCard
                recipe={item.recipe}
                onFavorite={saveFavorite}
                favoritesEnabled={favoritesEnabled}
                onGenerateHero={generateHero}
                onDownloadPoster={downloadPoster}
              />
            </div>
          );
        })}
        {loading && (
          <div className="bubble bubble--assistant bubble--loading">
            主廚正在研發菜單與擺盤，請稍候…
          </div>
        )}
      </div>

      <form className="chat__form" onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你想煮的料理…"
          disabled={loading}
          autoComplete="off"
          aria-label="料理需求"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          送出
        </button>
      </form>

      <style jsx>{`
        .chat {
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          max-width: 720px;
          margin: 0 auto;
          padding: 20px 16px 24px;
          position: relative;
        }
        .chat__header-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .chat__header h1 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--text-ink);
        }
        .chat__quota {
          font-size: 0.85rem;
          color: var(--green);
          font-weight: 600;
        }
        .chat__header p {
          margin: 6px 0 10px;
          color: var(--text-muted);
          font-size: 0.95rem;
        }
        .chat__cuisine {
          margin-bottom: 10px;
        }
        .chat__cuisine-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          display: block;
          margin-bottom: 6px;
        }
        .chat__cuisine-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .chat__chip {
          padding: 5px 10px;
          font-size: 0.8rem;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          cursor: pointer;
        }
        .chat__chip--active {
          background: var(--green);
          color: #f5f0e6;
          border-color: var(--green);
        }
        .chat__chip:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .chat__toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chat__tool {
          padding: 6px 12px;
          font-size: 0.85rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--text-body);
          cursor: pointer;
        }
        .chat__tool:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .chat__tool--link {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .chat__toast {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--green);
          color: #f5f0e6;
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 0.9rem;
          z-index: 100;
        }
        .chat__overlay {
          position: fixed;
          inset: 0;
          background: rgba(28, 25, 23, 0.35);
          z-index: 50;
          display: flex;
          justify-content: center;
          align-items: flex-end;
        }
        .chat__drawer {
          background: var(--surface);
          width: 100%;
          max-width: 720px;
          max-height: 70vh;
          border-radius: 16px 16px 0 0;
          padding: 16px 20px 24px;
          overflow-y: auto;
        }
        .chat__drawer-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .chat__drawer-head h2 {
          margin: 0;
          font-size: 1.1rem;
        }
        .chat__drawer-empty {
          color: var(--text-muted);
        }
        .chat__fav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .chat__fav-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .chat__messages {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 20px 0;
          overflow-y: auto;
        }
        .chat__hint {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .bubble {
          max-width: 100%;
        }
        .bubble--user {
          align-self: flex-end;
          background: var(--primary);
          color: #fff;
          padding: 10px 14px;
          border-radius: 16px 16px 4px 16px;
          max-width: 85%;
        }
        .bubble--assistant {
          align-self: flex-start;
          width: 100%;
        }
        .bubble--loading {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 14px 16px;
          border-radius: 14px;
          color: var(--text-muted);
        }
        .bubble--error {
          align-self: flex-start;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 10px 14px;
          border-radius: 12px;
        }
        .chat__form {
          display: flex;
          gap: 8px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }
        .chat__form input {
          flex: 1;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 1rem;
          background: var(--surface);
        }
        .chat__form button[type="submit"] {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          background: var(--green);
          color: #f5f0e6;
          font-weight: 600;
          cursor: pointer;
        }
        .chat__form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
