import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="legal mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-brand-primary hover:underline">
        ← 返回首頁
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-text-ink">免責聲明</h1>
      <div className="legal__card mt-6 space-y-4 text-sm leading-relaxed text-text-body">
        <p>
          本服務提供的食譜、採買建議與圖片皆由 AI 產生，僅供家庭料理參考，可能含有錯誤或不適合你的內容。
        </p>
        <ul className="list-inside list-disc space-y-2">
          <li>請自行確認過敏原、食材新鮮度與保存方式。</li>
          <li>生肉、海鮮、雞蛋等請確實煮熟至安全熟度。</li>
          <li>兒童食用請注意食材大小、軟硬度與窒息風險。</li>
          <li>本服務不提供醫療、營養治療或專業飲食控制建議。</li>
          <li>我們無法保證 AI 能完全避免你設定需避開的食材，下廚前請再次檢查。</li>
        </ul>
        <p className="text-text-muted">
          使用本服務即表示你理解並願意自行承擔下廚與飲食決策的責任。
        </p>
      </div>
    </main>
  );
}
