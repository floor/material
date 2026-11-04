// src/theme/image.ts
/**
 * The dominant-colour path, behind `material/theme/image`.
 *
 * `sourceColorFromImage` quantizes the image's pixels and scores the result —
 * the quantizer, the scorer and the image reader. It lives on its own subpath
 * so a bundle that asks only for `createScheme` and `applyScheme` never pulls
 * them: in the probe's scheme bundle the path is 0 B.
 *
 * @module theme/image
 */

import { Hct } from "./vendor/hct/hct";
import { sourceColorFromImage as argbFromImage } from "./vendor/utils/image_utils";

/**
 * The source colour of an image: its dominant colour, found by quantizing the
 * pixels and scoring the result. The seed for `createScheme`.
 *
 * @example
 * applyScheme(createScheme(await sourceColorFromImage(img)));
 */
export async function sourceColorFromImage(image: HTMLImageElement): Promise<Hct> {
  return Hct.fromInt(await argbFromImage(image));
}
