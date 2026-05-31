import { ImageResponse } from "next/og";
import { tokenColors } from "@/lib/design/token-colors";
import { getPublicRecipeByToken } from "@/platform/db/queries/sharing";
import { getSiteUrl } from "@/platform/config/site-url";

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
  const c = tokenColors;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: c.background,
          padding: 80,
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, color: c.textBody }}>職人料理大腦</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            marginTop: 40,
            color: c.textInk,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {cuisine ? (
          <div style={{ fontSize: 32, color: c.brandPrimaryDark, marginTop: 20 }}>
            {cuisine}
          </div>
        ) : null}
        {summary ? (
          <div
            style={{
              fontSize: 24,
              color: c.textBody,
              marginTop: 48,
              lineHeight: 1.4,
            }}
          >
            {summary}
          </div>
        ) : null}
        <div style={{ marginTop: "auto", fontSize: 22, color: c.textMuted }}>
          {site.replace(/^https?:\/\//, "")}/r/{token}
        </div>
      </div>
    ),
    { ...size },
  );
}
