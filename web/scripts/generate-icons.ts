/**
 * Generate PWA / home-screen icons from scripts/assets/icon-source.svg
 * Usage: pnpm -F @chef/web icons:generate
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(__dirname, "assets/icon-source.svg");
const outDir = path.join(root, "public/icons");
const appDir = path.join(root, "app");

const BRAND_CREAM = "#FFFAF5";

type IconSpec = {
  name: string;
  size: number;
  maskable: boolean;
  /** Also write to app/ for Next.js metadata (icon.png, apple-icon.png). */
  appRoute?: "icon" | "apple-icon";
};

const SIZES: IconSpec[] = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false, appRoute: "apple-icon" },
  { name: "favicon-32.png", size: 32, maskable: false, appRoute: "icon" },
  { name: "shortcut-today.png", size: 96, maskable: false },
  { name: "shortcut-library.png", size: 96, maskable: false },
  { name: "shortcut-shopping.png", size: 96, maskable: false },
];

async function renderIcon(size: number, maskable: boolean) {
  const svg = await readFile(src);
  if (!maskable) {
    return sharp(svg).resize(size, size, { fit: "cover" }).png().toBuffer();
  }
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  return sharp(svg)
    .resize(inner, inner, { fit: "contain", background: BRAND_CREAM })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: BRAND_CREAM,
    })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  for (const { name, size, maskable, appRoute } of SIZES) {
    const buf = await renderIcon(size, maskable);
    await sharp(buf).toFile(path.join(outDir, name));
    console.log(`wrote public/icons/${name}`);

    if (appRoute) {
      const appName = appRoute === "icon" ? "icon.png" : "apple-icon.png";
      await sharp(buf).toFile(path.join(appDir, appName));
      console.log(`wrote app/${appName}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
