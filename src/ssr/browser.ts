// src/ssr/browser.ts
/** Browser export condition: importing is safe, calling the server API is not. */
export function renderElement(): never {
  throw new Error("material/ssr is server-only");
}
