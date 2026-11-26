import { createHash } from "node:crypto";
import { join } from "node:path";
import reference from "../../conformance/reference.json";
import { readComposeTokens } from "./compose-tokens";

const kotlin = "compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens";
const aliases = [
  "ColorDarkTokens", "ColorLightTokens", "ElevationTokens", "PaletteTokens",
  "ShapeTokens", "TypographyTokens", "TypefaceTokens", "TypeScaleTokens",
];
const digest = (bytes: ArrayBuffer) => createHash("sha256").update(new Uint8Array(bytes)).digest("hex");

export async function matrixTokens(root: string, files: Set<string>) {
  const sha = reference.reference.compose.commit;
  const cache = join(root, "analysis", "conformance-tokens", sha);
  const manifest: Record<string, string> = reference.tokenHashes;
  const local = process.env.COMPOSE_TOKENS_DIR;
  // Batch downloads limit connections to the mirror. Each file's digest comes
  // from the published Maven source jar, including files supplied offline.
  const names = [...new Set([...aliases, ...files])].sort();
  for (let start = 0; start < names.length; start += 8) {
    await Promise.all(names.slice(start, start + 8).map(async name => {
      const file = `${name}.kt`;
      const hash = manifest[file];
      if (!hash) throw new Error(`No released Compose token file named ${file}`);
      const target = Bun.file(join(cache, file));
      if (await target.exists() && digest(await target.arrayBuffer()) === hash) return;
      let bytes: ArrayBuffer;
      if (local) {
        bytes = await Bun.file(join(local, file)).arrayBuffer();
      } else {
        const url = `https://raw.githubusercontent.com/androidx/androidx/${sha}/${kotlin}/${file}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) throw new Error(`Compose token fetch for ${file} returned HTTP ${response.status}`);
        bytes = await response.arrayBuffer();
      }
      if (digest(bytes) !== hash) throw new Error(`Compose token checksum mismatch for ${file}`);
      await Bun.write(target, bytes);
    }));
  }
  return readComposeTokens(cache).rows;
}
