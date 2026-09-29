# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog starts at 0.8.0, the first release with written notes (September 2026).
Earlier versions are in the [git history](https://github.com/floor/mtrl/commits/main).

## [Unreleased]

### Changed

- **Progress: `on()` uses the emitter, and handlers get `{ value, max }` (FLO-295).** They
  were DOM listeners on the element, handed a `CustomEvent` with the payload in `detail`,
  unlike every other component. Migration: `progress.on('change', (e) => e.detail.value)`
  becomes `progress.on('change', ({ value }) => value)`. `ProgressEvents` types the two
  events, `change` and `complete`.

### Fixed

- **Types the runtime already took (FLO-295).** `DrawerConfig` has `ariaLabel`, which the drawer
  always read; a segmented button's `mode` takes `'single'` / `'multi'` as well as the enum, as
  its `density` already did.
- **Select's menu class and Progress's duplicate classes (FLO-295).** Found by md3.io's docs
  audit. Since `class` stopped being prefixed, the select passed `select__menu` bare, so
  `.mtrl-select__menu` matched nothing; it is prefixed now, and the rules under it, which never
  applied (a 460px max width, a 4px margin, fade classes nothing set), are gone. Progress roots
  no longer carry unprefixed `progress progress--linear` copies of their classes.

### Deprecated

- **Text field:** `TEXTFIELD_CLASSES.LABEL_FLOATING`, applied and styled nowhere (FLO-295).

## [0.10.0-next.3] - 2026-09-29

The third prerelease of 0.10.0, on the npm `next` tag (`npm install mtrl@next`); `latest`
stays at 0.9.8. Every component now ships as a custom element with React, Vue, Svelte and
Solid components: 20 more since next.2, among them the overlays (menu, select, split button,
tooltip, snackbar, dialog, sheets, the modal drawer and rail), which open in the browser's top
layer from inside their shadow root through a new `layer: "top"` option on their factories.
The element API gained state events, which leave a form value untouched, and the options
md3.io's playgrounds needed. On the conformance side, search is reworked (contained style,
combobox semantics, top layer), the time picker edits a draft until OK, and focus is read from
the component's own root in every factory, inside shadow roots too.

### Added

- **Elements: state events that leave the model clean.** An event spec with `state: true`
  reports a change beside the model (`open`, `expanded`): dispatching it does not mark the
  element dirty, so the model's attribute still moves it. The open and close events of
  `<m-dialog>`, the sheets, `<m-menu>`, `<m-snackbar>` and `<m-drawer>` are state events;
  `<m-drawer>`'s marked its `value` dirty before.
- **Elements: `<m-navigation-rail>` `expand` and `collapse` events (#257).** Dispatched when the
  user or a method changes `expanded`, after the attribute reflects it, and not when the
  attribute is what changed. They leave the rail clean, so frameworks can keep `expanded` as
  state and drive a modal rail from it.
- **Elements: `<m-dialog>` `size`, `close-button`, `subtitle`, `divider`, `footer-alignment`,
  `no-close-on-scrim-click` and `no-close-on-escape` (#257).** The factory's `size`,
  `closeButton`, `subtitle`, `divider`, `footerAlignment`, `closeOnOverlayClick: false` and
  `closeOnEscape: false`; `cancel` is still dispatched on Escape.
- **Elements: `<m-bottom-sheet>` `expanded`, with `expand` and `collapse` events (#257).**
  `expanded` reflects the full height as `open` reflects showing; set while closed, the sheet
  opens expanded. The events come from the user and the methods, closing from the full height
  included, and leave the element clean.
- **Elements: `<m-side-sheet>` `width` (#257).** The factory's `width`, in pixels.
- **Elements: `no-close-on-scrim-click` and `no-close-on-escape` on the sheets and
  `<m-drawer modal>` (#257).** The sheets' `closeOnScrimClick: false` and `closeOnEscape:
  false`; on the drawer, whose factory has one `dismissible` for both, each is refused on its
  own, in place.
- **Elements: `<m-menu>` `color`, `no-close-on-select`, and `<m-menu-item gap>` (#257).** The
  factory's `color` (`vibrant` for the vertical menu), `closeOnSelect: false`, and its gap
  items, which split the vertical menu into groups; `<m-split-button>` reads gap items too.
- **Elements: `<m-tooltip>` `no-show-on-hover` and `no-show-on-focus` (#257).** The factory's
  `showOnHover: false` and `showOnFocus: false`.

- **Elements: `<m-search>` with `<m-search-suggestion>`.** Form-associated: the query is
  `value`, the model and the form value, under the host's `name`. Suggestions are declared
  as children (`value`, text or `label`, `icon`, `group`) and redrawn in place once per
  change, not at all when they come back the same, so an app can replace them as the user
  types. `placeholder`, `variant`, `view-mode` (`docked`/`fullscreen`), `full-width`,
  `disabled`, `aria-label` and `open` (reflected) update in place; `leading-icon`,
  `trailing-icon`, `avatar` and their labels recreate it. Events: `input`, `change` on
  Enter, `select`, `open`, `close`, and `action` for the trailing icon and avatar; methods
  `show()`, `close()` and `focus()`. The open view is the factory's, in the top layer.
- **Tooltip: `layer: "top"`.** With the option the tooltip renders after its target instead
  of on `document.body` (or stays where its owner put it), in the target's tree, a shadow
  root's included, and is shown in the top layer as a `popover="manual"` element, placed in
  viewport coordinates. It leaves the top layer after its exit transition. Without popover
  support the option does nothing. The default tooltip is unchanged.
- **Snackbar: `layer: "top"`.** With the option the snackbar is a `popover="manual"` element,
  shown in the top layer where its owner put it or on the body, at its usual place. While a
  modal `<dialog>` is open, the rest of the page is inert, so it opens inside the topmost
  one (found from focus, or in the document and its open shadow roots), carried in a shadow
  root with its own root's stylesheets when it comes from another tree. It follows the
  modals while it shows: into one that opens, back to the one below or home when its modal
  closes, staying open with its timer running and closing once. Without popover support the
  option does nothing. The default snackbar is unchanged.
- **Elements: `<m-tooltip>`.** The target is `for` (an id in the element's root, then the
  document) or the `target` property; the text is `text` or the element's text; `position`,
  `variant`, `show-delay`, `hide-delay`, and `show()`/`hide()`. The surface stays in the
  element's shadow root, in the top layer. The target is described by the text: its
  `aria-describedby` names the host, which carries the text as an `aria-hidden` label.
- **Elements: `<m-snackbar>`.** The message is `message` or the element's text; `action`,
  `dismissible`, `close-label`, `duration`, `position`, `queue-behavior`, the `open`
  property, `show()`/`hide()`, and the `open`, `action` and `close` events (`detail.reason`).
  It shares the factory's queue and opens in the top layer, above modal dialogs.
- **Menu: `layer: "top"`**, and a top-layer helper in `mtrl/core/dom`. With the option the
  menu renders next to its opener instead of on `document.body` or `container`, and is shown
  in the browser's top layer as a `popover="manual"` element: above any z-index, out of any
  clipping parent, and inside the opener's shadow root with that root's styles. It is placed
  in viewport coordinates with the same flip and clamp, keeps its own dismissal (a close
  emits `close` once), and closes if something else hides it; submenus open in the top layer
  too. Without popover support the option does nothing. The helper is `showInTopLayer`
  (`popover-auto`, `popover-manual` or `modal`), `hideFromTopLayer`, `onTopLayerClose`, which
  reports the browser's own closes, and `supportsTopLayer`. The default menu is unchanged.
- **Menu: a top-layer menu in another shadow root than its opener** stays open when focus
  moves into it. The opener's blur names the shadow host there, not the menu, and closed it
  right after a pointer opened it. Menus without `layer` are unchanged.
- **Select: `layer: "top"`**, passed to its menu: the listbox renders beside the field, in the
  field's tree, and opens in the top layer; focus moving into it does not count as leaving
  the select. The default select is unchanged.
- **Split button: `layer: "top"`**, passed to its menu, which then renders beside the trailing
  button in the top layer. The default split button is unchanged.
- **Elements: `<m-menu>` with `<m-menu-item>` children**, and `Menu` and `MenuItem` in the
  adapters. Items declare `value`, their text or `label`, `icon`, `shortcut`,
  `supporting-text`, `disabled`, or `divider`; nested items are a submenu. `anchor` is the
  opener's id (the menu's root first, then the document), or as a property an element. The
  surface stays in the element's shadow root and opens in the top layer. `open` reflects the
  state as on `<details>`, with `show()`, `hide()` and `toggle()`; `open`, `close` and
  `select` (`{ value }`) are dispatched. Items update in place.
- **Elements: `<m-select>` with `<m-select-option>` children**, and `Select` and
  `SelectOption` in the adapters. A form-associated select: `value` is the model and the form
  value, with `change`; `label`, `variant`, `required` (reported as `valueMissing`),
  `disabled`, `supporting-text`, reset, restore and `<label for>` as on `<m-textfield>`.
  Options declare `value`, their text or `label`, `icon` and `disabled`, and update in place.
  The listbox opens in the top layer.
- **Elements: `<m-split-button>`**, with `<m-menu-item>` children as its menu, and
  `SplitButton` in the adapters. The text or `label` is the leading action, whose native
  `click` is the element's; a chosen item dispatches `select` (`{ value }`). `variant`,
  `size`, `disabled` and `icon`; the menu opens in the top layer.
- **Dialog: `layer: "top"`**. The dialog itself becomes a `<dialog>`, rendered in place in
  `container` and kept there when it closes, and opens with `showModal()`: in the top layer,
  the page outside inert (a shadow root's page too), the scrim its `::backdrop`, fading as
  the overlay did; the overlay element is not used. Escape arrives as the dialog's `cancel`
  and closes it through `close()`, once; a press and release on the backdrop closes it as a
  click on the overlay did; focus goes in on open and back to the opener; Tab wraps through
  slotted content. It animates out in the top layer. Without `showModal()` the option does
  nothing, and the default dialog is unchanged.
- **Bottom sheet: `layer: "top"`** for the modal variant: the root is a `<dialog>` shown with
  `showModal()`, the scrim its `::backdrop`, Escape its `cancel`, a click beside the sheet the
  scrim's click, Tab wrapped inside; the sheet slides as before, in and out of the top layer.
  Standard sheets and the default modal sheet are unchanged.
- **Side sheet: `layer: "top"`** for the modal variant, as for the bottom sheet.
- **Drawer: `layer: "top"`** for the modal variant: the root is a `<dialog>` shown with
  `showModal()`, which makes the whole page inert where the drawer's own `inert` walk stopped at
  a shadow root (#249); the scrim is its `::backdrop`, Escape its `cancel`, and a drawer opened
  before it is on the page is shown once it is. The standard drawer and the default modal
  drawer are unchanged.
- **Elements: `<m-dialog>`**, and `Dialog` in the adapters. The top-layer dialog in the
  element's shadow root. Slots: `headline` (the `headline` attribute is its fallback), which
  names it, the default slot, which describes it, and `actions`. `open` shows it and reflects
  it, as on `<dialog open>`; `fullscreen` is the full-screen dialog; `aria-label` names one
  without a headline. `show()` and `close()`; `open`, `close`, and `cancel` on Escape, which
  `preventDefault()` refuses.
- **Elements: `<m-bottom-sheet>`**, and `BottomSheet` in the adapters. Slots `headline` and
  the default one; `open` (reflected), `modal` (the top-layer modal sheet; standard without
  it), `headline`, `no-drag-handle`, `aria-label`; `show()`, `close()`, `expand()`,
  `collapse()`; `open` and `close` events.
- **Elements: `<m-side-sheet>`**, and `SideSheet` in the adapters. Slots `headline` and the
  default one; `open` (reflected), `modal`, `headline`, `position`, `no-close-button`,
  `aria-label`; `show()` and `close()`; `open` and `close` events.
- **Elements: `<m-drawer modal>`**: the modal drawer in the top layer. `open` reflects it
  closing on Escape or the backdrop, and the drawer dispatches `open` and `close`.
- **Elements: `<m-navigation-rail layout="modal">`**: the modal rail, a `<dialog>` shown with
  `showModal()` while expanded; `expanded` reflects Escape and the backdrop collapsing it.
- **Elements: `<m-navigation-rail>` with `<m-navigation-rail-item>` children**, and
  `NavigationRail` and `NavigationRailItem` in the React, Vue, Svelte and Solid adapters.
  The standard rail: a navigation landmark named by `aria-label`, each item a button, or a
  link with `href`, declaring `value`, `icon`, `selected-icon`, `badge` (empty for the dot),
  `badge-label` and `disabled`. `value` is the model, with `change` on a click or Enter;
  `expanded` reflects the menu button as `open` does on `<details>`, `no-toggle` drops it,
  and `slot="header"` takes a FAB. Items update in place.
- **Elements: `<m-drawer>` with `<m-drawer-item>` children**, and `Drawer` and `DrawerItem`
  in the adapters. The standard (in-page) drawer, named by its `headline` or `aria-label`:
  items declare `value`, `icon`, `badge` and `disabled`, or with `type="section"` and
  `type="divider"` a section headline and a divider. `value` is the model, with `change`;
  `open` and `headline` apply in place, `position`, `width` and `dense` recreate it.
- **Elements: `<m-top-app-bar>`**, and `TopAppBar` in the adapters. Children are the
  headline (`headline` is the text when there are none), `slot="leading"` the navigation
  icon button and `slot="trailing"` the actions. `type` (`small`, `center`, `medium`,
  `large`) changes in place; `scroll-threshold`, `no-scroll` and `no-compress` set the
  scrolled state, and `scroll-target` follows an element's scroll instead of the window,
  as `setScrollState()` does from script.
- **Elements: `<m-bottom-app-bar>`**, and `BottomAppBar` in the adapters. Children are the
  actions and `slot="fab"` the FAB, at the end or with `fab-position="center"` in the
  middle; `auto-hide` hides it on a scroll down, `show()` and `hide()` from script.
- **Elements: `<m-button-group>` with `<m-button-group-item>` children**, and `ButtonGroup`
  and `ButtonGroupItem` in the React, Vue, Svelte and Solid adapters (`MButtonGroup` and
  `MButtonGroupItem` in Vue). Each item declares a button (its text or `label`, `value`,
  `icon`, `selected-icon`, `aria-label`, `disabled`, `selected`); the group takes the
  factory's `variant`, `kind`, `selection`, `required`, `size`, `shape`, `labels`,
  `orientation`, `density`, `equal-width` and `disabled`, and is named by `aria-label`. With
  `selection="single"` or `"multi"`, `value` is the default selection (comma-separated when
  multi) and the live property (a string, or an array when multi), with `change` and
  `{ value }`; every press dispatches `action` with `{ value, index }`. Items relabelled,
  given an icon or disabled update the group in place; the rest rebuilds it, keeping the
  selection.
- **Elements: `<m-chips>` with `<m-chip>` children**, and `Chips` and `Chip` in the React,
  Vue, Svelte and Solid adapters (`MChips` and `MChip` in Vue). Each `<m-chip>` declares a
  chip (its text or `label`, `value`, `variant`: filter by default, assist, input or
  suggestion, `icon`, `trailing-icon`, `avatar`, `remove-label`, `selected`, `disabled`,
  `elevated`); the set is a grid with one Tab stop, named by `aria-label` or its `label`,
  multi-select unless `selection="single"`, with `selection-required`, `scrollable`,
  `vertical` and `label-position`. `value` is the default selection (comma-separated when
  multi) and the live property (an array, or a string when single), with `change` and
  `{ value }`; removing an input chip dispatches `remove` with `{ value }`. Chips added at the
  end, removed, relabelled or disabled update the set in place. In-place updates of any
  element's children no longer re-dispatch what they make the factory emit.
- **Elements: `<m-list>` with `<m-list-item>`**, and `List` and `ListItem` in the React,
  Vue, Svelte and Solid adapters. Each item declares a row (its text or `headline`,
  `overline`, `supporting-text`, a leading icon, avatar or image, a trailing icon or text,
  `value`, `disabled`, `selected`), or a divider or subheader with `kind`. `selection` is
  `single`, `multiple` or `none`; `value` is the live selection and the model, `values` all
  of it, and a row dispatches `activate` and then `change`. Items update in place.
- **Elements: `<m-card>`**, and `Card` in the adapters. A container whose regions are
  slots: `media`, the header's `avatar`, `headline`, `subhead` and `header-action`, the
  default slot for supporting content, and `actions`. `variant`, `clickable` (a button
  named by its headline), `full-width`, `disabled` and `aria-label`.
- **Elements: `<m-carousel>` with `<m-carousel-item>`**, and `Carousel` and `CarouselItem`
  in the adapters. Items declare `src`, `alt`, a label, `description`, `button-text`,
  `button-url` and `value`; the carousel takes the layout `variant` and the item sizing
  attributes, with the current `index` as the model, `change` as it moves, and `next`,
  `prev` and `goTo`. Items update in place.
- **Elements: `<m-datepicker>`**, and `Datepicker` in the adapters. A form-associated date
  picker whose own field is its trigger: `value` is the model and the form value, an ISO date
  (`YYYY-MM-DD`), or with `selection-mode="range"` a `start/end` interval, with `change`
  (`{ value }`) on commit: Save in the `modal`, `modal-input` and `fullscreen` variants, which
  open in the top layer, and each date chosen in the `docked` one. `min`, `max`,
  `date-format`, `label`, `supporting-text`, `required` (reported as `valueMissing`),
  `disabled`, `readonly`; reset, restore and `<label for>`. `open` reflects the calendar as on
  `<dialog open>`, with `show()` and `close()`, and `open` and `close` are dispatched.
- **Elements: `<m-timepicker>`**, and `Timepicker` in the adapters. A form-associated time
  picker with no field of its own, opened by `show()`, the `open` attribute (reflected) or a
  `<label for>`, in the top layer. `value` is the model and the form value, a 24-hour
  `HH:MM` (`HH:MM:SS` with a `step` under a minute) as on `<input type=time>`, or `""`
  until one is set or confirmed. The dial edits the factory's draft (FLO-288): `input`
  (`{ value }`) as it moves, `change` (`{ value }`) when OK commits a different time (or
  fills an empty picker), and Cancel, Escape or the backdrop discard it. `format`, `type` (dial or input) and `orientation` change in place; `min`,
  `max` and `step` (seconds, as the minute or second step); `label`, `required`
  (`valueMissing`), `disabled`; reset and restore; `open` and `close` events.
- **Elements: the remaining factory options (#263).** `<m-dialog>` `animation` (`scale`,
  `slide-up`, `slide-down`, `fade`); `<m-bottom-sheet>` `max-width` (pixels, 640 by default);
  `<m-navigation-rail>` `no-ripple`; `<m-timepicker>` `show-seconds`, which shows seconds
  with a minute `step` (`HH:MM:SS`); `<m-datepicker>` `initial-view` (`day`, `month`, `year`)
  and `close-on-select`. The factories read each once: a change recreates the component.

### Fixed

- **Keyboard and focus inside a shadow root (#244).** Factories found the focused element
  with `document.activeElement`, which is the shadow host when focus is inside a shadow
  root: the navigation rail's and the drawer's arrow keys did nothing there, a menu's arrows
  jumped back to the first item, a chip removed from the keyboard dropped focus, a list or
  rail rendering again lost the focused item, a select lost its focused styling, a search
  collapsed with focus back in its field, a modal drawer or rail let Tab out, and a
  dialog, modal sheet, modal drawer or snackbar returned focus to the host rather than its
  opener. They now read their own root through
  `activeElementOf(node)` in `core/dom`, and an overlay saves the focused element through
  open shadow roots with `deepActiveElement()`. `<m-navigation-rail>` and `<m-drawer>` drop
  the key handlers that covered for it.
- **Search: events and controls found building `<m-search>` (FLO-291).** Enter on the
  suggestion the arrows reached selects it without first submitting the typed text; a click
  or a keystroke in an input that already has focus reopens the view; emptying the query
  (the clear button, Escape, `clear()`) emits `input` with the empty value before `clear`;
  `trailingItems[].onClick` is wired, and `setLeadingIcon`, `setTrailingItems`,
  `addTrailingItem` and `removeTrailingItem` work (they only warned); an avatar is a
  button when it has `onClick`, and otherwise an image out of the tab order (it was a
  focusable div with no role); suggestions take `supportingText`, as a 72dp two-line item;
  the icon buttons inherit the font inside a shadow root.
  `<m-search>` drops its two workarounds (the Enter filter, and `clear` mapped to `input`),
  its avatar is a button, and it takes `min-width` / `max-width` (pixels or a CSS length, in
  place), `no-clear-button`, `no-expand-on-focus` and `no-collapse-on-blur` (#263).
- **Search: `minWidth` and `maxWidth` apply (FLO-290).** They were documented and given
  defaults, and nothing read them: the stylesheet's 360dp and 720dp applied whatever was
  passed. They now set `--mtrl-search-min-width` and `--mtrl-search-max-width` on the root.
- **Search: the open view no longer moves or covers the page (FLO-285).** A docked view grew
  in the page's flow and pushed everything below it down; a full-screen search covered the
  whole page even as a bar. Opening now shows the bar and its results in the top layer,
  over the bar's place, which the page keeps: docked under the bar over a 0.32 scrim (a
  press on it closes the view), full screen as a modal `<dialog>` (`showModal()`: the page
  is inert, Escape cancels). A clipping parent no longer hides the results. Moving focus to
  the view's own back or clear button no longer closes it, and hovering a suggestion no
  longer selects it for the next Tab.
- **Search: accessibility and M3 tokens (FLO-286).** The input is a combobox that controls
  the suggestions listbox (`role="combobox"`, `aria-expanded`, `aria-controls`,
  `aria-autocomplete="list"`), and the arrows move `aria-activedescendant` through the
  options; a polite status announces how many suggestions show. The icon buttons are 48dp
  tap targets (they were 24dp) with 8% hover and 10% focus and pressed layers and the 3dp
  `secondary` focus ring; the bar has an 8% hover layer. Suggestions are 56dp one-line list
  items, and the option the arrows reach looks focused. The divider is `outline`. The
  suggestions listbox stays in the DOM, hidden, while the search is a bar.
- **Elements: `<m-drawer>` keeps its default `value` when items are completed after
  upgrade.** An item without a label is left out until it has one; a clean drawer now takes
  its `value` attribute again when the items are reconciled, as the rail does (#247).
- **Elements: `<m-list>` `activate` and `<m-button-group>` `action` leave the model clean.**
  They report a press, and `change` carries the selection; they marked the element dirty, so
  its `value` attribute stopped moving it. `<m-chips>` `remove` still does: removing a
  selected chip changes the selection, and no `change` comes with it.
- **Bottom sheet: `peekHeight` sets the partial height.** The option was declared, with a
  documented default of 56, and did nothing: the partial sheet was always its content up to
  half the screen. Set, it is now the partial state's height in pixels; unset, the partial
  state is unchanged. `<m-bottom-sheet>` takes it as `peek-height`.
- **Elements: `<m-navigation-rail>` keeps its default `value` when items are completed after
  upgrade (#247).** An item without an icon is left out until it has one, as frameworks set
  attributes after creating the child; a clean rail now takes its `value` attribute again when
  the items are reconciled, so the default destination is selected once its item is complete.
- **Time picker: `minTime`, `maxTime`, `minuteStep` and `secondStep` are applied
  (FLO-281).** They were accepted and documented, and did nothing. Dial numbers and AM/PM
  that cannot be reached are disabled (at 38%), a pointer between labels picks the nearest
  step, a picked time outside the limits moves to the nearest one inside, and a typed time
  is held to them when committed (on change or Enter), not while typing. `setValue` is not
  held to them.
- **Time picker: focus inside a shadow root (FLO-284).** The dial kept focus on its numbers
  when its face changed, and closing returned focus to the opener, only when the document
  could see them; inside a web component it saw the host.
- **Time picker: M3 sizes and colours in every variant (FLO-280).** Dial mode's boxes are
  96x80dp in Display Large (114dp wide in the 24-hour vertical layout), the colon 24dp and
  on-surface. Input mode's fields are 96x72dp in Display Medium, labelled Hour and Minute
  below them, and the focused one turns primary-container inside a 2dp primary outline (the
  selected colours never showed: the number-field rule overrode them). AM/PM is 52x80dp
  (52x72 in input mode, 216x38 lying flat in the horizontal layout), 12dp from the time,
  with a 1dp outline and divider; the unselected half is transparent. In right-to-left
  layouts the time still reads left to right and AM/PM moves to the other side. Dark
  colours come from the theme: the `prefers-color-scheme` overrides and the surface-tint
  overlay are gone, and so is the phone-width shrink of the fields.
- **Date picker: focus inside a shadow root (FLO-284).** It read `document.activeElement`,
  which stops at the shadow host, so inside a web component Tab no longer wrapped in the
  modal, a swipe or the growing full-screen list lost the focused day, and closing could
  return focus to the host rather than the control that opened it. It now reads focus from
  its own root, and the opener through open shadow roots.

### Changed

- **Search: the contained style by default, with `variant: 'divided'` for the baseline
  (FLO-287).** M3 marks the divided style "not recommended, use contained" in M3 Expressive,
  and it was the only one mtrl drew. Contained keeps the bar's pill and filled container
  when focused and gives the results their own container: docked 2dp below the bar with
  12dp corners, full screen on `surface-container-low` with the bar inset 12dp. `variant:
  'divided'` (and `setVariant()`) keeps the look apps had. The results reveal on the
  emphasized decelerate curve, not with reduced motion; the never-driven `--expanding` and
  `--collapsing` classes are gone.
- **Time picker: edits are a draft until OK (FLO-288).** Every move of the dial was the value,
  with a `change` each time, and Cancel kept it; in M3, Cancel discards and OK commits, as
  the date picker already did. While open, the dial, fields and AM/PM edit a draft,
  reported by a new `input` event (and `onInput`). OK commits it with one `change` (if it
  differs), then `confirm`, both while the picker is still open, then `close`; Cancel,
  Escape and the backdrop put the committed value back and emit `cancel` before `close`.
  `getValue()`, `getTimeObject()` and the form value are the committed time throughout;
  `setValue` still commits directly. The dialog now stays in the component's element
  (it was appended to `document.body`; `open()` adds an element the app never placed to
  the page), so the root's `click` and `keydown` leave out the dialog's own, and Enter in
  its fields does not submit a surrounding form. New `disabled`, `enable()`, `disable()`
  and `isDisabled()`: a disabled picker does not open.
- **Time picker: `change` fires once per new value (FLO-281).** `setFormat` no longer emits
  `change` (the value is 24-hour whatever the display, and it emitted without calling
  `onChange`), and `setValue` notifies only when the value differs, with the event and
  `onChange` together.

### Deprecated

- **Time picker (FLO-281):** `closeOnSelect` (never applied; the picker is confirmed with
  OK), `TIMEPICKER_DIAL` (not the dial's geometry, which is CSS), `TIMEPICKER_Z_INDEX`
  (the native top layer needs none), `TIMEPICKER_CLASSES` (use `TIMEPICKER_SELECTORS`;
  its `DIAL_CENTER` and `PERIOD_ACTIVE` now name the classes the picker uses), and the
  selectors `MODAL`, `DIAL_CANVAS` and `DIAL_HAND`, which match nothing.

## [0.10.0-next.2] - 2026-09-29

The second prerelease of 0.10.0, on the npm `next` tag (`npm install mtrl@next`); `latest`
stays at 0.9.8. Fourteen components now ship as custom elements with React, Vue, Svelte
and Solid components: icon button, FAB, extended FAB, checkbox, radios, slider, text field,
progress, loading indicator, badge and divider join button, switch and tabs, and every
element's model attribute now behaves as on native controls. On the conformance side, the
time picker gets an accessible dial and a native modal, the date picker a full-screen
variant and a scrolling year picker, and the outlined text field an M3 notched outline.

### Added

- **Date picker: a full-screen variant, `variant: 'fullscreen'`.** The m3.material.io
  full-screen picker, recommended on compact screens and the range picker's form: the whole
  viewport, no corners, a close (x) icon button and **Save** above a Title Large headline,
  one weekday row, and the months in a vertically scrolling list with Title Small subheads
  ("To navigate across months, scroll vertically"). The list renders a window of months
  around the focused one, within `minDate` and `maxDate`, and extends it by a year as it
  nears either end without moving what is shown. Selections are drafts until Save, as in
  the modal (FLO-276).
- **Elements: `<m-progress>`, `<m-loading-indicator>`, `<m-badge>` and `<m-divider>`**, and
  `Progress`, `LoadingIndicator`, `Badge` and `Divider` in the React, Vue, Svelte and Solid
  adapters. Progress takes `value` and `indeterminate` as live properties, the loading
  indicator `size`, `contained` and `value`, both named by `aria-label`; the badge is
  standalone, labelled by its text or `label` and capped by `max`, with a live `visible`;
  the divider takes `orientation`, `variant`, insets, `thickness` and `color`.
- **Elements: `<m-icon-button>`, `<m-fab>`, `<m-extended-fab>` and `<m-checkbox>`**, with
  their React, Vue, Svelte and Solid components (`IconButton`, `Fab`, `ExtendedFab`,
  `Checkbox`). The icon button and the FAB are named by `aria-label`; the extended FAB and the
  checkbox by their children. A toggle icon button has a live `selected` property and a
  `toggle` event; the button-like elements' `type="submit"` and `type="reset"` act on the
  host's form. The checkbox is a form control like `<m-switch>` (`checked` as default and
  live state, `indeterminate` as a property, `change`, form value, reset, validity, `<label
  for>`, state restore).
- **Elements: `<m-slider>`**, with `Slider` in the React, Vue, Svelte and Solid adapters. A
  form control: `value` is the default as an attribute and the live state as a property,
  `range` adds a second handle with `second-value` / `secondValue`, and both ends submit
  under the host's `name`. `input` fires while the value moves and `change` when an
  interaction ends, with `{ value }` (and `secondValue` on a range). `aria-label` names the
  handles; `min`, `max`, `step`, `ticks`, `show-value`, `color` and `size` update in place.
  Form elements can now submit several values: `FormSpec.value` may return `FormData`.
- **Elements: `<m-textfield>`**, and `Textfield` in the React, Vue, Svelte and Solid
  adapters. A form control like a native input: the `value` attribute is the default and the
  `value` property the live text, bound by `v-model` and `bind:value`; `input` on each
  keystroke and `change` on commit, both with `{ value }`; form value, reset, validity from
  `required`, `maxlength`, `pattern` and `type`, `<label for>` and state restore. Named by
  its `label`; `variant`, `supporting-text`, `prefix-text`, `suffix-text`, the icons,
  `error`, `readonly` and `disabled` update in place, `type="multiline"` renders a textarea.
- **Elements: `<m-radios>` with `<m-radio>` children**, and `Radios` and `Radio` in the
  React, Vue, Svelte and Solid adapters (`MRadios` and `MRadio` in Vue). Each `<m-radio>`
  declares an option (`value`, `disabled`, its text or `label` as the label); the group is
  named by `aria-label` and takes `value` as its default selection and live property,
  `disabled`, `required` and `direction`. It dispatches `change` with `{ value }` on a click
  or an arrow key and is a form control (form value, reset, `required` validity, disabled
  fieldset, state restore). Children added at the end, removed, relabelled or disabled
  update the group in place.

### Changed

- **Time picker: an accessible DOM dial (FLO-279).** The clock dial is no longer a canvas
  hidden from assistive tech: it is a listbox of its numbers ("9 o'clock", "20 hours",
  "15 minutes"), reachable by Tab, moved through with the arrows and selected with Enter or
  Space, and a pointer can click or drag it. The hand, its 48dp handle and the on-primary
  label under it move together on the default spatial spring, the short way round, and the
  dial moves on to minutes once a pointer has picked the hour. Its colours come from the
  theme. In 24-hour mode noon and midnight now sit on the inner and outer rings at the top
  (the hand pointed at 00 at noon).
- **Time picker: the dial's hour and minute boxes are radios (FLO-283).** In dial mode they
  choose which part the dial sets, so they are a radiogroup of buttons named as Compose names
  them, with their value ("Select hour: 9 o'clock", "Select minutes: 35 minutes"): one tab
  stop, the arrows move the check. They are filled surface-container-highest, primary-container
  when checked, with state layers and the focus ring. Typing a time is the input mode's; the
  dial mode's boxes were number fields.
- **Date picker: the year picker scrolls.** It lists every year from `minDate` to `maxDate`
  (1900 to 2100 by default) in a vertically scrolling grid the height of the calendar, opened
  on the selected year, as the m3.material.io guidelines have it ("To navigate across
  years, scroll vertically"). It was ±10 years paged by the arrows, which the year view no
  longer shows (FLO-275).
- **Elements: the model attribute is the default, as natively.** On `<m-switch>`,
  `<m-checkbox>`, `<m-radios>`, `<m-icon-button>`, `<m-slider>` (`value` and `second-value`),
  `<m-tabs>` and `<m-textfield>`, a change of `checked`, `selected` or `value` moves the live
  state only until it is dirty: changed by the user, or set by script through the property
  or a method. Then the attribute is only the default `form.reset()` returns to, which also
  makes the element clean again; a restored form state is dirty. The attribute used to move
  the live state always, and `<m-tabs>` never.

### Fixed

- **Extended FAB: no manufactured `aria-label` (#232).** It is set only from `ariaLabel`. The
  factory copied `text` into it, which named `<m-extended-fab>`'s button
  "[object HTMLSlotElement]" until the element removed it again, and gave an extended FAB
  with no text the name "action", as the FAB did before FLO-110. The visible text is the
  name. A segmented button's text segment no longer copies its text into `aria-label`
  either; an icon-only segment is still named by its value.
- **Text field: the outlined variant's floating label sits in a notch of the outline
  (#234).** The outline is drawn in three segments, and while the label floats the middle
  one drops its top edge: the label's floated width plus 4dp on each side, starting 12dp
  in. Nothing is painted behind the label any more. It used to copy the nearest ancestor's
  background onto the label, which found `document.body` from inside `<m-textfield>`'s
  shadow root, covered any card that is not one flat colour, and kept a mutation observer
  per ancestor and a `themechange` listener for each field. The notch follows the label's
  text, density and direction; the outline is 1dp in `outline` at rest, `on-surface` on
  hover and 2dp `primary` on focus, in `error` for errors and `on-surface` at 12% disabled.
- **Selection controls: one label type (FLO-282).** The checkbox, radio and switch labels are all Body
  Large, a list item's headline. The radio label was Body Medium with a 1.2 line height, and
  the switch label Title Medium enlarged to 18px.
- **Time picker: a native modal dialog (FLO-278).** It opens with `showModal()`, over a
  0.32 scrim, with the page inert; it takes focus on open and returns it on close. Escape and
  a click on the backdrop cancel that picker only (Escape closed every open picker, and the
  backdrop did not emit `cancel`). Each picker's title has its own id, the mode toggle keeps
  focus, and `isOpen: true` opens the picker as documented. `modalElement` is now the dialog
  itself.
- **Date picker, measured against the M3 tokens (FLO-277).** Days show 0.08 hover, 0.10
  pressed and 0.10 focus layers in `on-surface-variant` (`on-primary` on the selected day),
  with the 3dp focus ring. The docked calendar has 16dp corners, outside-month days are
  `on-surface` at 38%, in-range days `on-secondary-container`, and the range band starts
  and ends square at the centre of its endpoints. The modal is 568dp tall. In right-to-left
  layouts the arrow keys follow the reading direction and the chevrons mirror.
- `<m-tab>` has a property for each attribute it declares (`value`, `label`, `icon`, `badge`,
  `disabled`), writing the attribute. Solid sets a custom element's props as properties, so a
  `<Tab value="…">` rendered in the browser lost its value and the tabs reported its label.
- `<m-tab>` values set before the elements are defined are kept: a client-rendered Solid app
  sets them before it registers the elements on mount. `defineTabs` also defines `<m-tab>`
  before `<m-tabs>`, so the tabs read upgraded children.
- Slider: keys and the pointer work in the task that creates it (#236). The listeners were
  attached a task later, so input right after `createSlider()`, a form reset or toggling
  `range` on `<m-slider>` was ignored. Placing the handles for a right-to-left layout now
  follows the slider's first layout, as the track's measurement already did.

## [0.10.0-next.1] - 2026-09-29

A prerelease of 0.10.0, the conformance and frameworks release, on the npm `next` tag
(`npm install mtrl@next`); `latest` stays at 0.9.8. It covers everything since 0.9.8,
including `0.10.0-next.0`, which shipped without notes. 0.10.x carries on with both lines of
work, and 1.0.0 follows when they are finished.

### Added

- **Web components (experimental).** `mtrl/elements` defines `<m-button>`, `<m-switch>`,
  `<m-tabs>` and `<m-tab>` over the existing factories: shadow DOM, slotted content, form
  association (value, validity, reset, state restore), attributes as defaults and properties
  as live state. Their CSS ships as modules, `mtrl/elements/css` or one component's
  `mtrl/elements/css/<name>`. Every module imports safely on a server.
- **Framework adapters (experimental).** `mtrl/react` (React 18 and 19), `mtrl/vue`,
  `mtrl/svelte` (Svelte 5) and `mtrl/solid`, generated from the elements: typed props and
  events, two-way binding (`checked`/`onChange`, `v-model`, `bind:checked`), refs to the
  element, and server rendering with hydration. Each framework is an optional peer dependency.
- Button `text` and switch `label` accept a DOM node as well as a string.
- Slider: M3 tokens, variants and motion, the inset icon, vertical orientation and the centred
  variant.
- Chips: the filter chip's trailing action and the dragged state.
- Date picker: swipe horizontally between months.

### Changed

- **Breaking:** class names. `addClass` and the element builders no longer prefix, and element
  classes are BEM (`mtrl-dialog__header`, not `mtrl-dialog-header`); `getClass` is the one
  place a prefix is applied.
- **Breaking:** inline styles are an object of properties, never a CSS string.
- **Breaking:** a boolean attribute set to `false` is left off instead of written `"false"`.
- **Breaking:** typed event maps. `on()` and `off()` take each component's own event names and
  payloads (button, FAB, extended FAB, icon button, snackbar, switch, radios, checkbox,
  textfield, time and date pickers, carousel, drawer, chips), so a misspelled event no longer
  compiles.
- **Breaking:** one rule for setting a selection by code, across radios, segmented button,
  select and tabs.
- **Breaking:** tab ids carry their group, and panel updates stay inside it.
- **Breaking:** chips follow Material: four chip factories, chip sets as an ARIA grid with a
  3px focus ring, Material's selection defaults, input chips always removable.
- **Breaking:** the list has the full Material anatomy; the date picker's calendar and input
  are conformant; the slider's and time picker's options, setters, callbacks and form values
  agree.

### Deprecated

- `rippleConfig` timing and opacity, which were never applied. The ripple is the press.

### Removed

- **Breaking:** the legacy navigation component (`createNavigation`, `createNavigationSystem`).
  Use the navigation rail, the drawer or tabs.

### Fixed

- M3 conformance. Checkbox: the box, state layers, focus ring, error, Space only. Radios: the
  2dp ring, 10dp dot, state layers, keyboard-only focus. Switch: the RTL handle, icons, states,
  focus and label side. Tabs: the indicator, inactive colours, focus ring, manual activation,
  names for icon-only tabs, the responsive layout. Time picker: colour roles, headline type,
  AM/PM as a radiogroup, an accessible text-input mode. Badge: empty labels, overflow and
  positioning.
- Themes: every theme has its inverse colour roles; baseline has its error-container roles.
- Slider: range handles stop at each other, PageUp moves by a tenth, RTL, the handles'
  listeners are removed on destroy, and no stray piece of track at a short end.
- Types: `noImplicitAny`, `strictNullChecks` and `noImplicitThis` are on for the whole
  library, and the four flagship factories declare what they return.

## [0.10.0-next.0] - 2026-09-21

The first prerelease of 0.10.0, published without notes. Its changes are described
under 0.10.0-next.1.

## [0.9.8] - 2026-09-20

The types and security patch that closed the 0.9 line, including the
changes planned for 0.9.7.

### Added

- Search, time picker and slider take part in forms under a name.

### Fixed

- Core: one markup sink with a consumer policy for sanitizing and Trusted
  Types; a throwing listener no longer stops the others;
  lifecycle.destroy works whatever its receiver.
- Reduced motion stops movement and keeps fades.
- Time picker: a second picker works, and AM/PM answer the keyboard.
- Tabs: aria-controls points at a panel that exists.
- Textfield: the icon, prefix and suffix setters create their slot.
- Slider and menu: element lookups are scoped to their own component.
- Types: a types condition for mtrl/styles; select, menu, core, tabs,
  chips, progress and more pass strictNullChecks.

## [0.9.6] - 2026-09-17

The accessibility release, with the motion the review found on the way.

### Added

- Menu: a listbox option renders it as the listbox popup of a combobox,
  for select and for any consumer building one.
- Dialog: afteropen and afterclose, and the overlay's removal, wait for the
  motion (500 and 150ms) unless animationDuration is set.

### Changed

- Motion durations were 1.5 to 2 times their M3 tokens; short3 was 250ms
  where the token is 150ms. Every duration token now carries its M3 value,
  with medium3, medium4, long3, long4 and extra-long1 to 4 added, and
  easing-emphasized, which equalled easing-standard, is now the emphasized
  curve. Every component that uses the tokens is quicker as a result.
- Drawer, side sheet and bottom sheet open on the expressive spatial spring
  and close on the fast effects spring, as Compose does, with the scrim
  following the sheet and a guard over the overshoot at the docked edge.
- Dialog: the scrim fades in, the dialog grows in height from 35% over
  500ms on emphasized while its headline, content and actions fade in one
  after another, and it closes in 150ms on emphasized accelerate, as
  material-web does. It used to appear and vanish at once.
- Menu: closing runs the opening motion in reverse.

### Fixed

- Switch: the label was never linked to its input, so clicking it did
  nothing. Switch and checkbox also carried an aria-label copied from the
  label text, which outranked the label and went stale after setLabel();
  it is dropped, and an explicit ariaLabel now wins over the label text.
- Textfield: supporting text describes the input through aria-describedby,
  keeping ids the page set, and the input is aria-invalid while the field
  is in error. Select, built on textfield, gets the same.
- Tabs: arrow keys move between tabs, skipping disabled ones and wrapping,
  Home and End reach the ends, and left and right follow the reading
  direction. Only the active tab is a tab stop; the stop follows the
  selection and added or removed tabs. Up and Down are left to the page.
- Tooltip: Escape hides it without moving focus, and the pointer can rest
  on it (WCAG 1.4.13); leaving it hides after hideDelay.
- Button: a loading button is aria-busy.
- Select: a select with flat options is a select-only combobox. The input
  is role="combobox" with aria-expanded, keeps focus and owns the keyboard
  (arrows, Home, End, PageUp, PageDown, Enter, Space, Escape, Tab,
  type-to-find); the popup is a listbox of options named through
  aria-activedescendant. A select whose options have submenus keeps the
  menu button.

## [0.9.5] - 2026-09-17

A patch from porting component tests off their mocks. Fourteen suites had
asserted against copies of the components written in the test files; each
now drives the real component, and nearly every port found a defect the copy
had hidden.

### Fixed

- Button: setLoading(true, text) kept the old label and stored nothing to
  restore, so setLoading(false) could not bring it back.
- Radios: disable() styled the group as disabled while every radio stayed
  usable. Change handlers ran twice per selection, the second time with no
  payload, and off() removed nothing. setValue() with a value no option
  carries now clears the selection instead of reporting a value nothing shows.
- Tooltip: position, showDelay, hideDelay, showOnHover and showOnFocus were
  ignored in favour of fixed defaults. The tooltip also overwrote or removed a
  target's existing aria-describedby and left an old target described after
  setTarget(); it now adds and removes only its own id.
- Search: suggestions passed in config were never rendered, and the
  onExpand and onCollapse callbacks were never called.
- Tabs: change handlers ran twice per click, setActiveTab() selected a
  disabled tab, and handlers passed as config.on were never registered.
- Top and bottom app bars: destroy() left the window scroll listener in
  place, so a destroyed bar kept calling onScroll or onVisibilityChange. The
  bottom bar's show() and hide() did not call onVisibilityChange.
- Textfield: readonly was ignored, so a readonly field stayed editable.
  setError(false) left the error message showing as helper text; the helper
  text it displaced is now restored.
- Select: the open event fired only when opening from the keyboard, and
  open() opened a disabled select.
- Slider: in a range slider the second handle kept announcing its initial
  value after setSecondValue() or keyboard input. A valueFormatter now reaches
  assistive technology through aria-valuetext.
- Badge: setVariant() kept the ARIA of the variant it left, so a small badge
  switched to large stayed aria-hidden and its count was never announced.
  removeClass() threw.
- Divider: every setter worked only from the state the divider was created
  with. Getters went stale after setOrientation() and setVariant(), switching
  back left both modifier classes, setInset() did nothing after setVariant(),
  setThickness() sized the wrong axis after setOrientation(), and an inset set
  later overflowed its parent. A vertical divider now carries
  aria-orientation="vertical".
- Card: aria: { role } was written as an aria-role attribute and left the
  card with no role. A header title never named its card, and every title
  shared one id; titles now get unique ids and setHeader() labels the card
  unless it already has a name. setHeader() placed the header below the
  content on a card with media at the bottom.

### Tests

- Button, radios, tooltip, search, tabs, both app bars, textfield, select,
  slider, badge, divider, card and drawer are tested against the real
  components, and navigation, which is deprecated, keeps a smoke test of what
  mtrl.app uses. Only chips, list, time picker and date picker still test
  mocks; they wait for M3 conformance work before their behaviour is tested.

## [0.9.4] - 2026-09-17

### Removed

- SWITCH_LABEL_POSITION in switch/types.ts, an unused duplicate of
  SWITCH_LABEL_POSITIONS that was never exported from the package.

### Fixed

- Components no longer put their name on the root element. createElement wrote
  name onto whatever it built, so the root of most components carried it on a
  div, nav, aside or span, where the attribute is invalid. For checkbox,
  switch, textfield, select, datepicker and radios, both the root and the input
  were named, so form.querySelector('[name="x"]') and getElementsByName found
  the component's root before the control that submits the value. name is now
  written only on elements HTML defines it for; components whose root is a
  button keep it.
- Switch: SWITCH_DEFAULTS.LABEL_POSITION said end while a switch with no
  labelPosition rendered its label at the start. The label leads, as in M3
  settings rows, so the constant is now START and the switch reads its default
  from it. No switch changes appearance; code that passed the constant
  explicitly will now see its label at the start.

## [0.9.3] - 2026-09-17

A patch from porting component tests off their mocks. The switch and checkbox
suites had asserted against copies of the components defined in the test
files, and each copy implemented the methods that were broken in the real one.

### Fixed

- Switch and checkbox: setLabel() and getLabel() read a key the component
  never had, so getLabel() returned an empty string even for a rendered label
  and setLabel() changed nothing.
- Switch: supportingTextElement was a value captured when the component was
  created, so it went on reporting the old element after setSupportingText()
  or removeSupportingText(). It reads the live element now.
- Checkbox: the indeterminate class was set separately from the input's
  indeterminate state and drifted from it. From config the state was set but
  not the class; after a user click cleared the state, the class stayed. The
  class now follows the input.

### Tests

- The test tree is type-checked in CI. Its configuration had never run, and
  two local declarations of bun:test had typed every assertion as any. The
  component suites that still test mocks are listed by name, and the list can
  only shrink.
- Switch and checkbox are tested against the real components.

## [0.9.2] - 2026-09-17

A test-integrity patch. Two core suites had never run, and running them found
a defect in shipped code.

### Fixed

- Disabled state: on a component whose root is not a form element, disable()
  recorded the state as a class and an attribute, while isDisabled() read only
  the element's disabled property, which a div does not have. It answered false
  permanently, and toggle(), which branches on it, disabled once and never
  enabled again. Progress publishes isDisabled directly, so a disabled progress
  indicator reported itself enabled. isDisabled() now reads the attribute that
  disable() writes. Inputs and button roots are unchanged.

### Tests

- The withCheckable and withDisabled suites were saved without the .test.ts
  suffix, so the runner never collected their 24 tests. They run now. Six
  asserted an API the enhancer never had and were corrected, and one passed
  only because the class it checked for could never appear.
- CI now fails any file under test/ that defines tests the runner would not
  collect.

## [0.9.1] - 2026-09-16

A security patch. Five places rendered untrusted input as markup, or assigned a
URL without checking its scheme. Component configuration is frequently
CMS-shaped, so none of these values are reliably author-controlled.

**Not changed:** The carousel's content option still accepts a string of markup. That is
  documented behaviour with a node alternative beside it, so narrowing it is a
  breaking change rather than a fix, and it waits for a version that can carry
  one.

### Added

- safeUrl and isSafeUrl in core utils, an allowlist of http, https, mailto, tel,
  ftp and sms. Relative URLs, fragments and query-only URLs have no scheme and
  pass, since they cannot execute. A refused URL yields an empty string, leaving
  an inert control rather than breaking the page around it.

### Fixed

- Card: text was interpolated into innerHTML, so an app binding comments or CMS
  copy to it had an XSS sink with no way to opt out. It is set as text now. The
  html option is untouched: that is the documented markup path, and text was
  never documented as accepting markup.
- Search: the suggestion label and the query were wrapped in <strong> as a
  string and fed to innerHTML. The highlight is built from text nodes now. The
  exploitable case was a suggestion that did not match the query, where the text
  was passed through unchanged.
- Carousel and navigation rail: the slide buttonUrl, the slide image and the
  destination href accepted javascript: URLs, which turn a styled control into
  one that runs script when a user clicks it.
- createElement: the options spread wrote every unreserved key as an attribute,
  so spreading CMS-shaped props could attach onclick or onerror. Keys matching
  /^on[a-z]/i are refused; listeners belong on forwardEvents or addEventListener.
- Attributes: href, src and action are scheme-checked at every path that sets
  them, not at the call sites — the single-attribute fast path, the
  multi-attribute loop, the batched operations, and a fourth setter in
  core/dom/utils that also attached on* keys as real listeners.

## [0.9.0] - 2026-09-16

The M3 audit release. Every component that had never been checked against
its Material 3 tokens was audited, and the findings that were defects
rather than drift are fixed. Nothing here is a new API: it is the library
doing what its own tokens already said.

### Changed

- Tabs: the stylesheet addressed classes the component never emits, so the
  icon sizing, the label rules, the icon-only label hiding and the badge
  offsets were all inert. They apply now, and tab icons are 24dp rather
  than the button's 20px. The active indicator is 3dp in both variants and
  takes the primary colour (the secondary variant was 2px and on-surface),
  a tab paints one state layer instead of two, a non-scrollable row shares
  its width evenly, and a scrollable row is padded 52dp at both edges.
- Tooltip: no tooltip CSS shipped at all. The stylesheet was registered in
  neither the full bundle nor the selective manifest, so every consumer got
  a working component with no styling. It ships now.
- Checkbox: the interactive size is 48dp, up from a 40px row that had no
  minimum width, so an unlabelled checkbox was as wide as its 18px icon.
- Checkbox, radios and switch: disabled states use the per-role tokens
  instead of one opacity over the whole control. The switch's disabled
  track is 12% and its selected handle is Surface at full opacity; radios
  no longer compound two dimmers to roughly 23% against a specified 38%.
- State layers: seventeen rules across chips, datepicker, dialog, radios,
  tabs and timepicker used 0.12, the Material 2 figure, where M3 specifies
  0.08 hover and 0.10 focus and pressed. 0.12 is kept where M3 asks for it,
  on disabled containers and on selected container fills.

### Fixed

- Badge: a badge created through a tab or through withBadge rendered empty,
  because the hosts passed content where the config reads label.
- Date picker: the calendar surface had no shadow. v.elevation('level3')
  missed the hyphenated map key, so Sass dropped the declaration outright.
- Divider: an inset divider overflowed its parent, having been given
  margins on top of width 100%.
- Date picker: the outside-click listener is taken off the document on
  destroy.

### Internal

- No ESLint findings in src, and lint runs in CI. pipe and compose are
  typed with overloads, guarded by a compile-fail fixture proving the rest
  overload cannot swallow a mismatched pipe.
- The touch-target mixin states its offsets rather than over-constraining
  them; the over-constrained form anchored the target off-centre under RTL.

## [0.8.0] - 2026-09-15

The Material 3 expressive release. Components are aligned with the M3
expressive tokens, several are new or rebuilt, and the package ships ESM
modules with selective stylesheets.

### Added

- Components: bottom sheet, side sheet, split button, loading indicator,
  standalone navigation rail (collapsed, expanded, modal), vertical menu
  variant.
- Button: toggle buttons with the M3 selected colours and shape swap,
  shape hooks, toggleOnClick. Button group: connected kind, single and
  multi selection, size tokens, labels on the selected button only.
- FAB: medium size. Extended FAB: small, medium and large sizes.
- Select: menu options that escape a clipping container.
- Styles: M3 spring motion tokens; shape scale and typescale as custom
  properties; selective style entry points (mtrl/styles/*) and themes
  (mtrl/themes/*); a legacy theme.

Changed and fixed, by component

- Button, icon button, button group, split button: sizes, shapes, colours,
  states and press morph from the M3 tokens; icon button round shapes are
  pills whose press morph animates, the 48dp target of the two small sizes
  takes the pointer, and the toggle listener is released on destroy. In a
  standard button group every neighbour makes room for a pressed button, and
  connected groups press without flashing square corners.
- FAB and extended FAB: elevation 3/4/3/3 (lowered 1/2/1/1), disabled
  styles from real theme roles, large icon 32px, initial value and user
  classes kept.
- Carousel: rebuilt on the M3 keyline strategy with native scrolling.
- Drawer: expressive active indicator, navigation semantics and modal
  lifecycle. Navigation rail: expressive selection and expansion motion.
- Menu, dialog, snackbar, progress, slider, card, textfield: M3 tokens,
  accessibility and listener cleanup on destroy.
- Core: components own their cleanup; setup overhead reduced.
- Theme: state layers with color-mix; data-theme observed on <html>.
- Package: component barrels re-export their types as types; the exports
  map describes what is published.

### Changed

- **Breaking:** createSheet, SheetConfig and SheetComponent are removed. The component
  never worked (open and close threw). Use createBottomSheet or
  createSideSheet.
- **Breaking:** FAB and extended FAB: variant 'primary', 'secondary' and 'tertiary' now
  mean the tone styles (primary on on-primary, and so on). The former look
  is 'primary-container', 'secondary-container' and 'tertiary-container',
  and 'primary-container' is the default. 'surface' is deprecated.
- **Breaking:** Extended FAB: the label uses title-medium at the default small size
  (was label-large), and iconPosition 'end' now places the icon after the
  label (it was ignored before).
- **Breaking:** Segmented button: deprecated in favour of createButtonGroup with
  kind 'connected'. SegmentedButtonEvent now declares the payload the
  component sends, { selected, value, oldValue }. Default, comfortable and
  compact heights are 40, 36 and 32px (4px taller than before).
- **Breaking:** Slider: decoration is DOM and CSS; the .mtrl-slider-canvas element is
  gone, so styles targeting it must be updated.
- **Breaking:** Package: the 'development' export condition that resolved to src is
  removed; every entry resolves to dist. sideEffects lists the CSS, SCSS
  and style modules instead of false, so bundlers keep stylesheet imports.
- **Breaking:** Custom properties: every component custom property is
  --mtrl-<component>-<name>, with no aliases for the old names. Renamed:
  --button-group-gap, -height, -icon, -inner-corner, -pressed-corner and
  -radius to --mtrl-button-group-*; --card-elevation to
  --mtrl-card-elevation; --checkmark-color to --mtrl-chip-checkmark-color;
  --drawer-width to --mtrl-drawer-width; --extended-fab-gap, -height,
  -icon-size, -padding and -radius to --mtrl-extended-fab-*; --item-offset
  to --mtrl-list-item-offset; --segment-* to --mtrl-segmented-button-*.
  --mtrl-carousel-corner, --mtrl-carousel-fade, --mtrl-slider-color and
  --mtrl-slider-on-color keep their names.
- **Breaking:** Typescale: title-large uses weight 400 (was 500), as M3 specifies. The
  medium extended FAB, full-screen dialog title, card header title, side
  sheet title, top app bar headline and h4 follow.

### Internal

- CI runs types, tests, build, package size and browser checks on every
  push and pull request; releases publish to npm with trusted publishing
  from a version tag.

[Unreleased]: https://github.com/floor/mtrl/compare/v0.10.0-next.3...HEAD
[0.10.0-next.3]: https://github.com/floor/mtrl/compare/v0.10.0-next.2...v0.10.0-next.3
[0.10.0-next.2]: https://github.com/floor/mtrl/compare/v0.10.0-next.1...v0.10.0-next.2
[0.10.0-next.1]: https://github.com/floor/mtrl/compare/v0.10.0-next.0...v0.10.0-next.1
[0.10.0-next.0]: https://github.com/floor/mtrl/compare/v0.9.8...v0.10.0-next.0
[0.9.8]: https://github.com/floor/mtrl/compare/v0.9.6...v0.9.8
[0.9.6]: https://github.com/floor/mtrl/compare/v0.9.5...v0.9.6
[0.9.5]: https://github.com/floor/mtrl/compare/v0.9.4...v0.9.5
[0.9.4]: https://github.com/floor/mtrl/compare/v0.9.3...v0.9.4
[0.9.3]: https://github.com/floor/mtrl/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/floor/mtrl/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/floor/mtrl/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/floor/mtrl/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/floor/mtrl/compare/v0.7.1...v0.8.0
