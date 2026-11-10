/**
 * scripts/token-catalogue/sources.ts
 *
 * The reviewed Material source ledger. Every `verified` row in the catalogue
 * cites one of these entries, and each entry retains exactly the facts relied
 * on — the factual digest — with the date it was read and the generation of
 * the source that was readable that day. The digest is reviewed data, not
 * scraped at build time; its sha256 is what the catalogue records, so a claim
 * can be tied to the evidence actually read, never to a copy of the page.
 *
 * A verification statement means: verified against this source generation,
 * read on this date. It is not a claim that a network-disabled build re-read
 * the site, and revising a Material fact requires a fresh same-day read and a
 * new ledger entry, not an edit of the digest.
 */
import type { SourceRecord } from "./types";

export const sources: SourceRecord[] = [
  {
    id: "m3-tokens-overview",
    url: "https://m3.material.io/foundations/design-tokens/overview",
    section: "Classes of tokens; Parts of a token name",
    readDate: "2026-11-10",
    generation: "rendered site text",
    status: "read",
    digest: [
      "Material Design has three classes of tokens: reference, system, and component.",
      "All reference tokens start with the prefix ref; they make up all of the style options available, usually point to a static value, and don't change based on context.",
      "All system tokens start with the prefix sys; they are decisions and roles that systematize the design language for a specific theme or context, and this is where theming occurs.",
      "Component tokens (prefix comp) are in development.",
      "A token's value can be another token. Example identifiers shown: md.ref.palette.secondary90, md.comp.fab.primary.container.color.",
    ].join("\n"),
  },
  {
    id: "m3-shape-scale",
    url: "https://m3.material.io/styles/shape/corner-radius-scale",
    section: "Corner radius scale",
    readDate: "2026-11-10",
    generation: "rendered site text, including the collapsed token module lists",
    status: "read",
    digest: [
      "The Material 3 shape system uses a size-based scale with ten styles:",
      "None - 0dp; Extra small - 4dp; Small - 8dp; Medium - 12dp; Large - 16dp; Large increased - 20dp; Extra large - 28dp; Extra large increased - 32dp; Extra extra large - 48dp; Full - fully rounded corners.",
      "The token module lists the same ten steps as corner values (0dp … 48dp) and the shape names (No rounding … Fully rounded), without md.* identifiers in the rendered text.",
      "Both symmetric and asymmetric shapes use the same 10-step scale.",
    ].join("\n"),
  },
  {
    id: "m3-type-scale",
    url: "https://m3.material.io/styles/typography/type-scale-tokens",
    section: "Type scale tokens (baseline set, token module values); Customize the typeface",
    readDate: "2026-11-10",
    generation: "rendered site text, token module folders expanded in the page",
    status: "read",
    digest: [
      "Material 3 has one type scale containing two sets of type styles: 15 baseline and 15 emphasized, both following the same scale from Display Large to Label Small.",
      "Each of the 30 styles has a single token; baseline and emphasized naming shown on the page: md.sys.typescale.display-large and md.sys.typescale.emphasized.display-large.",
      "Baseline values read from the expanded token module (font, weight, size, tracking, line height):",
      "Display Large Roboto 400 57pt -0.25pt 64pt; Display Medium Roboto 400 45pt 0pt 52pt; Display Small Roboto 400 36pt 0pt 44pt.",
      "Headline Large Roboto 400 32pt 0pt 40pt; Headline Medium Roboto 400 28pt 0pt 36pt; Headline Small Roboto 400 24pt 0pt 32pt.",
      "Title Large Roboto 400 22pt 0pt 28pt; Title Medium Roboto 500 16pt 0.15pt 24pt; Title Small Roboto 500 14pt 0.1pt 20pt.",
      "Body Large Roboto 400 16pt 0.5pt 24pt; Body Medium Roboto 400 14pt 0.25pt 20pt; Body Small Roboto 400 12pt 0.4pt 16pt.",
      "Label Large Roboto 500 14pt 0.1pt 20pt; Label Medium Roboto 500 12pt 0.5pt 16pt; Label Small Roboto 500 11pt 0.5pt 16pt.",
      "Typeface guidance: the brand typeface is used for larger type styles, like Headline and Display; the plain typeface is used for smaller type styles, like Body and Label; Roboto is the default for both typefaces.",
    ].join("\n"),
  },
  {
    id: "m3-color-roles",
    url: "https://m3.material.io/styles/color/the-color-system",
    section: "What are color roles?; General concepts",
    readDate: "2026-11-10",
    generation: "rendered site text",
    status: "context-only",
    digest: [
      "There are 26 standard color roles organized into six groups: primary, secondary, tertiary, error, surface, and outline.",
      "Roles are implemented in design and code through tokens.",
      "Naming concepts: Surface for backgrounds and large low-emphasis areas; Primary, Secondary, Tertiary as accent roles; Container as a fill for foreground elements, not for text or icons; On-roles a color for text or icons on top of its paired parent color; Variant a lower-emphasis alternative.",
      "The color system is built on accessible color pairings providing an accessible minimum 3:1 contrast.",
      "No exact color value is claimed: palettes are generated per theme, and this page states roles, not universal hex values.",
    ].join("\n"),
  },
  {
    id: "m3-motion-tokens",
    url: "https://m3.material.io/styles/motion/easing-and-duration/tokens-specs",
    section: "Tokens (Easing; Duration)",
    readDate: "2026-11-10",
    generation: "rendered site text, token tables",
    status: "read",
    digest: [
      "In the expressive update, components and motion use the motion physics system (springs); the easing and duration system is still used for transitions but is no longer maintained.",
      "CSS easing values: md.sys.motion.easing.emphasized is N/A for CSS (use Standard as a fallback); emphasized.decelerate cubic-bezier(0.05, 0.7, 0.1, 1.0); emphasized.accelerate cubic-bezier(0.3, 0.0, 0.8, 0.15); standard cubic-bezier(0.2, 0.0, 0, 1.0); standard.decelerate cubic-bezier(0, 0, 0, 1); standard.accelerate cubic-bezier(0.3, 0, 1, 1).",
      "Durations: short1 50ms, short2 100ms, short3 150ms, short4 200ms; medium1 250ms, medium2 300ms, medium3 350ms, medium4 400ms; long1 450ms, long2 500ms, long3 550ms, long4 600ms; extra-long1 700ms, extra-long2 800ms, extra-long3 900ms, extra-long4 1000ms.",
    ].join("\n"),
  },
  {
    id: "m3-motion-physics",
    url: "https://m3.material.io/styles/motion/overview/how-it-works",
    section: "Motion physics",
    readDate: "2026-11-10",
    generation: "rendered site text",
    status: "context-only",
    digest: [
      "The expressive update moves components and motion to a physics system using springs.",
      "Scheme selection (expressive vs standard) is separate from the token name.",
      "No numerical spring parameters were verified from this page.",
    ].join("\n"),
  },
];
