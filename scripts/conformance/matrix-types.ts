export type Aspect = "size" | "spacing" | "shape" | "colour" | "typography" | "elevation" | "focus" | "motion" | "density" | "other";
export type Status = "match" | "drift" | "no-value";

export type SpecReference = { value: string | null; url: string; section: string; read: string };
export type ComposeReference = {
  value: string | null;
  file: string | null;
  symbol: string | null;
  line: number | null;
  url: string;
};
export type Override = {
  reason?: string;
  spec?: SpecReference;
  compose?: ComposeReference;
};

type Box = "width" | "height" | "x" | "y";
export type Probe =
  | { part: string; box: Box }
  | { part: string; style: string }
  | { part: string; inset: "left" | "right" | "top" | "bottom"; relativeTo: string }
  | { part: string; outline: true }
  | { part: string; gap: "right" | "bottom"; relativeTo: string }
  | { part: string; read: "present" | "opacity" | "elevation" | "translateX" }
  | { part: string; sideInsets: string }
  | { part: string; widthPair: string }
  | { part: string; different: "width" | "height" | "aspectRatio"; relativeTo: string };

export type RowBinding = {
  /** Public id within its component, independent of the fixture case spelling. */
  key: string;
  property: string;
  aspect: Aspect;
  variant?: string;
  case: string;
  probe: Probe;
  token?: string;
};

export type FixtureBinding = {
  fixture: string;
  id: string;
  name: string;
  rows: RowBinding[];
};
