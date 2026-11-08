#!/usr/bin/env bun
// scripts/stage-package.ts
//
// Stage the tree publish.yml packs in .package-stage: the manifest's files,
// the shipped Sass normalized, ready for the published-manifest step and
// `npm pack`. The checkout itself is never written.
import { PACKAGE_STAGE, stagePackage } from "./package-stage";

const { files, bytesBefore, bytesAfter } = await stagePackage(PACKAGE_STAGE);
console.log(
  `Staged the published tree in ${PACKAGE_STAGE}: ${files} Sass sources, ${bytesBefore} -> ${bytesAfter} bytes (${bytesBefore - bytesAfter} smaller).`,
);
