/**
 * Rasterize the app icon SVG into the PNG sizes the PWA manifest and iOS
 * home screen need. Run once (and after changing scripts/icon.svg):
 *
 *   node scripts/generate-icons.mjs
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "scripts", "icon.svg");
const out = join(root, "public", "icons");

await mkdir(out, { recursive: true });

const sizes = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["badge-96.png", 96],
];

for (const [name, size] of sizes) {
  await sharp(src).resize(size, size).png().toFile(join(out, name));
  console.log(`✓ ${name} (${size}×${size})`);
}
