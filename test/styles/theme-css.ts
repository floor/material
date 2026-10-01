// test/styles/theme-css.ts
// Resolve sparse contrast declarations against their standard mode for CSS audits.
export const colorRoles = (body: string): Record<string, string> => Object.fromEntries(
  [...body.matchAll(/--mtrl-sys-color-([a-z-]+):\s*(#[a-f\d]{3,6})\b/gi)]
    .map(([, role, hex]) => [role!, (hex!.length === 4 ? '#' + [...hex!.slice(1)].map(c => c + c).join('') : hex!).toLowerCase()]),
);
export const isDark = (selector: string) => selector.replace(/:not\([^)]*\)/g, '').includes('[data-theme-mode=dark]') ||
  (selector.includes('(prefers-color-scheme: dark)') && !selector.includes('not (prefers-color-scheme: dark)')) || selector === '.dark-theme';
export const colorBlocks = (css: string) => {
  const result: { selector: string; body: string; roles: Record<string, string> }[] = [];
  const palette = Object.fromEntries([...css.matchAll(/(--mtrl-contrast-[a-z0-9-]+):\s*(#[a-f\d]{3,6})\b/gi)]
    .map(([, token, hex]) => [token!, hex!]));
  const visit = (text: string, media = '') => {
    let start = 0;
    while (start < text.length) {
      const open = text.indexOf('{', start);
      if (open < 0) break;
      let end = open + 1, depth = 1;
      while (depth && end < text.length) {
        if (text[end] === '{') depth++;
        if (text[end] === '}') depth--;
        end++;
      }
      const selector = text.slice(start, open).trim();
      const body = text.slice(open + 1, end - 1).replace(/var\((--mtrl-contrast-[a-z0-9-]+)\)/g, (match, token: string) => palette[token] ?? match);
      if (selector.startsWith('@')) visit(body, `${media} ${selector}`);
      else result.push({ selector: `${media} ${selector}`.trim(), body, roles: colorRoles(body) });
      start = end;
    }
  };
  visit(css);
  return result;
};
export const standardRoles = (css: string, theme: string, dark: boolean): Record<string, string> => {
  const blocks = colorBlocks(css);
  const light = blocks.find(b => b.selector === `[data-theme=${theme}]` || (theme === 'baseline' && b.selector === ':root'))!;
  const night = blocks.find(b => b.selector === `[data-theme=${theme}][data-theme-mode=dark]` || (theme === 'baseline' && b.selector === '.dark-theme'))!;
  return { ...light.roles, ...(dark ? night.roles : {}) };
};
export const resolvedColorBody = (css: string, theme: string, selector: string, body: string): string => {
  if (!selector.includes('data-theme-contrast')) return body;
  const roles = { ...standardRoles(css, theme, isDark(selector)), ...colorRoles(body) };
  return Object.entries(roles).map(([role, hex]) => `--mtrl-sys-color-${role}: ${hex};`).join('\n');
};
