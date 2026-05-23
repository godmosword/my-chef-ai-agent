import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "職人料理大腦 App 介面預覽";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#C8922A", letterSpacing: 2, textTransform: "uppercase" }}>
          AI · 料理書 · 廚房模式
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 56,
            fontWeight: 500,
            color: "#1C1917",
            lineHeight: 1.2,
            maxWidth: 720,
          }}
        >
          用一句話，換一桌剛好的晚餐
        </div>
        <div style={{ marginTop: 32, display: "flex", gap: 24 }}>
          <div
            style={{
              width: 280,
              height: 210,
              borderRadius: 16,
              background: "linear-gradient(135deg, #E5A33D, #C8881A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
            }}
          >
            三杯雞
          </div>
          <div style={{ fontSize: 22, color: "#3D3530", lineHeight: 1.6, maxWidth: 480 }}>
            完整食譜、主圖與採買清單。
            <br />
            每一道都會留在你的料理書裡。
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
