# Public Sharing + Polish（Prompt 7）

## 決策摘要

| 項目 | 決策 |
|------|------|
| 公開快照 | `published_version_id` 指向發布當下 `latest_version_id` |
| 重新發布 | 新 `share_token`，舊連結失效 |
| 撤銷 | `share_token = NULL`；view/like 計數保留 |
| OG 背景 | `#FFFAF5` |
| Analytics | PostHog（lazy）；無 key 則 no-op |
| Token | 12 字 base62，`web/lib/sharing/token.ts` |

## 資料

- Migration：`web/migrations/0005_public_sharing.sql`
- 表：`user_settings`、`shared_recipe_views`、`shared_recipe_likes`；`recipes` 分享欄位

## API

- `POST/DELETE /api/recipes/:id/share`
- `GET /api/r/:token`（無 session）
- `POST /api/r/:token/view`、`POST/DELETE .../like`
- `GET/PUT /api/me/settings`；`DELETE /api/me`

## UI

- 公開頁 `/r/[token]` + `opengraph-image`（noindex）
- 料理書詳情 `RecipeShareMenu`（`NEXT_PUBLIC_SHARING_ENABLED` 預設開）
- 「我的」設定：主題、字級、語言、分析、刪帳戶
- 錯誤頁、`/quota-reached`、App onboarding v1

## 環境變數

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SHARING_ENABLED` | 設 `0` 關閉分享 UI |
| `NEXT_PUBLIC_SITE_URL` | 分享／OG 絕對網址 |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | 選填，預設 `https://us.i.posthog.com` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | 設 `0` 關閉事件 |

## 驗收

- [ ] 跑 migration `0005`
- [ ] 發布 → 公開頁 → LINE/FB OG preview
- [ ] 重新發布舊 token 404；撤銷後同
- [ ] 設定同步、刪帳戶清資料
