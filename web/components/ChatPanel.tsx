"use client";

import { FormEvent, useState } from "react";
import { RecipeCard } from "./RecipeCard";
import type { RecipePayload } from "@/lib/ai/generate-recipe";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; recipe: RecipePayload }
  | { id: string; role: "error"; text: string };

export function ChatPanel() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          recipe: data.recipe as RecipePayload,
        },
      ]);
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

  return (
    <div className="chat">
      <header className="chat__header">
        <h1>職人料理大腦</h1>
        <p>輸入想吃的、手邊的食材，主廚為你研發食譜。</p>
      </header>

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
              <RecipeCard recipe={item.recipe} />
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
        }
        .chat__header h1 {
          margin: 0;
          font-size: 1.5rem;
          color: var(--text-ink);
        }
        .chat__header p {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 0.95rem;
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
        .chat__form button {
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
