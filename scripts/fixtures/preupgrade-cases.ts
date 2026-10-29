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
  /** Define button/text-field neighbours (and switch for tabs) before measuring. */
  prepareNeighbors?: boolean;
  strictBox?: boolean;
  /**
   * The host's own height, whatever the page's typography: the control's box
   * that the upgraded host and its pre-upgrade rule must both be.
   */
  hostHeight?: number;
  /** How long to let timers run after the upgrade; the six host rows upgrade synchronously. */
  settleMs?: number;
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
  // A multi-digit label is as wide as the badge's on upgrade: the pre-upgrade
  // rule draws it from the label attribute.
  c("badge", "label=999+", `<m-badge label="999+"></m-badge>`),
  // The dot is its own 6dp box, whether or not it carries a label.
  c("badge", "variant=small", `<m-badge variant="small"></m-badge>`),
  // An empty or zero large badge hides on upgrade, so it reserves no box.
  c("badge", "empty", `<m-badge></m-badge>`),
  c("badge", "label=0", `<m-badge label="0"></m-badge>`),
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
  // Without a label the host is the container's row itself, and the size names
  // lift the container above the 48px minimum from M up (52/68/108), so every
  // size reserves its own height. The element reads a size name in any case
  // (`xs` to `xl`) or a pixel height.
  c("slider", "size=xs", `<m-slider size="xs" value="40" aria-label="Volume"></m-slider>`),
  c("slider", "size=s", `<m-slider size="s" value="40" aria-label="Volume"></m-slider>`),
  c("slider", "size=m", `<m-slider size="m" value="40" aria-label="Volume"></m-slider>`),
  c("slider", "size=l", `<m-slider size="l" value="40" aria-label="Volume"></m-slider>`),
  c("slider", "size=xl", `<m-slider size="xl" value="40" aria-label="Volume"></m-slider>`),
  // A label builds a body-large line and a 4px gutter over the container's row.
  // `label-position` is start (the default) or end. An icon adds a 40px column,
  // which the container's row already covers. An empty `label=""` builds no
  // label, as `supporting-text=""` builds none on the switch.
  c("slider", "label", `<m-slider label="Volume" value="40"></m-slider>`),
  c("slider", "label label-position=start", `<m-slider label="Volume" label-position="start" value="40"></m-slider>`),
  c("slider", "label label-position=end", `<m-slider label="Volume" label-position="end" value="40"></m-slider>`),
  c("slider", "label size=xs", `<m-slider label="Volume" size="xs" value="40"></m-slider>`),
  c("slider", "label size=s", `<m-slider label="Volume" size="s" value="40"></m-slider>`),
  c("slider", "label size=m", `<m-slider label="Volume" size="m" value="40"></m-slider>`),
  c("slider", "label size=l", `<m-slider label="Volume" size="l" value="40"></m-slider>`),
  c("slider", "label size=xl", `<m-slider label="Volume" size="xl" value="40"></m-slider>`),
  c("slider", "label icon", `<m-slider label="Volume" icon="${ICON}" value="40"></m-slider>`),
  c("slider", "label=''", `<m-slider aria-label="Volume" label="" value="40"></m-slider>`),
  c("text-field", "default", `<m-text-field label="Name"></m-text-field>`),
  c("text-field", "variant=outlined", `<m-text-field variant="outlined" label="Name"></m-text-field>`),
  c("text-field", "supporting-text", `<m-text-field label="Name" supporting-text="As on your passport"></m-text-field>`),
  // The supporting text row under the field, reserved before upgrade
  c("text-field", "outlined supporting-text", `<m-text-field variant="outlined" label="Name" supporting-text="As on your passport"></m-text-field>`),
  c("text-field", "maxlength (counter)", `<m-text-field label="Name" maxlength="20"></m-text-field>`),
  c("text-field", "compact supporting-text", `<m-text-field density="compact" label="Name" supporting-text="Help"></m-text-field>`),
  c("text-field", "value", `<m-text-field label="Name" value="Ada"></m-text-field>`),
  c("text-field", "density=compact", `<m-text-field density="compact" label="Name"></m-text-field>`),
  c("text-field", "outlined compact value", `<m-text-field variant="outlined" density="compact" label="Name" value="Ada"></m-text-field>`),
  c("text-field", "width set by the page", `<m-text-field label="Name" style="width:300px"></m-text-field>`),
  // A password paints no value (public issue #53): its box is the empty
  // password field's, so nothing moves when the masked input arrives.
  c("text-field", "type=password", `<m-text-field label="Password" type="password"></m-text-field>`),
  c("text-field", "type=password value", `<m-text-field label="Password" type="password" value="hunter2"></m-text-field>`),
  c("text-field", "type=PASSWORD value", `<m-text-field label="Password" type="PASSWORD" value="hunter2"></m-text-field>`),
  c("text-field", "type=Password value", `<m-text-field label="Password" type="Password" value="hunter2"></m-text-field>`),
  // A hidden field paints no value either, and takes no space at all — before
  // upgrade (this rule) or after (the upgraded host's own rule) — so the token
  // cannot leak and nothing moves at upgrade.
  c("text-field", "type=hidden", `<m-text-field type="hidden"></m-text-field>`),
  c("text-field", "type=hidden value", `<m-text-field type="hidden" value="synthetic-token"></m-text-field>`),
  c("text-field", "type=HIDDEN value", `<m-text-field type="HIDDEN" value="synthetic-token"></m-text-field>`),
  // Without a label the text is centred, in both densities
  c("text-field", "no label value", `<m-text-field aria-label="Name" value="Ada"></m-text-field>`),
  c("text-field", "no label compact value", `<m-text-field density="compact" aria-label="Name" value="Ada"></m-text-field>`),
  c("text-field", "no label outlined value", `<m-text-field variant="outlined" aria-label="Name" value="Ada"></m-text-field>`),
  // The multiline box is the textarea's, not the single-line field's
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
    // All controls upgrade together here, as on a real page: every one of them
    // must hold the box and baseline it reserved, so no sibling move is known.
    cases.push({
      element: "switch", variant: `peer upgrades; ${dir}; baseline; ${typography}`,
      html: `<div dir="${dir}" style="display:flex;gap:16px;align-items:baseline"><m-switch id="subject" aria-label="Switch"></m-switch><m-button id="button">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field></div>`,
      style, width: 850, host: "#subject", strictBox: true, siblings: ["#button", "#field", "#block"],
    });
    // The same row with a leading icon: an inline-flex host exposes its first
    // item's baseline, which is the icon's here, not the label's. Both sides of
    // the upgrade must expose that one baseline, so the icon twin is measured
    // beside the label twin rather than assumed to agree with it.
    cases.push({
      element: "switch", variant: `peer upgrades; ${dir}; baseline; ${typography}; button icon`,
      html: `<div dir="${dir}" style="display:flex;gap:16px;align-items:baseline"><m-switch id="subject" aria-label="Switch"></m-switch><m-button id="button" icon="${ICON}">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field></div>`,
      style, width: 850, host: "#subject", strictBox: true, siblings: ["#button", "#field", "#block"],
    });
  }
  // The baseline move scales with the control's height: 1.3 px at xs growing
  // to 7.3 px at xl on main (floor/material#50's measurements — the offset
  // between an inline-block's last-line baseline and the reserved box's
  // first-item baseline grows as the label sits further from either edge).
  // Measure each size's twin, so the fix is shown at every height rather
  // than inferred from the default size.
  for (const size of ["xs", "m", "l", "xl"]) {
    cases.push({
      element: "switch", variant: `peer upgrades; ${dir}; baseline; default; button size=${size}`,
      html: `<div dir="${dir}" style="display:flex;gap:16px;align-items:baseline"><m-switch id="subject" aria-label="Switch"></m-switch><m-button id="button" size="${size}">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field></div>`,
      width: 850, host: "#subject", strictBox: true, siblings: ["#button", "#field", "#block"],
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
    cases.push({ ...row, variant: `${dir}; 24/2`,
      html: `<div style="display:flex">${row.html.replace(`<m-${element}`, `<m-${element} id="subject" dir="${dir}"`)}</div>`,
      host: "#subject", width: 850, style: "font-size:24px;line-height:2" });
  }
  // The icon button's host under the same tall line height: the leading icon
  // must not change the reservation the text button keeps.
  for (const variant of ["icon", "size=m icon"]) {
    const row = cases.find(row => row.element === "button" && row.variant === variant)!;
    cases.push({ ...row, variant: `${variant}; ${dir}; 24/2`,
      html: `<div style="display:flex">${row.html.replace("<m-button", '<m-button id="subject" dir="' + dir + '"')}</div>`,
      host: "#subject", width: 850, style: "font-size:24px;line-height:2" });
  }
  // The xs control is the one remaining height the tall line box can outgrow
  // (32 px under the 48 px strut at 24/2; m, l and xl stand taller than the
  // strut both sides of the upgrade): its host must keep the reservation
  // exactly as the s-size twin does.
  {
    const row = cases.find(row => row.element === "button" && row.variant === "size=xs")!;
    cases.push({ ...row, variant: `size=xs; ${dir}; 24/2`,
      html: `<div style="display:flex">${row.html.replace("<m-button", '<m-button id="subject" dir="' + dir + '"')}</div>`,
      host: "#subject", width: 850, style: "font-size:24px;line-height:2" });
  }
}

// Tabs must expose the same baseline as their empty reserved box. Measure the
// issue's baseline row both with settled neighbours and with a shared upgrade;
// a stable height alone misses the host and the whole row moving vertically.
for (const dir of ["ltr", "rtl"]) {
  for (const typography of ["default", "12/1", "12/2", "24/1", "24/2"]) {
    const [size, line] = typography.split("/");
    for (const icon of [false, true]) {
      for (const prepareNeighbors of [false, true]) {
        cases.push({
          element: "tabs",
          variant: `baseline; ${dir}; ${typography}; ${icon ? "icon" : "text"}; ${prepareNeighbors ? "tabs upgrade" : "peer upgrades"}`,
          html: `<div dir="${dir}" style="display:flex;gap:8px;align-items:baseline"><m-tabs id="subject" value="a" style="width:360px;flex-shrink:0"><m-tab value="a"${icon ? ` icon="${ICON}"` : ""}>Flights</m-tab><m-tab value="b">Trips</m-tab><m-tab value="c">Explore</m-tab></m-tabs><m-switch id="switch">Wi-Fi</m-switch><m-text-field id="field" label="Name"></m-text-field></div>`,
          style: typography === "default" ? "" : `font-size:${size}px;line-height:${line}`,
          width: 850, host: "#subject", siblings: ["#switch", "#field", "#inline", "#block"],
          strictBox: true, hostHeight: icon ? 64 : 48, settleMs: 100, prepareNeighbors,
        });
      }
    }
  }
}

// The default text group keeps its baseline and inherited line box. Keep
// formatted markup too: whitespace between items must not add inline width.
const buttonGroup = cases.find(row => row.element === "button-group" && row.variant === "default")!;
for (const dir of ["ltr", "rtl"]) {
  for (const typography of ["default", "24/2"]) {
    for (const formatted of [false, true]) {
      const html = formatted
        ? buttonGroup.html.replaceAll("><m-button-group-item", ">\n  <m-button-group-item").replace("</m-button-group>", "\n</m-button-group>")
        : buttonGroup.html;
      cases.push({
        ...buttonGroup, variant: `${dir}; ${typography}; ${formatted ? "formatted" : "compact"}`,
        html, style: `direction:${dir};${typography === "default" ? "" : "font-size:24px;line-height:2"}`,
        strictBox: true,
      });
    }
  }
}

// The upgraded host is the control's own flex box: neither its box nor the
// baseline of a neighbour on its line may follow the page's line height.
// Every host, in inline flow and in a baseline flex row. Height is a vertical
// measure, so rtl repeats ltr only at the page default and at the one line
// box taller than the smallest control (24px/2); the other typographies stay
// in ltr, where the defect and its mirror are visible.
const ownBoxHosts: Record<string, number> = {
  "icon-button": 40, "button-group": 40, "split-button": 40, datepicker: 96, checkbox: 48, select: 56,
  // Three 48px rows: the default (vertical) group.
  radios: 144,
};
for (const [element, height] of Object.entries(ownBoxHosts)) {
  const row = cases.find(c => c.element === element && c.variant === "default")!;
  for (const dir of ["ltr", "rtl"]) {
    const typographies = dir === "ltr" ? ["default", "12/1", "12/2", "24/1", "24/2"] : ["default", "24/2"];
    for (const typography of typographies) {
      const [size, line] = typography.split("/");
      const style = typography === "default" ? "" : `font-size:${size}px;line-height:${line}`;
      for (const layout of ["inline", "baseline"]) {
        const inline = layout === "inline";
        const host = row.html.replace(`<m-${element}`, `<m-${element} id="subject"`);
        cases.push({
          element, variant: `${row.variant}; ${dir}; ${layout}; ${typography}`,
          html: `<div dir="${dir}" style="${inline ? "" : "display:flex;gap:16px;align-items:baseline"}">${inline ? '<span id="lead">Text before </span>' : ""}${host}${inline ? '<span id="next"> text after</span>' : '<m-button id="button">Save</m-button><m-text-field id="field" label="Name" value="Ada"></m-text-field>'}</div>`,
          style, width: 850, host: "#subject", strictBox: true, hostHeight: height, settleMs: 100,
          siblings: inline ? ["#lead", "#next", "#inline", "#block"] : ["#button", "#field", "#inline", "#block"],
          prepareNeighbors: !inline,
        });
      }
    }
  }
}

// A horizontal group's row is its options plus the 16px the component puts
// between them (components/_radios.scss); content-sized in a baseline row, the
// host is 16px wider per gap after upgrade. With the three options below the
// row reads 290.3px before and 322.3px after, and everything after it moves
// 32px (floor/material#129). Both directions, compact and indented markup.
const horizontalRadios = cases.find((c) => c.element === "radios" && c.variant === "direction=horizontal")!;
for (const dir of ["ltr", "rtl"] as const) {
  for (const formatted of [false, true]) {
    const group = horizontalRadios.html
      .replace("<m-radios", '<m-radios id="subject"');
    const html = formatted
      ? group.replaceAll("><m-radio", ">\n  <m-radio").replace("</m-radios>", "\n</m-radios>")
      : group;
    cases.push({
      ...horizontalRadios, variant: `direction=horizontal; ${dir}; baseline; ${formatted ? "formatted" : "compact"}`,
      html: `<div dir="${dir}" style="display:flex;gap:8px;align-items:baseline">${html}<span id="next">Next</span></div>`,
      width: 850, host: "#subject", strictBox: true, hostHeight: 48, settleMs: 100,
      siblings: ["#next", "#inline", "#block"],
    });
  }
}

// An empty group holds no row and no baseline: the strut that reserves the
// populated group's baseline must not make one where there are no items.
// Unguarded it gives the zero-height host a baseline 34px down, the row is
// 36px before upgrade and 12px after, and the text and following block move
// up 24px. Both directions.
for (const direction of ["vertical", "horizontal"] as const) {
  cases.push({
    element: "radios", variant: `empty; ${direction}; baseline; 12/1`,
    html: `<div style="display:flex;align-items:baseline;gap:8px"><m-radios id="subject" aria-label="Size"${direction === "horizontal" ? ' direction="horizontal"' : ""}></m-radios><span id="next">Next</span></div>`,
    style: "font-size:12px;line-height:1",
    width: 850, host: "#subject", strictBox: true, settleMs: 100,
    siblings: ["#next", "#inline", "#block"],
  });
}

// Indented markup is the normal authoring shape: a group whose only content is
// a newline and spaces has no option, and `:empty` does not see it (CSS counts
// formatting whitespace as content). The strut must follow an actual option,
// not the absence of children; otherwise this row reads 36px before upgrade
// and 12px after, and the text and following block move up 24px, as the
// compact empty tag did.
for (const dir of ["ltr", "rtl"] as const) {
  for (const direction of ["vertical", "horizontal"] as const) {
    cases.push({
      element: "radios", variant: `empty whitespace; ${dir}; ${direction}; baseline; 12/1`,
      html: `<div dir="${dir}" style="display:flex;align-items:baseline;gap:8px"><m-radios id="subject" aria-label="Size"${direction === "horizontal" ? ' direction="horizontal"' : ""}>\n    </m-radios><span id="next">Next</span></div>`,
      style: "font-size:12px;line-height:1",
      width: 850, host: "#subject", strictBox: true, settleMs: 100,
      siblings: ["#next", "#inline", "#block"],
    });
  }
}

// Every combination the issue measures: five sizes, three densities, standard
// and connected groups, text and icon buttons, both directions and five
// consumer typographies. The host is the items' row and gap, so each
// combination is its own strict row.
type ButtonGroupButton = "text" | "icon";
type ButtonGroupDensity = "default" | "comfortable" | "compact";
type ButtonGroupKind = "standard" | "connected";
type ButtonGroupSize = "xs" | "s" | "m" | "l" | "xl";
type Typography = "default" | "12/1" | "12/2" | "24/1" | "24/2";

const buttonGroupItems = (button: ButtonGroupButton): string =>
  ["One", "Two", "Three"].map((label, index) => button === "text"
    ? `<m-button-group-item value="${index}">${label}</m-button-group-item>`
    : `<m-button-group-item value="${index}" icon="${ICON}" aria-label="${label}"></m-button-group-item>`
  ).join("");

// As BUTTON_GROUP_SIZE_TOKENS and DENSITY_STEPS in components/button-group:
// the container height, 4px less per density step. Every row must hold it on
// both sides of the upgrade, whatever the page's typography.
const buttonGroupHeights: Record<ButtonGroupSize, number> = {
  xs: 32, s: 40, m: 56, l: 96, xl: 136,
};
const buttonGroupDensitySteps: Record<ButtonGroupDensity, number> = {
  default: 0, comfortable: 4, compact: 8,
};

const buttonGroupMatrixRow = (
  size: ButtonGroupSize, density: ButtonGroupDensity, kind: ButtonGroupKind,
  button: ButtonGroupButton, dir: "ltr" | "rtl", typography: Typography,
): PreupgradeCase => {
  const attributes = [
    `size="${size}"`,
    density === "default" ? "" : `density="${density}"`,
    kind === "connected" ? 'kind="connected" selection="single"' : "",
    'aria-label="Actions"',
  ].filter(Boolean).join(" ");
  const [fontSize, lineHeight] = typography.split("/");
  return {
    element: "button-group",
    variant: `${size}; ${density}; ${kind}; ${button}; ${dir}; ${typography}`,
    html: `<m-button-group ${attributes}>${buttonGroupItems(button)}</m-button-group>`,
    style: `direction:${dir};${typography === "default" ? "" : `font-size:${fontSize}px;line-height:${lineHeight}`}`,
    width: 850,
    strictBox: true,
    hostHeight: buttonGroupHeights[size] - buttonGroupDensitySteps[density],
    // The group upgrades synchronously, as the six host rows do.
    settleMs: 100,
  };
};

for (const size of ["xs", "s", "m", "l", "xl"] as const) {
  for (const density of ["default", "comfortable", "compact"] as const) {
    for (const kind of ["standard", "connected"] as const) {
      for (const button of ["text", "icon"] as const) {
        for (const dir of ["ltr", "rtl"] as const) {
          for (const typography of ["default", "12/1", "12/2", "24/1", "24/2"] as const) {
            cases.push(buttonGroupMatrixRow(size, density, kind, button, dir, typography));
          }
        }
      }
    }
  }
}

// The host inherits the page's line box around the field's own typography.
// Exercise every field family in inline flow (baseline) and a flex row (host
// height), including compact, outlined, multiline and the supporting row.
const textFieldRows = cases.filter(row => row.element === "text-field" && !row.variant.includes(";"));
for (const dir of ["ltr", "rtl"]) {
  for (const typography of ["default", "12/1", "12/2", "24/1", "24/2"]) {
    const [size, height] = typography.split("/");
    for (const layout of ["inline", "flex"]) {
      for (const row of textFieldRows) {
        cases.push({
          ...row, variant: `${row.variant}; ${dir}; ${layout}; ${typography}`,
          html: `<div dir="${dir}" style="${layout === "flex" ? "display:flex;align-items:baseline" : ""}">${row.html.replace("<m-text-field", '<m-text-field id="subject"')}<span id="next">Next</span></div>`,
          style: typography === "default" ? "" : `font-size:${size}px;line-height:${height}`,
          width: 850, host: "#subject", strictBox: true, siblings: ["#next", "#inline", "#block"],
        });
      }
    }
  }
}
