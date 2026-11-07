import assert from "node:assert/strict";
import type { Page } from "playwright";

type Factory = typeof import("../src/index");
type FocusWindow = Window & {
  mtrl: Factory;
  focusCleanup?: () => void;
  focusTargets: HTMLElement[];
  focusInstant?: { color: string; expected: string; properties: string };
};

const cases = ["carousel", "toolbar", "timepicker", "fab-menu", "chips", "split-button", "button-group", "navigation-bar", "snackbar", "dialog", "button"] as const;
type Case = typeof cases[number];

/** Actual factory/element styles, real Tab focus, both directions and all three colour modes. */
export async function checkFocusVisibility(page: Page): Promise<void> {
  const failures: string[] = [];
  let checks = 0;
  let compactedChecks = 0;
  for (const mode of ["light", "dark", "forced-colors"] as const) {
    await page.emulateMedia({ colorScheme: mode === "light" ? "light" : "dark", forcedColors: mode === "forced-colors" ? "active" : "none", reducedMotion: "no-preference" });
    for (const dir of ["ltr", "rtl"] as const) {
      for (const flavor of ["factory", "element"] as const) {
        for (const kind of cases) {
          const label = `${mode}/${dir}/${flavor}/${kind}`;
          console.log(`Focus visibility: ${label}`);
          await page.evaluate(({ mode, dir, flavor, kind }) => {
            const w = window as unknown as FocusWindow;
            w.focusCleanup?.();
            const stage = document.getElementById("host")!;
            stage.replaceChildren();
            stage.style.cssText = "padding:48px;width:700px;min-height:600px;position:relative";
            document.documentElement.dataset.theme = "baseline";
            document.documentElement.dataset.themeMode = mode === "forced-colors" ? "dark" : mode;
            document.documentElement.dir = dir;
            const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
            const slides = Array.from({ length: 4 }, (_, i) => ({ title: `Slide ${i}`, buttonText: i ? undefined : "Explore", buttonUrl: "#explore" }));
            let root: ParentNode;
            if (flavor === "factory") {
              const m = w.mtrl;
              const factories = {
                carousel: () => m.createCarousel({ variant: "multi-browse", itemWidth: 260, slides }),
                toolbar: () => m.createToolbar({ color: "vibrant", items: [{ icon, ariaLabel: "Edit" }] }),
                timepicker: () => m.createTimePicker({ value: "10:30", showSeconds: true }),
                "fab-menu": () => m.createFabMenu({ presentation: "list", icon, ariaLabel: "Actions", items: ["First", "Middle", "Last"].map(text => ({ id: text, text, icon })) }),
                chips: () => m.createChips({ scrollable: true, chips: ["First", "Middle", "Last"].map(text => ({ text, value: text })) }),
                "split-button": () => m.createSplitButton({ text: "Send", items: [{ id: "later", text: "Later" }] }),
                "button-group": () => m.createButtonGroup({ kind: "connected", buttons: [{ text: "Day", value: "day" }, { text: "Week", value: "week" }] }),
                "navigation-bar": () => m.createNavigationBar({ itemLayout: "horizontal", items: [{ id: "one", label: "Destinations", icon }, { id: "two", label: "Notifications", icon }] }),
                snackbar: () => m.createSnackbar({ message: "Archived", action: "Undo", dismissible: true, duration: "indefinite" }),
                dialog: () => m.createDialog({ title: "Dialog", content: "Content", closeButton: true }),
                button: () => m.createButton({ text: "Save", variant: "filled" }),
              };
              const c = factories[kind]();
              stage.append(c.element);
              root = c.element;
              w.focusCleanup = () => c.destroy();
              if ("open" in c && typeof c.open === "function") c.open();
              if (kind === "snackbar") (c as ReturnType<Factory["createSnackbar"]>).show();
            } else {
              const markup: Record<Case, string> = {
                carousel: `<m-carousel variant="multi-browse" item-width="260">${slides.map((s, i) => `<m-carousel-item label="${s.title}" ${i ? "" : 'button-text="Explore" button-url="#explore"'}></m-carousel-item>`).join("")}</m-carousel>`,
                toolbar: `<m-toolbar color="vibrant"><m-icon-button aria-label="Edit" icon='${icon}'></m-icon-button></m-toolbar>`,
                timepicker: '<m-timepicker value="10:30" show-seconds></m-timepicker>',
                "fab-menu": '<m-fab-menu presentation="list" aria-label="Actions"><m-fab-menu-item>First</m-fab-menu-item><m-fab-menu-item>Middle</m-fab-menu-item><m-fab-menu-item>Last</m-fab-menu-item></m-fab-menu>',
                chips: '<m-chips scrollable><m-chip>First</m-chip><m-chip>Middle</m-chip><m-chip>Last</m-chip></m-chips>',
                "split-button": '<m-split-button label="Send"><m-menu-item>Later</m-menu-item></m-split-button>',
                "button-group": '<m-button-group kind="connected"><m-button-group-item>Day</m-button-group-item><m-button-group-item>Week</m-button-group-item></m-button-group>',
                "navigation-bar": `<m-navigation-bar item-layout="horizontal"><m-navigation-bar-item icon='${icon}'>Destinations</m-navigation-bar-item><m-navigation-bar-item icon='${icon}'>Notifications</m-navigation-bar-item></m-navigation-bar>`,
                snackbar: '<m-snackbar message="Archived" action="Undo" dismissible duration="indefinite"></m-snackbar>',
                dialog: '<m-dialog headline="Dialog" close-button>Content</m-dialog>',
                button: '<m-button variant="filled">Save</m-button>',
              };
              stage.innerHTML = markup[kind];
              const host = stage.firstElementChild as HTMLElement & { show?: () => void };
              if (["timepicker", "fab-menu", "snackbar", "dialog"].includes(kind)) host.show!();
              root = kind === "toolbar" ? host.querySelector("m-icon-button")!.shadowRoot! : host.shadowRoot!;
              w.focusCleanup = () => stage.replaceChildren();
            }
            const query = <T extends HTMLElement>(selector: string): T => (root instanceof HTMLElement && root.matches(selector) ? root : root.querySelector<T>(selector)) as T;
            if (kind === "carousel") query(".mtrl-carousel").style.cssText = "width:500px;height:200px";
            if (kind === "fab-menu") query(".mtrl-fab-menu").style.cssText = "position:relative;margin-top:240px;margin-inline-start:200px";
            if (kind === "chips") query(".mtrl-chips").style.width = "180px";
            if (kind === "navigation-bar") query(".mtrl-navigation-bar").style.width = "220px";
            const selectors: Record<Case, string> = {
              carousel: ".mtrl-carousel__item, .mtrl-carousel__button", toolbar: ".mtrl-icon-button",
              timepicker: ".mtrl-time-picker__hours, .mtrl-time-picker__minutes, .mtrl-time-picker__seconds",
              "fab-menu": ".mtrl-fab-menu__item", chips: '.mtrl-chip[role="gridcell"]',
              "split-button": ".mtrl-split-button__leading", "button-group": ".mtrl-button-group__button",
              "navigation-bar": ".mtrl-navigation-bar__item", snackbar: ".mtrl-snackbar__action",
              dialog: ".mtrl-dialog__header-close", button: ".mtrl-button",
            };
            w.focusTargets = [...root.querySelectorAll<HTMLElement>(selectors[kind])];
            // Include the factory root itself (button/icon button).
            if (root instanceof HTMLElement && root.matches(selectors[kind])) w.focusTargets.unshift(root);
            if (kind === "carousel") w.focusTargets = w.focusTargets.slice(0, 3);
            for (const el of w.focusTargets) el.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
          }, { mode, dir, flavor, kind });
          await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
          const count = await page.evaluate(() => (window as unknown as FocusWindow).focusTargets.length);
          assert(count > 0, `${label}: mounted targets`);
          for (let i = 0; i < count; i++) {
            await page.evaluate(i => {
              const el = (window as unknown as FocusWindow).focusTargets[i]!;
              el.tabIndex = 0;
              const pred = document.createElement("button");
              pred.id = "focus-predecessor";
              pred.style.cssText = "position:fixed;width:1px;height:1px;opacity:0";
              el.before(pred);
              pred.focus();
            }, i);
            await page.keyboard.press("Tab");
            const measure = await page.evaluate(async ({ i, kind }) => {
              const el = (window as unknown as FocusWindow).focusTargets[i]!;
              document.querySelector("#focus-predecessor")?.remove();
              (el.getRootNode() as Document | ShadowRoot).querySelector("#focus-predecessor")?.remove();
              await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})));
              if (kind === "carousel") {
                const scroller = el.closest(".mtrl-carousel")!.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
                scroller.scrollLeft = 0;
                scroller.dispatchEvent(new Event("scroll"));
                await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
              }
              const cs = getComputedStyle(el);
              const ringElement = kind === "navigation-bar" ? el.querySelector<HTMLElement>(".mtrl-navigation-bar__indicator")! : el;
              const after = getComputedStyle(el, "::after");
              const before = getComputedStyle(el, "::before");
              const slide = kind === "carousel" && el.classList.contains("mtrl-carousel__item");
              const cell = kind === "chips";
              const pseudo = slide && after.content !== "none" ? after : cell ? before : null;
              const ring = pseudo ?? getComputedStyle(ringElement);
              const width = parseFloat(pseudo ? ring.borderTopWidth : ring.outlineWidth);
              const offset = pseudo ? 0 : parseFloat(ring.outlineOffset);
              const rect = ringElement.getBoundingClientRect();
              const n = (v: string) => parseFloat(v) || 0;
              const box = pseudo ? { top: rect.top + n(ring.top), right: rect.right - n(ring.right), bottom: rect.bottom - n(ring.bottom), left: rect.left + n(ring.left) }
                : { top: rect.top - width - offset, right: rect.right + width + offset, bottom: rect.bottom + width + offset, left: rect.left - width - offset };
              const clipping: string[] = [];
              let anc: Element | null = ringElement.parentElement;
              while (anc && anc !== document.documentElement) {
                const a = getComputedStyle(anc); const r = anc.getBoundingClientRect();
                if (a.overflowY !== "visible" && (box.top < r.top - .5 || box.bottom > r.bottom + .5)) clipping.push(`${anc.className}: block`);
                if (a.overflowX !== "visible" && (box.left < r.left - .5 || box.right > r.right + .5)) clipping.push(`${anc.className}: inline`);
                anc = anc.parentElement ?? ((anc.getRootNode() as ShadowRoot).host ?? null);
              }
              const cp = /inset\(([\d.]+)px ([\d.]+)(?:px)?/.exec(cs.clipPath);
              if (cp && (box.left < rect.left + Number(cp[2]) - .5 || box.right > rect.right - Number(cp[2]) + .5 || box.top < rect.top + Number(cp[1]) - .5 || box.bottom > rect.bottom - Number(cp[1]) + .5)) clipping.push(`self: ${cs.clipPath}`);
              const next = el.nextElementSibling;
              const nr = next?.getBoundingClientRect();
              const overlap = nr && Math.min(box.right, nr.right) - Math.max(box.left, nr.left) > .5 && Math.min(box.bottom, nr.bottom) - Math.max(box.top, nr.top) > .5;
              const occluded = Boolean(overlap && (parseInt(cs.zIndex) || 0) <= (parseInt(getComputedStyle(next!).zIndex) || 0));
              const surface = document.createElement("span");
              surface.style.color = "var(--mtrl-sys-color-surface)"; el.append(surface);
              const surfaceColor = getComputedStyle(surface).color; surface.remove();
              return { focused: el.matches(":focus-visible"), width, style: pseudo ? ring.borderTopStyle : ring.outlineStyle,
                color: pseudo ? ring.borderTopColor : ring.outlineColor, background: cs.backgroundColor,
                parentBackground: el.parentElement ? getComputedStyle(el.parentElement).backgroundColor : "", shadow: cs.boxShadow, surfaceColor,
                clipping, occluded, clipPath: cs.clipPath, pseudo: Boolean(pseudo) };
            }, { i, kind });
            const problems: string[] = [];
            if (!measure.focused || measure.width < 2 || measure.style !== "solid") problems.push(`missing ring ${JSON.stringify(measure)}`);
            // A compacted item can be partly outside the viewport. Its own clip must retain all ring edges.
            if (kind !== "carousel" || !measure.clipPath || measure.clipPath === "none") {
              if (measure.clipping.length) problems.push(`clipped ${measure.clipping.join(", ")}`);
            } else if (measure.clipping.some(s => s.startsWith("self:"))) problems.push(`clipped ${measure.clipping.join(", ")}`);
            if (kind === "carousel" && /inset\(/.test(measure.clipPath)) compactedChecks++;
            if (["split-button", "button-group", "navigation-bar", "snackbar"].includes(kind) && measure.occluded) problems.push("sibling paints over ring");
            if (kind === "toolbar" && mode !== "forced-colors") {
              const background = mode === "light" ? "rgb(234, 221, 255)" : "rgb(79, 55, 139)";
              if (contrast(measure.color, background) < 3) problems.push(`contrast ${contrast(measure.color, background).toFixed(2)}:1`);
            }
            if (kind === "carousel" && !measure.pseudo && mode !== "forced-colors") {
              // Secondary on a translucent image scrim needs an opaque contrasting halo.
              if (!measure.shadow.includes(measure.surfaceColor) || contrast(measure.color, measure.surfaceColor) < 3) problems.push("CTA ring lacks a contrasting opaque halo over imagery");
            }
            checks++;
            if (problems.length) failures.push(`${label}/${i}: ${problems.join("; ")}`);
          }
          if (kind === "dialog") {
            const target = page.locator(".mtrl-dialog__header-close");
            await target.evaluate(el => (el as HTMLElement).blur());
            await target.click(); await page.mouse.move(0, 0);
            await target.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))));
            const pointer = await target.evaluate(el => ({ focus: el.matches(":focus"), visible: el.matches(":focus-visible"), background: getComputedStyle(el).backgroundColor }));
            if (!pointer.focus || pointer.visible || (mode !== "forced-colors" && pointer.background !== "rgba(0, 0, 0, 0)")) failures.push(`${label}: pointer state layer ${JSON.stringify(pointer)}`);
          }
          if (kind === "button") {
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.evaluate(() => {
              const w = window as unknown as FocusWindow;
              const el = w.focusTargets[0]!;
              el.blur();
              const pred = document.createElement("button"); el.before(pred); pred.focus();
              el.addEventListener("focus", () => {
                const cs = getComputedStyle(el);
                const token = document.createElement("span");
                token.style.color = "var(--mtrl-sys-color-secondary)"; el.append(token);
                w.focusInstant = { color: cs.outlineColor, expected: getComputedStyle(token).color, properties: cs.transitionProperty };
                token.remove(); pred.remove();
              }, { once: true });
            });
            await page.keyboard.press("Tab");
            const instant = await page.evaluate(() => (window as unknown as FocusWindow).focusInstant!);
            if (instant.properties.split(",").some(p => p.trim() === "outline-color" || p.trim() === "all")) failures.push(`${label}: reduced motion transitions outline-color (${instant.properties})`);
            if (mode !== "forced-colors" && instant.color !== instant.expected) failures.push(`${label}: immediate outline ${instant.color}, expected ${instant.expected}`);
            await page.emulateMedia({ reducedMotion: "no-preference" });
          }
        }
      }
    }
  }
  await page.evaluate(() => {
    const w = window as unknown as FocusWindow; w.focusCleanup?.();
    document.documentElement.removeAttribute("dir");
    document.documentElement.dataset.themeMode = "light";
    document.getElementById("host")!.removeAttribute("style");
  });
  await page.emulateMedia({ colorScheme: "light", forcedColors: "none", reducedMotion: "no-preference" });
  for (const failure of failures) console.error(failure);
  assert(compactedChecks > 0, "The carousel checks must exercise a compacted slide with a real clip path");
  assert.deepEqual(failures, [], `Focus visibility: ${failures.length} failures across ${checks} keyboard measurements`);
  console.log(`Passed focus visibility: ${checks} keyboard measurements, factory and custom elements, LTR/RTL, light/dark/forced colors, pointer and reduced motion.`);
}

function contrast(a: string, b: string): number {
  const luminance = (color: string): number => {
    const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return values[0]! * .2126 + values[1]! * .7152 + values[2]! * .0722;
  };
  const x = luminance(a); const y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
