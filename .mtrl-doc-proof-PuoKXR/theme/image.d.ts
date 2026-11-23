/** The dominant-colour path, behind `material/theme/image`. */
import { Hct } from "./vendor/hct/hct.js";
/** The source colour of an image: its dominant colour, found by quantizing the pixels and scoring the result. */
export declare function sourceColorFromImage(image: HTMLImageElement): Promise<Hct>;
