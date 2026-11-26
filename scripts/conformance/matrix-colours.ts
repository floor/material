export const colourThemes = ["light", "dark", "seed"] as const;
export const matrixSeed = "#006C4C";

export type ColourTheme = typeof colourThemes[number];
export type ResolvedColours = Record<ColourTheme, string>;
export type ThemePalettes = Record<ColourTheme, Record<string, string>>;

const byteHex = (value: number) => Math.round(value).toString(16).padStart(2, "0").toUpperCase();

export function parseColour(value: string): { hex: string; opacity: number } {
  if (/^#[\da-f]{6}$/i.test(value)) return { hex: value.toUpperCase(), opacity: 1 };
  const rgb = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(value);
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value);
  const channels = rgb ?? srgb;
  if (!channels) throw new Error(`Cannot read colour "${value}"`);
  const hex = "#" + channels.slice(1, 4).map(channel => byteHex(Number(channel) * (rgb ? 1 : 255))).join("");
  return { hex, opacity: Number(channels[4] ?? 1) };
}

export function readColourRoles(readings: ResolvedColours[], palettes: ThemePalettes) {
  const colours = readings.map(reading => colourThemes.map(theme => parseColour(reading[theme])));
  const transparent = colours.every(reading => reading.every(value => value.opacity === 0));
  const roles = Object.keys(palettes.light).filter(role => colours.every(reading =>
    colourThemes.every((theme, index) => {
      const colour = reading[index]!;
      return colour.opacity > 0 && colour.hex === palettes[theme][role];
    }),
  ));
  const role = roles.length === 1 ? roles[0]! : null;
  const resolved = colours.map(reading => {
    const hex = (index: number) => {
      const { hex, opacity } = reading[index]!;
      if (role || opacity === 1) return hex;
      return opacity === 0 ? "#00000000" : hex + byteHex(opacity * 255);
    };
    return { light: hex(0), dark: hex(1), seed: hex(2) };
  });
  return { role, transparent, resolved };
}
