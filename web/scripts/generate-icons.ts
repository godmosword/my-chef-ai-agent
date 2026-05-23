/**
 * Generate PWA icons from scripts/assets/icon-source.svg
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

const SIZES = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "shortcut-today.png", size: 96, maskable: false },
  { name: "shortcut-library.png", size: 96, maskable: false },
  { name: "shortcut-shopping.png", size: 96, maskable: false },
] as const;

async function renderIcon(size: number, maskable: boolean) {
  const svg = await readFile(src);
  let pipeline = sharp(svg).resize(size, size, { fit: "contain", background: "#FFFAF5" });
  if (maskable) {
    const pad = Math.round(size * 0.1);
    pipeline = sharp(svg)
      .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: "#FFFAF5" })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: "#FFFAF5",
      });
  }
  return pipeline.png().toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const { name, size, maskable } of SIZES) {
    const buf = await renderIcon(size, maskable);
    await sharp(buf).toFile(path.join(outDir, name));
    console.log(`wrote ${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
