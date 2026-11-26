import type { CaseResult, PartResult } from "./measure";
import { colourThemes } from "./matrix-colours";
import type { RowBinding } from "./matrix-types";

export type TypographyDetails = {
  size: string;
  weight: string;
  lineHeight: string;
  tracking: string;
};
export type MetricDetails = { radius: string } | { elevation: string; shadow?: string } | TypographyDetails;
type MetricProbe = { part: string; kind: "shape" | "typography" | "elevation"; style: string };

export const typographyRoles = [
  "display-large", "display-medium", "display-small",
  "headline-large", "headline-medium", "headline-small",
  "title-large", "title-medium", "title-small",
  "body-large", "body-medium", "body-small",
  "label-large", "label-medium", "label-small",
] as const;
export const shapeRoles = [
  "none", "extra-small", "small", "medium", "large", "large-increased",
  "extra-large", "extra-large-increased", "extra-extra-large", "full",
] as const;

export const pascal = (name: string) =>
  name.split("-").map(part => part[0]!.toUpperCase() + part.slice(1)).join("");

// Distinct values below the clamp of the smallest measured container expose
// which corner token a computed radius follows, even when base values agree.
export const shapeOverrides = Object.fromEntries(shapeRoles.map((step, index) => [
  `--mtrl-sys-shape-corner-${step}`, `${index + 1.5}px`,
]));

export function typeMetrics(style: Record<string, string>): TypographyDetails {
  return {
    size: style.fontSize!,
    weight: style.fontWeight === "normal" ? "400" : style.fontWeight!,
    lineHeight: style.lineHeight!,
    tracking: style.letterSpacing === "normal" || style.letterSpacing === "0" ? "0px" : style.letterSpacing!,
  };
}

export function identifyTypography(readings: TypographyDetails[], nominal: Record<string, TypographyDetails>): string | null {
  const props = ["size", "weight", "lineHeight", "tracking"] as const;
  const matches = Object.keys(nominal).filter(role => readings.every(reading =>
    props.every(key => reading[key] !== "" && reading[key] !== undefined &&
      Number.parseFloat(reading[key]) === Number.parseFloat(nominal[role]![key])),
  ));
  return matches.length === 1 ? matches[0]! : null;
}

export function elevationRole(value: string): string | null {
  const geometry = value.replace(/(?:rgba?\([^)]*\)|color\(srgb[^)]*\))\s*/g, "");
  if (geometry === "none" || geometry === "0dp") return "Level0";
  if (geometry === "0px 1px 2px 0px, 0px 1px 3px 1px") return "Level1";
  return /^Level ?[0-5]$/.test(value) ? value.replace(" ", "") : null;
}

export function metricProbe(row: RowBinding): MetricProbe | undefined {
  const probe = row.probe;
  if (row.aspect === "shape" && "style" in probe && probe.style.endsWith("Radius")) return { ...probe, kind: "shape" };
  if (row.aspect === "typography" && "style" in probe) return { ...probe, kind: "typography" };
  if (row.aspect === "elevation") return { part: probe.part, style: "boxShadow", kind: "elevation" };
}

const corners = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];

function isFull(part: PartResult): boolean {
  const half = Math.min(part.rect.width, part.rect.height) / 2;
  return half > 0 && corners.every(corner => {
    const radius = part.style[corner];
    return radius === "50%" || (radius?.endsWith("px") && Number.parseFloat(radius) >= half - 0.01);
  });
}

export function measureMetric(probe: MetricProbe, rows: [CaseResult, CaseResult], raw: string, id: string): {
  role: string | null;
  resolved: MetricDetails;
} {
  const get = (parts: CaseResult["parts"] | undefined): PartResult => {
    const part = parts?.[probe.part];
    if (!part) throw new Error(`${id}: missing role probe part ${probe.part}`);
    return part;
  };
  const variants = rows.flatMap(row => [...colourThemes.map(theme => get(row.themes?.[theme])), get(row.metrics?.compact)]);
  if (probe.kind === "shape") {
    const signature = rows.map(row => get(row.metrics?.shapeProfile).style[probe.style]);
    const sameRadius = variants.every(part => part.style[probe.style] === variants[0]!.style[probe.style]);
    const token = sameRadius ? shapeRoles.find(step =>
      signature.every(value => value === shapeOverrides[`--mtrl-sys-shape-corner-${step}`]),
    ) : undefined;
    let role = token ? `Corner${pascal(token)}` : variants.every(isFull) ? "CornerFull" : null;
    if (role === "CornerExtraLarge" && probe.style === "borderTopLeftRadius" && variants.every(part =>
      part.style.borderTopRightRadius === part.style.borderTopLeftRadius &&
      part.style.borderBottomLeftRadius === "0px" && part.style.borderBottomRightRadius === "0px",
    )) role = "CornerExtraLargeTop";
    return { role, resolved: { radius: raw } };
  }
  if (probe.kind === "typography") {
    const nominal = rows[0].metrics!.typography;
    const prominent = { ...nominal.LabelLarge!, weight: "700" };
    const role = identifyTypography(variants.map(part => typeMetrics(part.style)), { ...nominal, LabelLargeProminent: prominent });
    return { role, resolved: typeMetrics(variants[0]!.style) };
  }
  const found = variants.map(part => elevationRole(part.style.boxShadow ?? ""));
  const role = found.every(value => value === found[0]) ? (found[0] ?? null) : null;
  const dp = role ? [0, 1, 3, 6, 8, 12][Number(role.at(-1))] : undefined;
  return { role, resolved: { elevation: dp === undefined ? raw : `${dp}dp`, shadow: variants[0]!.style.boxShadow } };
}
