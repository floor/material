/**
 * scripts/token-catalogue/gaps.ts
 *
 * Material candidates the package deliberately does not emit as custom
 * properties. A gap is `unsupported` — deliberately unavailable — with the
 * retained source that documents the candidate and the reason no row exists.
 * Nothing here is a promise to build it.
 */
import { MOTION_SOURCE, motionTokens } from "./expected";
import type { GapRow } from "./types";

export const gaps: GapRow[] = [
  {
    id: "sys.motion.easing",
    m3Id: null,
    source: MOTION_SOURCE,
    support: "unsupported",
    supportReason:
      "Material's easing tokens are not emitted as custom properties: the library compiles its easing curves into transition declarations as Sass constants. The source page itself marks md.sys.motion.easing.emphasized N/A for CSS, and the easing-and-duration system as no longer maintained in the expressive update",
    emissions: [],
  },
  {
    id: "sys.motion.duration",
    m3Id: null,
    source: MOTION_SOURCE,
    support: "unsupported",
    supportReason:
      `Material's sixteen duration tokens (short1 50ms through extra-long4 ${motionTokens.duration["md.sys.motion.duration.extra-long4"]}) are not emitted as custom properties; durations compile into transition declarations as literals`,
    emissions: [],
  },
  {
    id: "sys.motion.spring",
    m3Id: "md.sys.motion.spring.fast.spatial.*",
    source: "m3-motion-physics",
    support: "unsupported",
    supportReason:
      "the expressive motion physics system defines spring tokens by scheme and movement category; the library implements sampled CSS spring curves as Sass constants, which are not verbatim specification tokens and are not emitted as custom properties",
    emissions: [],
  },
  {
    id: "sys.typescale.emphasized",
    m3Id: "md.sys.typescale.emphasized.display-large",
    source: "m3-type-scale",
    support: "unsupported",
    supportReason:
      "the expressive update adds fifteen emphasized type styles; the library emits the fifteen baseline styles only, so no emphasized token row exists",
    emissions: [],
  },
  {
    id: "sys.typescale.language-height",
    m3Id: null,
    source: "m3-type-scale",
    support: "unsupported",
    supportReason:
      "the type scale can adapt line heights by language height category; the library emits one fixed line height per role and no language-height tokens",
    emissions: [],
  },
  {
    id: "ref.palette",
    m3Id: "md.ref.palette.secondary90",
    source: "m3-tokens-overview",
    support: "unsupported",
    supportReason:
      "Material's reference palette tokens are not emitted: colour ships as generated per-theme system roles (create-theme), which is where Material places theming, and no static palette layer is exposed",
    emissions: [],
  },
];
