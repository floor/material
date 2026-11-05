// scripts/package-stage.ts
/**
 * The staging copy the release packs. npm packs the root manifest's `files`
 * from a prepared directory, never from the checkout itself: publish.yml
 * stages there, normalizes the shipped Sass (scripts/package-styles.ts), runs
 * its published-manifest step and packs. createPackageFixture() does the same
 * on a temporary directory for every packed check, so a check and a release
 * see the same tarball.
 */
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { normalizeStyleTree, type StyleNormalization } from "./package-styles";

/** The staging directory publish.yml packs from, at the repository root. */
export const PACKAGE_STAGE = ".package-stage";

/**
 * Copy what npm packs: the manifest's `files` entries before their `!`
 * exclusions, plus the four files npm always includes.
 */
export async function stagePackageFiles(stage: string): Promise<void> {
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  const manifest = await Bun.file("package.json").json() as { files: string[] };
  const always = ["package.json", "README.md", "npm-readme.md", "LICENSE"];
  for (const path of [...manifest.files.filter(entry => !entry.startsWith("!")), ...always]) {
    await cp(path, join(stage, path), { recursive: true });
  }
}

/** Stage the packable tree and normalize the Sass that ships in it. */
export async function stagePackage(stage: string): Promise<StyleNormalization> {
  await stagePackageFiles(stage);
  return normalizeStyleTree(join(stage, "src", "styles"));
}
