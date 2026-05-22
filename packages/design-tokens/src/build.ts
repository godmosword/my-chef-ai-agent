/**
 * Stub for C1; full generator wired in C4.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");
await fs.mkdir(dist, { recursive: true });
await fs.writeFile(path.join(dist, ".stub"), "pending C4\n");
console.log("@chef/design-tokens build stub ok");
