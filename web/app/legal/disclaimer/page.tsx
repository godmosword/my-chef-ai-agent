import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="legal">
      <Link href="/">← 返回聊天</Link>
      <h1>完整免責聲明</h1>
      <div className="legal__card">
        <p>
          本服務提供 AI 食譜建議，內容僅供參考。請自行評估過敏原、飲食限制、烹調設備與食品安全條件，並依個人健康狀況審慎調整。
        </p>
      </div>
    </main>
  );
}
