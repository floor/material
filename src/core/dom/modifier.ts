// Reading estimate of root all-js gzip, not a CI measure: button 160 B, icon-button 180 B, fab 40 B, extended-fab 40 B, engine costs 200 B, net about 220 B.
// Private scan and write for one BEM modifier family. Not a public export.
// Each caller keeps its own token table, prefix resolution and omit policy:
// a null omit always writes the value, including a family's default token.

export function readModifier<T extends string>(
  element: Element,
  prefix: string,
  tokens: readonly T[],
  fallback: T,
): T;
export function readModifier(
  element: Element,
  prefix: string,
  tokens: readonly string[],
  fallback: null,
): string | null;
export function readModifier(
  element: Element,
  prefix: string,
  tokens: readonly string[],
  fallback: string | null,
): string | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (element.classList.contains(`${prefix}--${token}`)) return token;
  }
  return fallback;
}

export const writeModifier = (
  element: Element,
  prefix: string,
  tokens: readonly string[],
  value: string,
  omit: string | null,
): void => {
  for (let i = 0; i < tokens.length; i++) {
    element.classList.remove(`${prefix}--${tokens[i]}`);
  }
  if (value !== omit) element.classList.add(`${prefix}--${value}`);
};
