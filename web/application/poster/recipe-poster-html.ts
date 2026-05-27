import type { RecipePayload } from "@/domain/recipe/generate-recipe";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listIngredients(recipe: RecipePayload): string {
  const items = recipe.ingredients || [];
  if (!items.length) return "<li>依食譜準備</li>";
  return items
    .map((ing) => {
      const name = typeof ing === "object" ? ing.name : String(ing);
      const price =
        typeof ing === "object" && ing.price ? `（${ing.price}）` : "";
      return `<li>${esc(String(name))}${esc(price)}</li>`;
    })
    .join("");
}

function listSteps(recipe: RecipePayload): string {
  const steps = recipe.steps || [];
  if (!steps.length) return "<li>依序料理</li>";
  return steps.map((s, i) => `<li>${esc(String(s))}</li>`).join("");
}

/** Printable HTML poster (no Playwright; user prints or saves as PDF). */
export function buildRecipePosterHtml(recipe: RecipePayload): string {
  const name = esc(recipe.recipe_name || "本日料理");
  const theme = esc(recipe.theme || "家常");
  const cost = esc(String(recipe.estimated_total_cost || "—"));
  const photo = recipe.photo_url
    ? `<img src="${esc(recipe.photo_url)}" alt="成品" class="hero-photo" />`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <title>${name} — 食譜海報</title>
  <style>
    :root {
      --bg: #FFFAF5;
      --surface: #FFFFFF;
      --border: #EAE4DC;
      --primary-dark: #A67318;
      --green: #2A6049;
      --text-ink: #1C1917;
      --text-body: #3D3530;
      --text-muted: #9C8F84;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "PingFang TC", "Microsoft JhengHei", sans-serif;
      background: var(--bg);
      color: var(--text-body);
      margin: 0;
      padding: 32px;
      line-height: 1.6;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { color: var(--text-ink); margin: 0 0 8px; font-size: 2rem; }
    .theme { color: var(--text-muted); margin-bottom: 20px; }
    .hero-photo {
      width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 14px;
      margin-bottom: 20px;
    }
    section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    h2 { color: var(--green); font-size: 1rem; margin: 0 0 10px; }
    ol, ul { margin: 0; padding-left: 1.25rem; }
    .cost { font-weight: 700; color: var(--primary-dark); margin-top: 12px; }
    @media print {
      body { padding: 12px; }
      section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${name}</h1>
    <p class="theme">${theme} · 職人料理大腦</p>
    ${photo}
    <section>
      <h2>食材</h2>
      <ul>${listIngredients(recipe)}</ul>
    </section>
    <section>
      <h2>步驟</h2>
      <ol>${listSteps(recipe)}</ol>
    </section>
    <p class="cost">估算成本：NT$ ${cost}</p>
  </div>
</body>
</html>`;
}
