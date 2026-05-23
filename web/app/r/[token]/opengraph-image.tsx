import { ImageResponse } from "next/og";
import { getPublicRecipeByToken } from "@/lib/db/queries/sharing";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ token: string }> };

export default async function OGImage({ params }: Props) {
  const { token } = await params;
  const recipe = await getPublicRecipeByToken(token);
  const title = recipe?.title ?? "食譜";
  const cuisine = recipe?.cuisine ?? "";
  const summary = recipe?.summary?.slice(0, 80) ?? "";
  const site = getSiteUrl();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#FFFAF5",
          padding: 80,
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#6B6259" }}>職人料理大腦</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            marginTop: 40,
            color: "#1F1B16",
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {cuisine ? (
          <div style={{ fontSize: 32, color: "#C8881A", marginTop: 20 }}>
            {cuisine}
          </div>
        ) : null}
        {summary ? (
          <div
            style={{
              fontSize: 24,
              color: "#6B6259",
              marginTop: 48,
              lineHeight: 1.4,
            }}
          >
            {summary}
          </div>
        ) : null}
        <div style={{ marginTop: "auto", fontSize: 22, color: "#A39A8E" }}>
          {site.replace(/^https?:\/\//, "")}/r/{token}
        </div>
      </div>
    ),
    { ...size },
  );
}
