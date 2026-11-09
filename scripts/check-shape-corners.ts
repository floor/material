import assert from "node:assert/strict";
import type { Page } from "playwright";

/**
 * The two corner fixes of the shape audit. Both are stylesheet-only, so a unit
 * test cannot see them: what was wrong is which shape step a rule resolved to.
 * Each check reads the rendered box's computed radius against the system's own
 * corner token (`:root`, base/_tokens.scss), so a theme that overrides
 * --mtrl-sys-shape-corner-* moves both sides together and neither is a px
 * value copied beside the rule.
 */
export async function checkShapeCorners(page: Page, check: (name: string) => void): Promise<void> {
  const read = await page.evaluate(async () => {
    type Win = Window & { mtrl: { createList: (config: object) => { element: HTMLElement } } };
    const host = document.getElementById("host")!;
    const settled = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const corners = (element: Element): string => {
      const style = getComputedStyle(element);
      return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].join(" ");
    };
    const token = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

    // Lists: M3 gives image and video one leading media slot, and its shape
    // token is the same step for both. The video already took it; the image
    // has to match it rather than stay square.
    const image = document.createElement("img");
    image.src = "/away";
    image.alt = "";
    const video = document.createElement("video");
    const list = (window as unknown as Win).mtrl.createList({
      ariaLabel: "media",
      items: [
        { id: "image", headline: "Image", leading: { type: "image", content: image } },
        { id: "video", headline: "Video", leading: { type: "video", content: video } },
      ],
    });
    host.replaceChildren(list.element);
    await settled();
    const root = (list.element.classList.contains("mtrl-list")
      ? list.element
      : (list.element.shadowRoot?.querySelector(".mtrl-list") ?? list.element.querySelector(".mtrl-list"))) as HTMLElement | null;
    if (!root) throw new Error("the list rendered no .mtrl-list root");
    const media = ["image", "video"].map((type) => {
      const box = root.querySelector(`[class*="list__leading--${type}"]`) as HTMLElement | null;
      if (!box) throw new Error(`the list rendered no leading ${type}`);
      return { type, corners: corners(box) };
    });

    // Time pickers: the dialog's actions are text buttons. M3's buttons spec
    // gives the round (default) shape Full at every size.
    host.innerHTML = `<m-timepicker value="09:30"></m-timepicker>`;
    const picker = (host.querySelector("m-timepicker") as HTMLElement & {
      component: { picker: { open: () => void; close: () => void; dialogElement: HTMLElement } };
    }).component.picker;
    picker.open();
    await settled();
    const action = (suffix: string): string => {
      const button = picker.dialogElement.querySelector(`[class$="time-picker__${suffix}"]`) as HTMLElement | null;
      if (!button) throw new Error(`the time picker dialog rendered no ${suffix} button`);
      return corners(button);
    };
    const pickerCorners = { cancel: action("cancel"), confirm: action("confirm") };
    picker.close();
    host.replaceChildren();

    return { small: token("--mtrl-sys-shape-corner-small"), full: token("--mtrl-sys-shape-corner-full"), media, pickerCorners };
  });

  // A corner token is one value; the shorthand on the box is the same value
  // four times, so compare the token expanded to the four corners.
  const four = (value: string): string => Array(4).fill(value).join(" ");
  const failures: string[] = [];
  for (const row of read.media) {
    if (row.corners !== four(read.small)) failures.push(`list leading ${row.type}: computed radius ${row.corners}, the small corner token is ${read.small}`);
  }
  if (read.media.length !== 2) failures.push(`list: ${read.media.length} leading media boxes rendered, expected the image and the video`);
  for (const [name, value] of Object.entries(read.pickerCorners)) {
    if (value !== four(read.full)) failures.push(`time picker ${name}: computed radius ${value}, the full corner token is ${read.full}`);
  }
  for (const line of failures) console.log(`  FAIL ${line}`);
  assert.deepEqual(failures, []);
  check("list: the leading image and the leading video both take the small corner token");
  check("time picker: the dialog's cancel and confirm take the full corner token");
}
