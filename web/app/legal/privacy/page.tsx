import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-brand-primary hover:underline">
        ← 返回首頁
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-text-ink">隱私權政策</h1>
      <div className="legal__card mt-6 space-y-4 text-sm leading-relaxed text-text-body">
        <p>
          <strong>職人料理大腦</strong>以匿名工作階段運作，不需註冊帳號即可使用。我們盡量只收集讓服務運作所需的資料。
        </p>

        <section>
          <h2 className="font-medium text-text-ink">我們會保存什麼</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>你輸入的料理需求與 AI 產出的食譜（若已連線資料庫）</li>
            <li>料理書、收藏、週菜單、家庭飲食偏好與口味檔案（過敏、不愛食材、家庭成員等，同一匿名工作階段 ID）</li>
            <li>每日文字與圖片使用次數（配額管理）</li>
            <li>瀏覽器本機快取（離線閱讀已看過的食譜）</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium text-text-ink">第三方服務</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>文字食譜由 AI 模型（如 Google Gemini）處理你的輸入</li>
            <li>若開啟主圖或步驟插圖，可能送至設定的圖像 API 供應商</li>
            <li>若你允許「使用分析」，我們使用 PostHog 記錄匿名事件（不含完整輸入內文與過敏原原文）</li>
            <li>資料庫託管於 Neon；網站託管於 Vercel</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium text-text-ink">公開分享</h2>
          <p>
            你主動發布的食譜會產生公開連結，他人可看見該食譜內容，但不會顯示你的飲食偏好或自訂避開食材清單。
          </p>
        </section>

        <section>
          <h2 className="font-medium text-text-ink">你的選擇</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              在「口味檔案」（/app/profile）可查看、編輯、匯出或清除個人化資料；在「我的」可關閉分析、刪除帳戶與所有伺服器端資料
            </li>
            <li>
              我們會記住你提供的口味偏好與家庭成員資訊以提供個人化推薦。你可隨時透過口味檔案管理或清除。
            </li>
            <li>清除瀏覽器資料可能使本機料理書與快取無法恢復</li>
            <li>過敏原偏好僅用於生成食譜，不會用於廣告，也不會放入分析事件</li>
          </ul>
        </section>

        <p className="text-text-muted">
          若有疑問，請透過專案 GitHub 或營運聯絡方式與我們聯繫。
        </p>
      </div>
    </main>
  );
}
