import type { KnownMove } from "../preupgrade-moves";

// The server-style HTML scripts/check-preupgrade.ts renders for each element:
// the host and its light DOM, as a framework adapter's server render emits it.
// One case per element in its default configuration, then the attribute
// variants whose box the pre-upgrade styles cover.

const ICON = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";
/** A 4:3 image that needs no request. */
const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23888'/%3E%3C/svg%3E";

export interface PreupgradeCase {
  /** The element, as `elements` keys it in kebab case (`icon-button`). */
  element: string;
  /** The variant, or "default". */
  variant: string;
  html: string;
  /** Consumer typography/layout, outside the element's own styles. */
  style?: string;
  host?: string;
  siblings?: readonly string[];
  width?: number;
  /** Define button/text-field neighbours before measuring a switch upgrade. */
  prepareNeighbors?: boolean;
  strictBox?: boolean;
  knownMoves?: readonly KnownMove[];
}

const c = (element: string, variant: string, html: string): PreupgradeCase => ({ element, variant, html });

export const cases: PreupgradeCase[] = [
  c("button", "default", `<m-button>Save</m-button>`),
  c("button", "size=xs", `<m-button size="xs">Save</m-button>`),
  c("button", "size=m", `<m-button size="m">Save</m-button>`),
  c("button", "size=l", `<m-button size="l">Save</m-button>`),
  c("button", "size=xl", `<m-button size="xl">Save</m-button>`),
  c("button", "variant=outlined", `<m-button variant="outlined">Save</m-button>`),
  c("button", "variant=text", `<m-button variant="text">Save</m-button>`),
  c("button", "icon", `<m-button icon="${ICON}">Save</m-button>`),
  c("button", "size=m icon", `<m-button size="m" icon="${ICON}">Save</m-button>`),
  c("button", "variant=tonal", `<m-button variant="tonal">Save</m-button>`),
  // A text button with a leading icon keeps its box at every size on upgrade.
  c("button", "variant=text icon", `<m-button variant="text" icon="${ICON}">Save</m-button>`),
  c("button", "variant=text size=xs icon", `<m-button variant="text" size="xs" icon="${ICON}">Save</m-button>`),
  c("button", "variant=text size=s icon", `<m-button variant="text" size="s" icon="${ICON}">Save</m-button>`),
  c("button", "variant=text size=m icon", `<m-button variant="text" size="m" icon="${ICON}">Save</m-button>`),
  c("button", "variant=text size=l icon", `<m-button variant="text" size="l" icon="${ICON}">Save</m-button>`),
  c("button", "variant=text size=xl icon", `<m-button variant="text" size="xl" icon="${ICON}">Save</m-button>`),
  c("switch", "default", `<m-switch>Wi-Fi</m-switch>`),
  c("switch", "supporting-text", `<m-switch supporting-text="Saves power">Wi-Fi</m-switch>`),
  c("switch", "checked", `<m-switch checked>Wi-Fi</m-switch>`),
  // No slotted text and no label attribute: the host is the 52 x 48 track box
  // itself, as the upgraded root is.
  c("switch", "unlabelled", `<m-switch aria-label="Switch"></m-switch>`),
  // An empty label attribute matches [label] but the element reads it as no
  // label, so the pre-upgrade rule must size this host too.
  c("switch", "label=''", `<m-switch aria-label="Switch" label=""></m-switch>`),
  // Supporting text and no label: the helper stands where the label would, so
  // the host reserves the labelled 56px row and its 12px gap, not the 52 x 48
  // track box.
  c("switch", "supporting-text no label", `<m-switch aria-label="Switch" supporting-text="Helps"></m-switch>`),
  // An empty supporting-text builds no helper (the element reads it as none,
  // as with `label=""`), so this host is the track box too.
  c("switch", "supporting-text=''", `<m-switch aria-label="Switch" supporting-text=""></m-switch>`),
  // The four track-box families again with the states and the one attribute
  // (the handle icon) that changes the upgraded switch's structure. None of
  // them changes the box: the thumb sits inside the track and the disabled and
  // checked rules are colours and geometry there. `checked`, `disabled` and
  // `icon` on the labelled row are the controls.
  c("switch", "disabled", `<m-switch disabled>Wi-Fi</m-switch>`),
  c("switch", "icon", `<m-switch icon="${ICON}">Wi-Fi</m-switch>`),
  c("switch", "unlabelled checked", `<m-switch checked aria-label="Switch"></m-switch>`),
  c("switch", "unlabelled disabled", `<m-switch disabled aria-label="Switch"></m-switch>`),
  c("switch", "unlabelled icon", `<m-switch icon="${ICON}" aria-label="Switch"></m-switch>`),
  c("switch", "label='' checked", `<m-switch checked aria-label="Switch" label=""></m-switch>`),
  c("switch", "label='' disabled", `<m-switch disabled aria-label="Switch" label=""></m-switch>`),
  c("switch", "label='' icon", `<m-switch icon="${ICON}" aria-label="Switch" label=""></m-switch>`),
  c("switch", "supporting-text no label checked", `<m-switch checked aria-label="Switch" supporting-text="Helps"></m-switch>`),
  c("switch", "supporting-text no label disabled", `<m-switch disabled aria-label="Switch" supporting-text="Helps"></m-switch>`),
  c("switch", "supporting-text no label icon", `<m-switch icon="${ICON}" aria-label="Switch" supporting-text="Helps"></m-switch>`),
  c("switch", "supporting-text='' checked", `<m-switch checked aria-label="Switch" supporting-text=""></m-switch>`),
  c("switch", "supporting-text='' disabled", `<m-switch disabled aria-label="Switch" supporting-text=""></m-switch>`),
  c("switch", "supporting-text='' icon", `<m-switch icon="${ICON}" aria-label="Switch" supporting-text=""></m-switch>`),
  c("tabs", "default", `<m-tabs value="a"><m-tab value="a">Flights</m-tab><m-tab value="b">Trips</m-tab><m-tab value="c">Explore</m-tab></m-tabs>`),
  c("tabs", "icon", `<m-tabs value="a"><m-tab value="a" icon="${ICON}">Flights</m-tab><m-tab value="b" icon="${ICON}">Trips</m-tab></m-tabs>`),
  c("progress", "default", `<m-progress value="40" aria-label="Upload"></m-progress>`),
  c("progress", "variant=circular", `<m-progress variant="circular" value="40" aria-label="Upload"></m-progress>`),
  c("loading-indicator", "default", `<m-loading-indicator aria-label="Loading"></m-loading-indicator>`),
  c("badge", "default", `<m-badge label="3"></m-badge>`),
  c("badge", "small", `<m-badge></m-badge>`),
  c("divider", "default", `<m-divider></m-divider>`),
  c("icon-button", "default", `<m-icon-button icon="${ICON}" aria-label="Favourite"></m-icon-button>`),
  c("icon-button", "size=m", `<m-icon-button size="m" icon="${ICON}" aria-label="Favourite"></m-icon-button>`),
  c("icon-button", "size=xs", `<m-icon-button size="xs" icon="${ICON}" aria-label="Favourite"></m-icon-button>`),
  c("icon-button", "width=wide", `<m-icon-button width="wide" icon="${ICON}" aria-label="Favourite"></m-icon-button>`),
  c("icon-button", "size=l width=narrow", `<m-icon-button size="l" width="narrow" icon="${ICON}" aria-label="Favourite"></m-icon-button>`),
  c("fab", "default", `<m-fab icon="${ICON}" aria-label="Add"></m-fab>`),
  c("fab", "size=large", `<m-fab size="large" icon="${ICON}" aria-label="Add"></m-fab>`),
  c("fab-menu", "default", `<m-fab-menu icon="${ICON}" aria-label="Compose"><m-fab-menu-item value="r">Reply</m-fab-menu-item><m-fab-menu-item value="f">Forward</m-fab-menu-item></m-fab-menu>`),
  c("fab-menu", "size=medium color=tertiary", `<m-fab-menu size="medium" color="tertiary" icon="${ICON}" aria-label="Compose"><m-fab-menu-item value="r">Reply</m-fab-menu-item><m-fab-menu-item value="f">Forward</m-fab-menu-item></m-fab-menu>`),
  c("extended-fab", "default", `<m-extended-fab icon="${ICON}">Compose</m-extended-fab>`),
  c("extended-fab", "size=large", `<m-extended-fab size="large" icon="${ICON}">Compose</m-extended-fab>`),
  c("checkbox", "default", `<m-checkbox>Agree</m-checkbox>`),
  c("checkbox", "checked label-position=start", `<m-checkbox checked label-position="start">Agree</m-checkbox>`),
  // No slotted text and no label attribute: the host is the 48px target itself,
  // as the upgraded root is.
  c("checkbox", "unlabelled", `<m-checkbox aria-label="Agree"></m-checkbox>`),
  // An empty label attribute matches [label] but the element reads it as no
  // label, so the pre-upgrade rule must centre this host too.
  c("checkbox", "label=''", `<m-checkbox aria-label="Agree" label=""></m-checkbox>`),
  c("slider", "default", `<m-slider value="40" aria-label="Volume"></m-slider>`),
  c("text-field", "default", `<m-text-field label="Name"></m-text-field>`),
  c("text-field", "variant=outlined", `<m-text-field variant="outlined" label="Name"></m-text-field>`),
  c("text-field", "supporting-text", `<m-text-field label="Name" supporting-text="As on your passport"></m-text-field>`),
  // FLO-300: the supporting text row under the field, reserved before upgrade
  c("text-field", "outlined supporting-text", `<m-text-field variant="outlined" label="Name" supporting-text="As on your passport"></m-text-field>`),
  c("text-field", "maxlength (counter)", `<m-text-field label="Name" maxlength="20"></m-text-field>`),
  c("text-field", "compact supporting-text", `<m-text-field density="compact" label="Name" supporting-text="Help"></m-text-field>`),
  c("text-field", "value", `<m-text-field label="Name" value="Ada"></m-text-field>`),
  c("text-field", "density=compact", `<m-text-field density="compact" label="Name"></m-text-field>`),
  c("text-field", "outlined compact value", `<m-text-field variant="outlined" density="compact" label="Name" value="Ada"></m-text-field>`),
  c("text-field", "width set by the page", `<m-text-field label="Name" style="width:300px"></m-text-field>`),
  // FLO-299: without a label the text is centred, in both densities
  c("text-field", "no label value", `<m-text-field aria-label="Name" value="Ada"></m-text-field>`),
  c("text-field", "no label compact value", `<m-text-field density="compact" aria-label="Name" value="Ada"></m-text-field>`),
  c("text-field", "no label outlined value", `<m-text-field variant="outlined" aria-label="Name" value="Ada"></m-text-field>`),
  // FLO-425: the multiline box is the textarea's, not the single-line field's
  c("text-field", "type=multiline", `<m-text-field label="Name" type="multiline"></m-text-field>`),
  c("text-field", "type=multiline value", `<m-text-field label="Name" type="multiline" value="Ada"></m-text-field>`),
  c("text-field", "type=multiline no label", `<m-text-field type="multiline" aria-label="Name"></m-text-field>`),
  c("text-field", "type=multiline variant=outlined", `<m-text-field variant="outlined" label="Name" type="multiline"></m-text-field>`),
  c("text-field", "type=multiline outlined value", `<m-text-field variant="outlined" label="Name" type="multiline" value="Ada"></m-text-field>`),
  c("text-field", "type=multiline supporting-text", `<m-text-field label="Name" type="multiline" supporting-text="As on your passport"></m-text-field>`),
  c("text-field", "type=multiline outlined supporting-text", `<m-text-field variant="outlined" label="Name" type="multiline" supporting-text="As on your passport"></m-text-field>`),
  c("text-field", "type=multiline maxlength", `<m-text-field label="Name" type="multiline" maxlength="20"></m-text-field>`),
  c("text-field", "type=multiline density=compact", `<m-text-field density="compact" label="Name" type="multiline"></m-text-field>`),
  c("text-field", "type=multiline compact value", `<m-text-field density="compact" label="Name" type="multiline" value="Ada"></m-text-field>`),
  c("text-field", "type=multiline compact outlined", `<m-text-field density="compact" variant="outlined" label="Name" type="multiline"></m-text-field>`),
  c("text-field", "type=multiline compact supporting-text", `<m-text-field density="compact" label="Name" type="multiline" supporting-text="Help"></m-text-field>`),
  c("text-field", "type=multiline compact outlined supporting-text", `<m-text-field density="compact" variant="outlined" label="Name" type="multiline" supporting-text="Help"></m-text-field>`),
  c("radios", "default", `<m-radios value="a" aria-label="Size"><m-radio value="a">Small</m-radio><m-radio value="b">Medium</m-radio><m-radio value="c">Large</m-radio></m-radios>`),
  c("radios", "direction=horizontal", `<m-radios direction="horizontal" value="a" aria-label="Size"><m-radio value="a">Small</m-radio><m-radio value="b">Medium</m-radio><m-radio value="c">Large</m-radio></m-radios>`),
  c("navigation-bar", "default", `<m-navigation-bar value="home" aria-label="Main"><m-navigation-bar-item value="home" icon="${ICON}">Home</m-navigation-bar-item><m-navigation-bar-item value="search" icon="${ICON}">Search</m-navigation-bar-item><m-navigation-bar-item value="library" icon="${ICON}" badge="3">Library</m-navigation-bar-item></m-navigation-bar>`),
  c("navigation-rail", "default", `<m-navigation-rail value="inbox" aria-label="Main"><m-navigation-rail-item value="inbox" icon="${ICON}">Inbox</m-navigation-rail-item><m-navigation-rail-item value="sent" icon="${ICON}">Sent</m-navigation-rail-item><m-navigation-rail-item value="starred" icon="${ICON}">Starred</m-navigation-rail-item></m-navigation-rail>`),
  c("drawer", "default", `<m-drawer value="inbox" aria-label="Mail"><m-drawer-item value="inbox" icon="${ICON}">Inbox</m-drawer-item><m-drawer-item value="sent" icon="${ICON}">Sent</m-drawer-item></m-drawer>`),
  c("drawer", "open", `<m-drawer open value="inbox" aria-label="Mail"><m-drawer-item value="inbox" icon="${ICON}">Inbox</m-drawer-item><m-drawer-item value="sent" icon="${ICON}">Sent</m-drawer-item></m-drawer>`),
  c("top-app-bar", "default", `<m-top-app-bar>Title</m-top-app-bar>`),
  c("top-app-bar", "type=medium", `<m-top-app-bar type="medium">Title</m-top-app-bar>`),
  c("top-app-bar", "type=center", `<m-top-app-bar type="center">Title</m-top-app-bar>`),
  c("top-app-bar", "type=large", `<m-top-app-bar type="large">Title</m-top-app-bar>`),
  c("bottom-app-bar", "default", `<m-bottom-app-bar><m-icon-button icon="${ICON}" aria-label="Search"></m-icon-button></m-bottom-app-bar>`),
  c("toolbar", "default", `<m-toolbar aria-label="Actions"><m-icon-button icon="${ICON}" aria-label="Archive"></m-icon-button><m-icon-button icon="${ICON}" aria-label="Delete"></m-icon-button><m-icon-button icon="${ICON}" aria-label="Label"></m-icon-button></m-toolbar>`),
  c("toolbar", "variant=floating", `<m-toolbar variant="floating" aria-label="Formatting"><m-icon-button icon="${ICON}" aria-label="Bold"></m-icon-button><m-icon-button icon="${ICON}" aria-label="Italic"></m-icon-button></m-toolbar>`),
  c("button-group", "default", `<m-button-group aria-label="Actions"><m-button-group-item value="a">One</m-button-group-item><m-button-group-item value="b">Two</m-button-group-item><m-button-group-item value="c">Three</m-button-group-item></m-button-group>`),
  c("chips", "default", `<m-chips aria-label="Diet"><m-chip value="veg">Vegetarian</m-chip><m-chip value="gf">Gluten free</m-chip></m-chips>`),
  c("chips", "wrapping", `<m-chips aria-label="Diet"><m-chip value="veg">Vegetarian</m-chip><m-chip value="gf">Gluten free</m-chip><m-chip value="df">Dairy free</m-chip><m-chip value="nf">Nut free</m-chip><m-chip value="h">Halal</m-chip></m-chips>`),
  c("list", "default", `<m-list value="b" aria-label="Fruit"><m-list-item value="a">Apple</m-list-item><m-list-item value="b">Banana</m-list-item><m-list-item value="c">Cherry</m-list-item></m-list>`),
  c("list", "two-line, divider, subheader", `<m-list aria-label="Mail"><m-list-item kind="subheader">Today</m-list-item><m-list-item value="a" supporting-text="Lunch?">Ada</m-list-item><m-list-item kind="divider"></m-list-item><m-list-item value="b" overline="Work">Grace</m-list-item></m-list>`),
  c("card", "default", `<m-card headline="Title" subhead="Subhead">Supporting text for the card.</m-card>`),
  c("card", "variant=outlined headline", `<m-card variant="outlined" headline="Title">Supporting text for the card.</m-card>`),
  c("carousel", "default", `<m-carousel aria-label="Photos" style="height:200px"><m-carousel-item src="${IMAGE}" alt="One">One</m-carousel-item><m-carousel-item src="${IMAGE}" alt="Two">Two</m-carousel-item><m-carousel-item src="${IMAGE}" alt="Three">Three</m-carousel-item></m-carousel>`),
  c("menu", "default", `<m-menu anchor="nowhere"><m-menu-item value="a">Copy</m-menu-item><m-menu-item value="b">Paste</m-menu-item></m-menu>`),
  c("select", "default", `<m-select label="Pet" value="cat"><m-select-option value="cat">Cat</m-select-option><m-select-option value="dog">Dog</m-select-option></m-select>`),
  c("select", "variant=outlined", `<m-select variant="outlined" label="Pet"><m-select-option value="cat">Cat</m-select-option></m-select>`),
  c("select", "supporting-text", `<m-select label="Pet" supporting-text="Pick one"><m-select-option value="cat">Cat</m-select-option></m-select>`),
  c("split-button", "default", `<m-split-button>Send<m-menu-item value="later">Send later</m-menu-item></m-split-button>`),
  c("tooltip", "default", `<m-tooltip for="nowhere">Help text</m-tooltip>`),
  c("snackbar", "default", `<m-snackbar>Message sent</m-snackbar>`),
  c("dialog", "default", `<m-dialog headline="Discard draft?">Your changes will be lost.</m-dialog>`),
  c("dialog", "open", `<m-dialog open headline="Discard draft?">Your changes will be lost.</m-dialog>`),
  c("bottom-sheet", "default", `<m-bottom-sheet headline="Share">Content</m-bottom-sheet>`),
  c("side-sheet", "default", `<m-side-sheet headline="Filters">Content</m-side-sheet>`),
  c("datepicker", "default", `<m-datepicker label="Due" value="2026-09-10"></m-datepicker>`),
  c("timepicker", "default", `<m-timepicker label="Alarm" value="07:30"></m-timepicker>`),
  c("search", "default", `<m-search placeholder="Search" aria-label="Search"><m-search-suggestion value="apple">Apple</m-search-suggestion></m-search>`),
  c("search", "value", `<m-search placeholder="Search" value="apple" aria-label="Search"></m-search>`),
];


// The host and neighbours must remain stable outside the default body type.
// Five content families, both directions, inline flow and both flex alignments.
const switchFamilies = ["default", "supporting-text", "unlabelled", "supporting-text no label", "supporting-text=''"];
const switchRows = cases.filter(c => c.element === "switch");
for (const dir of ["ltr", "rtl"]) {
  for (const typography of ["default", "12/1", "12/2", "24/1", "24/2"]) {
    const [size, height] = typography.split("/");
    const style = typography === "default" ? "" : `font-size:${size}px;line-height:${height}`;
    for (const layout of ["inline", "baseline", "center"]) {
      for (const row of switchRows.filter(row => switchFamilies.includes(row.variant))) {
        const host = row.html.replace("<m-switch", '<m-switch id="subject"');
        const inline = layout === "inline";
        cases.push({
          element: "switch", variant: `${row.variant}; ${dir}; ${layout}; ${typography}`,
          html: `<div dir="${dir}" style="${inline ? "" : `display:flex;gap:16px;align-items:${layout}`}">${inline ? '<span id="lead">Text before </span>' : ""}${host}${inline ? '<span id="next"> text after</span>' : '<m-button id="button">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field>'}</div>`,
          style, width: 850, host: "#subject", strictBox: true,
          siblings: inline ? ["#lead", "#next", "#block"] : ["#button", "#field", "#block"],
          prepareNeighbors: !inline,
        });
      }
    }
    // All controls upgrade together here: the button's own baseline is a
    // separate follow-up, rather than a reason to weaken the switch-only rows.
    cases.push({
      element: "switch", variant: `peer upgrades; ${dir}; baseline; ${typography}`,
      html: `<div dir="${dir}" style="display:flex;gap:16px;align-items:baseline"><m-switch id="subject" aria-label="Switch"></m-switch><m-button id="button">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field></div>`,
      style, width: 850, host: "#subject", strictBox: true, siblings: ["#button", "#field", "#block"],
      knownMoves: [{ sibling: "#button", axis: "y",
        value: ({ default: 1.296875, "12/1": 1.828125, "12/2": 1.828125, "24/1": -1.34375, "24/2": -7 } as Record<string, number>)[typography],
        reason: "Button pre-upgrade baseline under consumer typography: floor/material#42." }],
    });
  }
  // State-specific controls at the typography that exposed the host line box.
  for (const row of switchRows.filter(row => /(?:checked|disabled|icon)$/.test(row.variant) && row.variant.includes("unlabelled"))) {
    cases.push({ ...row, variant: `${row.variant}; ${dir}; 24/2`,
      html: `<div dir="${dir}">${row.html.replace("<m-switch", '<m-switch id="subject"')}<span id="next">Next</span></div>`,
      style: "font-size:24px;line-height:2", host: "#subject", siblings: ["#next", "#block"], strictBox: true });
  }
  for (const element of ["button", "text-field"]) {
    const row = cases.find(row => row.element === element && row.variant === "default")!;
    const button = element === "button";
    const reason = button
      ? "Button host grows at 24px/2: floor/material#42."
      : "Text field host grows at 24px/2: floor/material#43.";
    const knownMoves: KnownMove[] = ["#inline", "#block"].map(sibling => ({
      sibling, axis: "y" as const, value: button ? 8 : 1.5, reason,
    }));
    if (button) knownMoves.push({ subject: true, value: 8, reason });
    cases.push({ ...row, variant: `${dir}; 24/2`,
      html: `<div style="display:flex">${row.html.replace(`<m-${element}`, `<m-${element} id="subject" dir="${dir}"`)}</div>`,
      host: "#subject", width: 850, style: "font-size:24px;line-height:2",
      knownMoves });
  }
}
