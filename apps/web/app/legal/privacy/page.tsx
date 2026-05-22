import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal">
      <Link href="/">← 返回聊天</Link>
      <h1>隱私政策</h1>
      <div className="legal__card">
        <p><strong>蒐集資料：</strong></p>
        <ul>
          <li>對話內容（匿名 session）</li>
          <li>收藏食譜</li>
          <li>用量與方案狀態</li>
        </ul>
        <p>
          <strong>保存：</strong>依營運需求保存；可透過「清除記憶」刪除對話，或聯絡營運方處理個資請求。
        </p>
      </div>
    </main>
  );
}
