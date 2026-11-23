import { Hct } from "./vendor/hct/hct.js";
import { sourceColorFromImage as argbFromImage } from "./vendor/utils/image_utils.js";
export async function sourceColorFromImage(image) {
    return Hct.fromInt(await argbFromImage(image));
}
