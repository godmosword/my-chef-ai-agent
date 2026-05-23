#!/usr/bin/env npx tsx
/**
 * Generate gradient marketing placeholders under web/public/marketing/.
 * Usage: pnpm -F @chef/web marketing:images
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "marketing");

type Asset = {
  file: string;
  width: number;
  height: number;
  from: string;
  to: string;
  label?: string;
};

const ASSETS: Asset[] = [
  {
    file: "hero-three-cup-chicken.jpg",
    width: 800,
    height: 600,
    from: "#FAC775",
    to: "#8B4513",
    label: "三杯雞",
  },
  {
    file: "usecase-fridge-tomato-eggs.jpg",
    width: 800,
    height: 600,
    from: "#F5C4B3",
    to: "#D85A30",
    label: "番茄炒蛋",
  },
  {
    file: "usecase-kids-rice-bowl.jpg",
    width: 800,
    height: 600,
    from: "#9FE1CB",
    to: "#1D9E75",
    label: "兒童餐",
  },
  {
    file: "usecase-guest-beef-stew.jpg",
    width: 800,
    height: 600,
    from: "#FAC775",
    to: "#BA7517",
    label: "紅酒燉牛肉",
  },
  {
    file: "screenshot-library.png",
    width: 1200,
    height: 800,
    from: "#F5F0E8",
    to: "#E8DFD0",
    label: "料理書",
  },
  {
    file: "screenshot-cooking-mode.png",
    width: 1200,
    height: 800,
    from: "#1D3D2E",
    to: "#0F2419",
    label: "廚房模式",
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function gradientSvg(w: number, h: number, from: string, to: string, label?: string): Buffer {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const text = label
    ? `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.round(w / 14)}" font-weight="600" fill="rgba(255,255,255,0.92)">${label}</text>`
    : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgb(${r1},${g1},${b1})"/>
      <stop offset="100%" stop-color="rgb(${r2},${g2},${b2})"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  ${text}
</svg>`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const asset of ASSETS) {
    const svg = gradientSvg(asset.width, asset.height, asset.from, asset.to, asset.label);
    const dest = path.join(outDir, asset.file);
    if (asset.file.endsWith(".png")) {
      await sharp(svg).png({ quality: 90 }).toFile(dest);
    } else {
      await sharp(svg).jpeg({ quality: 88 }).toFile(dest);
    }
    console.log("Wrote", path.relative(process.cwd(), dest));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
