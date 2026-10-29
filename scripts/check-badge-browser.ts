/**
 * The badge against the Material 3 badge pages, measured on the rendered item:
 * the standalone factory, `<m-badge>`, and a badge attached with `withBadge`.
 *
 * Read on 2026-10-29:
 *   https://m3.material.io/components/badges/specs
 *   https://m3.material.io/components/badges/guidelines
 *   https://m3.material.io/components/badges/accessibility
 *
 * Specs, "Badge padding and size measurements": small badge 6dp with a 3dp
 * corner radius; large badge 16dp for one digit, 16x34dp for the maximum
 * character count, 8dp corner radius, 4dp between the badge and the text
 * container. The distances are "from the top trailing icon corner to the
 * bottom leading badge corner (HxW)": 6x6dp for the small badge, 14x12dp for
 * the large one. Guidelines: "Badge containers are anchored inside the icon
 * bounding box." Accessibility: "The accessibility label for a badge item
 * will be read after its navigation destination. Any numerical badges will
 * have their number read, while non-counting badges will simply announce New
 * notification."
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";

type Box = { left: number; top: number; right: number; bottom: number; width: number; height: number };
type Distance = { horizontal: number; vertical: number };
type BadgeState = { visible: boolean; display: string; text: string };

interface Badge {
  element: HTMLElement;
  wrapper?: HTMLElement;
  getLabel: () => string;
  isVisible: () => boolean;
  setLabel: (label: string | number) => unknown;
  destroy: () => void;
}

/**
 * The badge at the specs' sizes, distances and max; an empty or zero label
 * shows nothing; a standalone badge keeps its place in the flow; and with a
 * `withBadge`-attached badge the item reads its count after its name, as the
 * accessibility page states.
 */
export async function checkBadge(page: Page, check: (name: string) => void): Promise<void> {
  // One list for the whole check, asserted at the end, so one run on main
  // shows every distance that is off rather than only the first.
  const failures: string[] = [];
  const expect = (ok: boolean, message: string): void => {
    if (!ok) failures.push(message);
  };
  // A group prints its ok line only when it added no failure.
  const step = (name: string, run: () => void): void => {
    const before = failures.length;
    run();
    if (failures.length === before) check(name);
  };

  const initial = await page.evaluate(async () => {
    type Win = Window & {
      mtrl: {
        createBadge: (config: Record<string, unknown>) => Badge;
        withBadge: (config: Record<string, unknown>) => (component: { element: HTMLElement }) => { element: HTMLElement; badge?: Badge };
      };
    };
    const w = window as unknown as Win;
    const host = document.getElementById("host")!;
    const stage = document.createElement("div");
    stage.id = "badge-spec";
    host.append(stage);

    const settle = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const round = (n: number): number => Math.round(n * 10) / 10;
    const box = (el: Element): Box => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
    };
    // The corner radius is `full` (9999px), which a 6dp or 16dp box clamps to
    // half its side: 3dp and 8dp on screen.
    const radius = (el: Element): number => {
      const b = box(el);
      return round(Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.width / 2, b.height / 2));
    };
    // The specs measure from the icon's top trailing corner to the badge's
    // bottom leading corner: trailing is right in LTR and left in RTL.
    const distance = (badge: Badge, anchor: HTMLElement, dir: "ltr" | "rtl"): Distance => {
      const b = box(badge.element);
      const a = box(anchor);
      return dir === "rtl"
        ? { horizontal: round(b.right - a.left), vertical: round(b.bottom - a.top) }
        : { horizontal: round(a.right - b.left), vertical: round(b.bottom - a.top) };
    };
    const anchorOf = (): HTMLElement => {
      const el = document.createElement("div");
      el.style.cssText = "width:24px;height:24px;box-sizing:border-box";
      stage.append(el);
      return el;
    };
    const state = (badge: Badge): BadgeState => ({
      visible: badge.isVisible(),
      display: getComputedStyle(badge.element).display,
      text: badge.getLabel(),
    });

    // --- Sizes, radii and placement, factory flavour -------------------------
    document.documentElement.dir = "ltr";
    const largeAnchor = anchorOf();
    const large = w.mtrl.createBadge({ label: 5, target: largeAnchor });
    const smallAnchor = anchorOf();
    const small = w.mtrl.createBadge({ variant: "small", target: smallAnchor });
    const overflowAnchor = anchorOf();
    const overflow = w.mtrl.createBadge({ label: 1250, max: 999, target: overflowAnchor });
    await settle();
    const specs = {
      large: { box: box(large.element), radius: radius(large.element), distance: distance(large, largeAnchor, "ltr"), role: large.element.getAttribute("role") },
      small: { box: box(small.element), radius: radius(small.element), distance: distance(small, smallAnchor, "ltr"), ariaHidden: small.element.getAttribute("aria-hidden") },
      overflow: {
        box: box(overflow.element),
        radius: radius(overflow.element),
        text: overflow.getLabel(),
        maxWidth: getComputedStyle(overflow.element).maxWidth,
        overflowClass: overflow.element.classList.contains("mtrl-badge--overflow"),
      },
    };

    // --- Max -----------------------------------------------------------------
    const maxes: Record<string, { text: string; overflow: boolean }> = {};
    for (const value of [99, 999, 1000, 10000]) {
      const badge = w.mtrl.createBadge({ label: value, max: 999, target: anchorOf() });
      maxes[String(value)] = {
        text: badge.getLabel(),
        overflow: badge.element.classList.contains("mtrl-badge--overflow"),
      };
    }
    await settle();

    // --- Empty and zero, then a real value again -----------------------------
    const empty = w.mtrl.createBadge({ label: "", target: anchorOf() });
    const zero = w.mtrl.createBadge({ label: 0, target: anchorOf() });
    await settle();
    const sequence: Record<string, BadgeState> = {
      'created ""': state(empty),
      "created 0": state(zero),
    };
    empty.setLabel(7);
    sequence["7 after empty"] = state(empty);
    empty.setLabel("");
    sequence['"" after 7'] = state(empty);
    empty.setLabel("0");
    sequence['"0"'] = state(empty);
    zero.setLabel(0);
    sequence["0 via setLabel"] = state(zero);
    zero.setLabel(3);
    sequence["3 after 0"] = state(zero);

    // --- Standalone: the element and the factory -----------------------------
    // `<m-badge>` is "the badge alone, placed by the page like any inline
    // element" (src/elements/badge.ts): its host box is the badge's box.
    const elementHost = document.createElement("m-badge") as HTMLElement & { shadowRoot: ShadowRoot };
    elementHost.setAttribute("label", "5");
    stage.append(elementHost);
    const elementSmall = document.createElement("m-badge") as HTMLElement & { shadowRoot: ShadowRoot };
    elementSmall.setAttribute("variant", "small");
    stage.append(elementSmall);
    const standalone = w.mtrl.createBadge({ label: 5 });
    stage.append(standalone.element);
    const after = document.createElement("span");
    after.textContent = "after";
    stage.append(after);
    await settle();
    const elementInner = elementHost.shadowRoot.firstElementChild as HTMLElement;
    const standaloneStyle = getComputedStyle(standalone.element);
    const standaloneFlow = {
      host: box(elementHost),
      inner: box(elementInner),
      innerPosition: getComputedStyle(elementInner).position,
      smallHost: box(elementSmall),
      factory: box(standalone.element),
      factoryPosition: standaloneStyle.position,
      factoryDisplay: standaloneStyle.display,
      afterLeft: round(box(after).left),
    };

    // --- Right to left: the same distances from the top trailing corner ------
    document.documentElement.dir = "rtl";
    const rtlLargeAnchor = anchorOf();
    const rtlLarge = w.mtrl.createBadge({ label: 5, target: rtlLargeAnchor });
    const rtlSmallAnchor = anchorOf();
    const rtlSmall = w.mtrl.createBadge({ variant: "small", target: rtlSmallAnchor });
    await settle();
    const rtl = {
      large: distance(rtlLarge, rtlLargeAnchor, "rtl"),
      small: distance(rtlSmall, rtlSmallAnchor, "rtl"),
    };
    document.documentElement.dir = "ltr";

    // --- withBadge -----------------------------------------------------------
    const withBadge = w.mtrl.withBadge;
    const button = document.createElement("button");
    button.textContent = "Badge notifications";
    stage.append(button);
    const enhanced = withBadge({ badge: 8 })({ element: button });

    const dotButton = document.createElement("button");
    dotButton.textContent = "Badge starred";
    stage.append(dotButton);
    const dotted = withBadge({ badge: 1, badgeConfig: { variant: "small" } })({ element: dotButton });

    const overflowButton = document.createElement("button");
    overflowButton.textContent = "Badge overflow";
    stage.append(overflowButton);
    const overflowed = withBadge({ badge: 1000, badgeConfig: { max: 999 } })({ element: overflowButton });

    const zeroButton = document.createElement("button");
    zeroButton.textContent = "Badge drafts";
    stage.append(zeroButton);
    const zeroed = withBadge({ badge: 0 })({ element: zeroButton });

    // An existing description survives: only the badge's id is added to it.
    const existingButton = document.createElement("button");
    existingButton.textContent = "Badge existing";
    existingButton.setAttribute("aria-describedby", "badge-existing-help");
    const help = document.createElement("span");
    help.id = "badge-existing-help";
    help.textContent = "Saved yesterday";
    stage.append(existingButton, help);
    const existing = withBadge({ badge: 2 })({ element: existingButton });

    const plainButton = document.createElement("button");
    plainButton.textContent = "Badge plain";
    stage.append(plainButton);
    const plain = withBadge({})({ element: plainButton });

    await settle();
    const describedBy = (el: HTMLElement): string | null => el.getAttribute("aria-describedby");
    const attached = {
      badgePresent: !!enhanced.badge,
      text: enhanced.badge?.getLabel(),
      role: enhanced.badge?.element.getAttribute("role"),
      badgeId: enhanced.badge?.element.id,
      describedBy: describedBy(button),
      dot: { badgePresent: !!dotted.badge, ariaHidden: dotted.badge?.element.getAttribute("aria-hidden"), describedBy: describedBy(dotButton) },
      overflow: { text: overflowed.badge?.getLabel(), describedBy: describedBy(overflowButton) },
      zero: { visible: zeroed.badge?.isVisible(), describedBy: describedBy(zeroButton) },
      existing: { describedBy: describedBy(existingButton), badgeId: existing.badge?.element.id },
      plain: { badgePresent: !!plain.badge, describedBy: describedBy(plainButton) },
    };

    // The sync sequence, driven in later turns so the accessibility tree can
    // be read between them.
    (window as unknown as Record<string, unknown>).__badgeSpec = { enhanced, button };

    return { specs, maxes, sequence, standaloneFlow, rtl, attached };
  });

  type AxNode = { role?: { value: string }; name?: { value: string }; description?: { value: string } };
  const client = await page.context().newCDPSession(page);
  const descriptions = async (): Promise<Record<string, string | null>> => {
    const { nodes } = (await client.send("Accessibility.getFullAXTree")) as { nodes: AxNode[] };
    const read: Record<string, string | null> = {};
    for (const name of ["Badge notifications", "Badge starred", "Badge overflow", "Badge drafts", "Badge existing", "Badge plain"]) {
      const node = nodes.find((n) => n.role?.value === "button" && n.name?.value === name);
      read[name] = node?.description?.value ?? null;
    }
    return read;
  };

  const before = await descriptions();
  const afterZero = await page.evaluate(async () => {
    const spec = (window as unknown as { __badgeSpec: { enhanced: { badge: Badge }; button: HTMLElement } }).__badgeSpec;
    spec.enhanced.badge.setLabel(0);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    return spec.button.getAttribute("aria-describedby");
  });
  const zeroed = await descriptions();
  const afterSix = await page.evaluate(async () => {
    const spec = (window as unknown as { __badgeSpec: { enhanced: { badge: Badge }; button: HTMLElement } }).__badgeSpec;
    spec.enhanced.badge.setLabel(6);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    return { describedBy: spec.button.getAttribute("aria-describedby"), text: spec.enhanced.badge.getLabel() };
  });
  const restored = await descriptions();
  const afterDestroy = await page.evaluate(() => {
    const spec = (window as unknown as { __badgeSpec: { enhanced: { badge: Badge }; button: HTMLElement } }).__badgeSpec;
    spec.enhanced.badge.destroy();
    delete (window as unknown as Record<string, unknown>).__badgeSpec;
    return { describedBy: spec.button.getAttribute("aria-describedby"), inDocument: spec.button.isConnected };
  });
  const destroyed = await descriptions();
  await client.detach();

  const { specs, maxes, sequence, standaloneFlow, rtl, attached } = initial;
  const json = (value: unknown): string => JSON.stringify(value);

  step("badge: 6dp and 16dp, the specs' corner radii, and a 999+ that stays within 16x34dp", () => {
    expect(specs.large.box.width === 16 && specs.large.box.height === 16, `large badge: 16dp for one digit, measured ${specs.large.box.width}dp x ${specs.large.box.height}dp (m3.material.io/components/badges/specs)`);
    expect(specs.large.radius === 8, `large badge: 8dp corner radius, measured ${specs.large.radius}dp`);
    expect(specs.small.box.width === 6 && specs.small.box.height === 6, `small badge: 6dp, measured ${specs.small.box.width}dp x ${specs.small.box.height}dp`);
    expect(specs.small.radius === 3, `small badge: 3dp corner radius, measured ${specs.small.radius}dp`);
    expect(specs.overflow.text === "999+", `1250 with max 999: the label reads "999+", measured ${json(specs.overflow.text)}`);
    expect(specs.overflow.overflowClass && specs.overflow.box.height === 16, `overflow badge: marked and 16dp high, measured ${json({ marked: specs.overflow.overflowClass, height: specs.overflow.box.height })}`);
    expect(specs.overflow.box.width <= 34 && specs.overflow.box.width >= 16 && specs.overflow.maxWidth === "34px", `overflow badge: inside the 16x34dp container, measured ${specs.overflow.box.width}dp with max-width ${specs.overflow.maxWidth}`);
    expect(specs.overflow.radius === 8, `overflow badge: 8dp corner radius, measured ${specs.overflow.radius}dp`);
    expect(specs.large.role === "status" && specs.small.ariaHidden === "true", `large badge is a status and the dot is hidden: ${json({ role: specs.large.role, ariaHidden: specs.small.ariaHidden })}`);
  });

  step("badge: the specs' corner distances, left to right and right to left", () => {
    const at = (d: Distance, horizontal: number, vertical: number): boolean => d.horizontal === horizontal && d.vertical === vertical;
    expect(at(specs.large.distance, 12, 14), `large badge: 14x12dp from the icon's top trailing corner to the badge's bottom leading corner, measured ${json(specs.large.distance)}`);
    expect(at(specs.small.distance, 6, 6), `small badge: 6x6dp from the icon's top trailing corner to the badge's bottom leading corner, measured ${json(specs.small.distance)}`);
    expect(at(rtl.large, 12, 14), `large badge in RTL: 14x12dp from the icon's top trailing (left) corner, measured ${json(rtl.large)}`);
    expect(at(rtl.small, 6, 6), `small badge in RTL: 6x6dp from the icon's top trailing (left) corner, measured ${json(rtl.small)}`);
  });

  step("badge: max caps the label at max+", () => {
    expect(maxes["99"]?.text === "99" && maxes["99"]?.overflow === false, `99 with max 999: "99", measured ${json(maxes["99"])}`);
    expect(maxes["999"]?.text === "999" && maxes["999"]?.overflow === false, `999 with max 999: "999", measured ${json(maxes["999"])}`);
    expect(maxes["1000"]?.text === "999+" && maxes["1000"]?.overflow === true, `1000 with max 999: "999+", measured ${json(maxes["1000"])}`);
    expect(maxes["10000"]?.text === "999+" && maxes["10000"]?.overflow === true, `10000 with max 999: "999+", measured ${json(maxes["10000"])}`);
  });

  step("badge: an empty or zero label shows nothing, and a real value after it shows again", () => {
    const hidden = (s: BadgeState): boolean => !s.visible && s.display === "none";
    expect(hidden(sequence['created ""']!), `created with "": nothing shows, measured ${json(sequence['created ""'])}`);
    expect(hidden(sequence["created 0"]!), `created with 0: nothing shows, measured ${json(sequence["created 0"])}`);
    expect(sequence["7 after empty"]?.visible === true && sequence["7 after empty"]?.text === "7", `setLabel(7) after "": shows "7", measured ${json(sequence["7 after empty"])}`);
    expect(hidden(sequence['"" after 7']!), `setLabel("") after 7: nothing shows, measured ${json(sequence['"" after 7'])}`);
    expect(hidden(sequence['"0"']!), `setLabel("0"): nothing shows, measured ${json(sequence['"0"'])}`);
    expect(hidden(sequence["0 via setLabel"]!), `setLabel(0): nothing shows, measured ${json(sequence["0 via setLabel"])}`);
    expect(sequence["3 after 0"]?.visible === true && sequence["3 after 0"]?.text === "3", `setLabel(3) after 0: shows "3", measured ${json(sequence["3 after 0"])}`);
  });

  step("badge: standalone, the badge takes its place in the flow, element and factory", () => {
    expect(standaloneFlow.host.width === 16 && standaloneFlow.host.height === 16, `<m-badge label="5">: the host is a 16dp badge, measured ${standaloneFlow.host.width}dp x ${standaloneFlow.host.height}dp`);
    expect(standaloneFlow.smallHost.width === 6 && standaloneFlow.smallHost.height === 6, `<m-badge variant="small">: the host is a 6dp dot, measured ${standaloneFlow.smallHost.width}dp x ${standaloneFlow.smallHost.height}dp`);
    expect(standaloneFlow.innerPosition !== "absolute", `<m-badge>: the badge sits in the host's flow, position ${standaloneFlow.innerPosition}`);
    expect(standaloneFlow.factory.width === 16 && standaloneFlow.factory.height === 16, `a standalone factory badge is 16dp, measured ${standaloneFlow.factory.width}dp x ${standaloneFlow.factory.height}dp`);
    expect(standaloneFlow.factoryPosition !== "absolute", `a standalone factory badge is in flow, position ${standaloneFlow.factoryPosition}`);
    expect(standaloneFlow.afterLeft >= standaloneFlow.factory.right - 0.5, `a word after a standalone badge starts after it, at ${standaloneFlow.afterLeft}dp with the badge ending at ${standaloneFlow.factory.right}dp`);
  });

  step("badge: withBadge has the item read the count after its name, and follows what the badge shows", () => {
    expect(attached.badgePresent && attached.text === "8" && attached.role === "status", `withBadge({badge: 8}): a large badge reads "8", got ${json({ present: attached.badgePresent, text: attached.text, role: attached.role })}`);
    expect(!!attached.badgeId && attached.describedBy === attached.badgeId, `the item describes the badge: aria-describedby=${json(attached.describedBy)}, badge id ${json(attached.badgeId)}`);
    expect(before["Badge notifications"] === "8", `the item's description reads the count after its name: ${json(before["Badge notifications"])}`);
    expect(attached.dot.badgePresent && attached.dot.ariaHidden === "true" && attached.dot.describedBy === null, `a dot adds nothing: ${json(attached.dot)}`);
    expect(before["Badge starred"] === null, `a dot adds nothing to the description: ${json(before["Badge starred"])}`);
    expect(attached.overflow.text === "999+" && attached.overflow.describedBy !== null && before["Badge overflow"] === "999+", `a count past the max is read as shown: ${json({ text: attached.overflow.text, description: before["Badge overflow"] })}`);
    expect(attached.zero.visible === false && attached.zero.describedBy === null && before["Badge drafts"] === null, `a zero badge is not described: ${json({ visible: attached.zero.visible, describedBy: attached.zero.describedBy, description: before["Badge drafts"] })}`);
    expect(attached.existing.describedBy === `badge-existing-help ${attached.existing.badgeId}`, `an existing description survives: ${json(attached.existing)}`);
    expect(before["Badge existing"] === "Saved yesterday 2", `the existing description and the count are both read: ${json(before["Badge existing"])}`);
    expect(attached.plain.badgePresent === false && attached.plain.describedBy === null, `no badge for an undefined label: ${json(attached.plain)}`);
    expect(afterZero === null && zeroed["Badge notifications"] === null, `setLabel(0): the description goes with the badge, attribute ${json(afterZero)}, description ${json(zeroed["Badge notifications"])}`);
    expect(afterSix.describedBy === attached.badgeId && restored["Badge notifications"] === "6", `setLabel(6): the description comes back, attribute ${json(afterSix.describedBy)}, description ${json(restored["Badge notifications"])}`);
    expect(afterDestroy.describedBy === null && afterDestroy.inDocument === true && destroyed["Badge notifications"] === null, `destroy: the item stays and the description goes, attribute ${json(afterDestroy.describedBy)}, description ${json(destroyed["Badge notifications"])}`);
  });

  assert.deepEqual(failures, [], `badge, measured against the M3 pages:\n  ${failures.join("\n  ")}`);
}
