"use client";

import { useState } from "react";
import type { RecipePayload } from "@/domain/recipe/generate-recipe";

type Props = {
  recipe: RecipePayload;
  onFavorite?: (recipe: RecipePayload) => Promise<void>;
  favoritesEnabled?: boolean;
  onGenerateHero?: (recipe: RecipePayload) => Promise<string | null>;
  onDownloadPoster?: (recipe: RecipePayload, photoUrl?: string | null) => Promise<void>;
};

export function RecipeCard({
  recipe,
  onFavorite,
  favoritesEnabled = false,
  onGenerateHero,
  onDownloadPoster,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(recipe.photo_url ?? null);
  const [heroLoading, setHeroLoading] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

  const name = recipe.recipe_name || "美味食譜";
  const theme = recipe.theme || "家常";
  const talks = recipe.kitchen_talk || [];
  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];
  const shopping = recipe.shopping_list || [];
  const cost = recipe.estimated_total_cost;

  async function handleFavorite() {
    if (!onFavorite || saving || saved) return;
    setSaving(true);
    try {
      await onFavorite(recipe);
      setSaved(true);
    } catch {
      /* parent shows error */
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="recipe-card">
      <header className="recipe-card__header">
        <div className="recipe-card__title-row">
          <h2 className="recipe-card__title">{name}</h2>
          {favoritesEnabled && onFavorite && (
            <button
              type="button"
              className="recipe-card__fav"
              onClick={handleFavorite}
              disabled={saving || saved}
            >
              {saved ? "已收藏" : saving ? "…" : "♥ 收藏"}
            </button>
          )}
        </div>
        <p className="recipe-card__theme">{theme}</p>
        {(onGenerateHero || onDownloadPoster) && (
          <div className="recipe-card__actions">
            {onGenerateHero && (
              <button
                type="button"
                className="recipe-card__action"
                disabled={heroLoading}
                onClick={async () => {
                  setHeroLoading(true);
                  try {
                    const url = await onGenerateHero(recipe);
                    if (url) setHeroUrl(url);
                  } finally {
                    setHeroLoading(false);
                  }
                }}
              >
                {heroLoading ? "生成中…" : "🖼 生成主圖"}
              </button>
            )}
            {onDownloadPoster && (
              <button
                type="button"
                className="recipe-card__action"
                disabled={posterLoading}
                onClick={async () => {
                  setPosterLoading(true);
                  try {
                    await onDownloadPoster(recipe, heroUrl);
                  } finally {
                    setPosterLoading(false);
                  }
                }}
              >
                {posterLoading ? "排版中…" : "📄 下載海報"}
              </button>
            )}
          </div>
        )}
      </header>

      {heroUrl && (
        <img src={heroUrl} alt={name} className="recipe-card__hero" />
      )}

      {talks.length > 0 && (
        <section className="recipe-card__section">
          <h3>廚房三人組</h3>
          <ul className="recipe-card__talks">
            {talks.map((t, i) => (
              <li key={i}>
                <strong>{t.role}</strong>：{t.content}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ingredients.length > 0 && (
        <section className="recipe-card__section">
          <h3>食材</h3>
          <ul>
            {ingredients.map((ing, i) => (
              <li key={i}>
                {ing.name}
                {ing.price ? `（${ing.price}）` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="recipe-card__section">
          <h3>步驟</h3>
          <ol>
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {shopping.length > 0 && (
        <section className="recipe-card__section">
          <h3>採買清單</h3>
          <ul>
            {shopping.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {cost && (
        <p className="recipe-card__cost">估算成本：NT$ {cost}</p>
      )}

      <style jsx>{`
        .recipe-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 18px;
          max-width: 100%;
        }
        .recipe-card__header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .recipe-card__title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .recipe-card__title {
          margin: 0;
          font-size: 1.35rem;
          color: var(--text-ink);
          flex: 1;
        }
        .recipe-card__fav {
          flex-shrink: 0;
          padding: 6px 10px;
          font-size: 0.8rem;
          border: 1px solid var(--primary);
          border-radius: 8px;
          background: var(--surface);
          color: var(--primary-dark);
          cursor: pointer;
        }
        .recipe-card__fav:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .recipe-card__theme {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .recipe-card__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .recipe-card__action {
          padding: 6px 12px;
          font-size: 0.8rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          color: var(--green);
          cursor: pointer;
        }
        .recipe-card__action:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .recipe-card__hero {
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .recipe-card__section {
          margin-bottom: 14px;
        }
        .recipe-card__section h3 {
          margin: 0 0 8px;
          font-size: 0.95rem;
          color: var(--green);
        }
        .recipe-card__section ul,
        .recipe-card__section ol {
          margin: 0;
          padding-left: 1.25rem;
        }
        .recipe-card__talks {
          list-style: none;
          padding-left: 0;
        }
        .recipe-card__talks li {
          margin-bottom: 6px;
        }
        .recipe-card__cost {
          margin: 12px 0 0;
          font-weight: 600;
          color: var(--primary-dark);
        }
      `}</style>
    </article>
  );
}
