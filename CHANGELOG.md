# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog starts at 0.8.0, the first release with written notes (September 2026).
Earlier versions are in the [git history](https://github.com/floor/mtrl/commits/main).

## [Unreleased]

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

[Unreleased]: https://github.com/floor/mtrl/compare/v0.10.0-next.1...HEAD
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
