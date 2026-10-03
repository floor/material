## [3.0.0] - YYYY-MM-DD

### Migrating from 0.10.x

Upgrade to the latest `mtrl` 0.10.x first, then change the package name to `material` (version 3) and
follow this guide. The latest 0.10.x exports the 3.0.0 names beside the old ones, and marks
deprecated the TypeScript names, options and constants that 3.0.0 removes, so your editor flags
each use with its replacement. Two of those warnings can't be cleared before you upgrade, because
the new name exists only in 3.0.0: `SELECT_CLASSES.TEXTFIELD` (its new key is `TEXT_FIELD`) and
`select.textfield` (3.0.0 has `select.textField`). Clear the others, then upgrade. Each change's full entry follows this guide.

**Packages and imports**

- **ESM only.** `require('material')` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. Use `import`, or
  `await import('material')` from CommonJS.
- **The root keeps the components.** The composition core, the DOM, timing and store helpers and
  the progress canvas code are imported from their subpaths, under the same names
  (`import { pipe } from 'material/core/compose'`). The
  [migration table](https://github.com/floor/material/blob/main/scripts/fixtures/root-exports.md)
  gives every one.
- **`material/core/<area>` only.** A path under an area no longer resolves:
  `mtrl/core/compose/features` becomes `material/core/compose`, which exports the same names
  (`withLifecycle` among them).
- **Folders inside a component no longer resolve** (`mtrl/components/chips/chip`,
  `…/features`): they held internals, with no replacement.
- **Vue 3.4.20 or newer.** With `skipLibCheck: false`, `@types/react` 18.2.71 or newer.

**Renamed**

| 0.10 | material 3.0.0 |
|---|---|
| `createTextfield`, `TextfieldConfig`, `TextfieldComponent`, `TextfieldDensity`, `TextfieldEvents`, `TextfieldValuePayload`, `TextfieldFocusPayload`, `TextfieldTrailingPayload` | `createTextField`, `TextFieldConfig`, `TextFieldComponent`, `TextFieldDensity`, `TextFieldEvents`, `TextFieldValuePayload`, `TextFieldFocusPayload`, `TextFieldTrailingPayload` |
| `TEXTFIELD_VARIANTS`, `TEXTFIELD_STATES`, `TEXTFIELD_TYPES`, `TEXTFIELD_EVENTS`, `TEXTFIELD_DENSITY`, `TEXTFIELD_DEFAULTS`, `TEXTFIELD_CLASSES` | `TEXT_FIELD_VARIANTS`, `TEXT_FIELD_STATES`, `TEXT_FIELD_TYPES`, `TEXT_FIELD_EVENTS`, `TEXT_FIELD_DENSITY`, `TEXT_FIELD_DEFAULTS`, `TEXT_FIELD_CLASSES` |
| `textfieldElement`, `defineTextfield`, `TextfieldSpec`, `TextfieldElement`, `TextfieldElementComponent` (`mtrl/elements`) | `textFieldElement`, `defineTextField`, `TextFieldSpec`, `TextFieldElement`, `TextFieldElementComponent` |
| `Textfield` (`mtrl/react`, `mtrl/solid`, `mtrl/svelte`), `MTextfield` (`mtrl/vue`) | `TextField`, `MTextField` |
| Sass `$textfield`, `textfield()` | `$text-field`, `text-field()` |
| `SELECT_CLASSES.TEXTFIELD` | `SELECT_CLASSES.TEXT_FIELD`, its value is `select__text-field`. A recorded exception: 0.10.x flags the old key but has no new one, so change it when you upgrade. In material 3.0.0 the old key reads `undefined`. |
| `select.textfield` | `select.textField`. A recorded exception, like the key above: 0.10.x flags the old name but has no `textField`, so rename it when you upgrade. In material 3.0.0 `select.textfield` reads `undefined`. |
| `<m-textfield>` | `<m-text-field>`. The old tag is not defined: it renders nothing. |
| the classes `mtrl-textfield`, `mtrl-textfield__…`, `mtrl-textfield--…` | `mtrl-text-field`, `mtrl-text-field__…`, `mtrl-text-field--…` |
| `::part(textfield)` on the text field and on `<m-select>` | `::part(text-field)` |
| `mtrl/components/textfield`, `mtrl/components/textfield/constants`, `mtrl/styles/textfield`, `mtrl/elements/css/textfield` | the same with `text-field`. 0.10.7 resolves both spellings. |
| `setComponentDefaults('textfield', …)`, `setGlobalDefaults({ textfield: … })` | the key `'text-field'` |
| `CardSchema` | `CardConfig` |
| the time picker's config option `isOpen`, and its default `TIMEPICKER_DEFAULTS.IS_OPEN` | `open` and `TIMEPICKER_DEFAULTS.OPEN`, as on the dialog and the drawer. `isOpen()` is the method that reads the state |
| `TopAppBar`, `BottomAppBar` (the factory types) | `TopAppBarComponent`, `BottomAppBarComponent` |
| a chip's `text` | `label` |
| tabs `indicatorHeight`, `indicatorWidthStrategy` | `indicator.height`, `indicator.widthStrategy` |
| shapes `'cookie4'`, `'cookie9'` | `'cookie4Sided'`, `'cookie9Sided'` |
| `createElement({ rawClass })` | `class` or `className` |
| the tooltip's `rich` | `variant: 'rich'` |
| `onToggle` on the icon button (`mtrl/react`, `mtrl/vue`, `mtrl/solid`; `ontoggle` in `mtrl/svelte`) | `onChange` (`onchange`), whose `event.detail` is `{ selected, value }`. A leftover is a type error: `… is not assignable to type '"onToggle was removed in material 3.0.0: use onChange"'`. |

**Removed, with what to use instead**

| 0.10 | material 3.0.0 |
|---|---|
| the icon button's DOM `toggle` event | `change`, on the factory's button (`button.on('change', …)`) and on `<m-icon-button>` |
| segmented buttons (`createSegmentedButton`, `createSegment`) | `createButtonGroup({ kind: 'connected' })`: see its entry for the option mapping |
| the themes `material`, `winter`, `browngreen`, `legacy` | `baseline`, `ocean`, `brownbeige`; `legacy` has none |
| FAB and extended FAB `variant: 'surface'`, `FAB_VARIANTS.SURFACE`, `EXTENDED_FAB_VARIANTS.SURFACE` | a container or tone style (`'primary-container'`, `'primary'`, …) |
| FAB `size: 'small'`, `FAB_SIZES.SMALL`, `FAB_CLASSES.SMALL`, `FAB_ICON_SIZES.SMALL` | `'default'`, `'medium'` or `'large'` (the extended FAB keeps `small`) |
| `getThemeColor('sys-color-X-rgb')` | `getThemeColor('sys-color-X', { alpha })` |
| `TIMEPICKER_CLASSES` | `TIMEPICKER_SELECTORS`, which is not a like-for-like swap: see its row |
| `TABS_DEFAULTS.INDICATOR_HEIGHT`, `INDICATOR_ANIMATION_DURATION` | `indicator.height`, `indicator.animationDuration` |
| `DEFAULT_DATE_FORMAT` from `mtrl/components/datepicker` | the same from `material/components/datepicker/constants` |
| the shape steps `extra-tiny`, `tiny`, `pill` | literal `1px`, `2px`; `full` for `pill` |
| Sass `$mtrl-sys-shape` | `v.shape(<step>)` |
| `select.menu` (the menu inside a select) | the select's own `open()`, `close()`, `isOpen()`, `getOptions()`, `setOptions()` and its `open`, `close` and `change` events. The `menu` config option (`container`, `maxHeight`, …) stays |
| `splitButton.menu` (the menu inside a split button) | `expand()`, `collapse()`, `isExpanded()`, the `expand`, `collapse` and `select` events, and the new `setItems()` and `getItems()` |
| `progress.canvas`, `progress.track`, `progress.indicator`, `progress.buffer` (the element), `progress.resize()` | for the canvas, `progress.element.querySelector('canvas')`; nothing for `resize()`, the component observes its own size. `setBuffer()` and `getBuffer()` are unchanged |

Removed with nothing in their place, because nothing read them or they had no effect: a dialog
button's `color`, `TOOLTIP_DEFAULTS.RICH`, the checkbox's `variant`, `CheckboxVariant` and
`CHECKBOX_VARIANTS`, the list's `prefix`, the radios' `rippleConfig` and `RADIO_VARIANTS`,
`RADIO_LABEL_POSITIONS`, `RADIO_SIZES`, `RADIO_CLASSES`, `RADIO_DEFAULTS.VARIANT`,
`.LABEL_POSITION` and `.SIZE`, tabs' `maxVisibleTabs`, the time
picker's `closeOnSelect` and `TIMEPICKER_DEFAULTS.CLOSE_ON_SELECT`, `TIMEPICKER_DIAL`,
`TIMEPICKER_Z_INDEX`, `TIMEPICKER_SELECTORS.MODAL`, `DIAL_CANVAS` and `DIAL_HAND`, six
`SLIDER_MEASUREMENTS` keys, `TABS_DEFAULTS.INDICATOR_ANIMATION_TIMING` and `ICON_SIZE`,
`TEXT_FIELD_CLASSES.LABEL_FLOATING`, `rippleConfig.timing` and `.opacity` with their defaults,
the card, tabs and switch internals on their subpaths, `ChipConfig`'s `managedSelection` and
`cell`, `CardComponent`'s `loading`, `expandable` and `swipeable`, and the list `scroll` payload's
`component`, which was never sent.

**Reserved before 3.0.0.** `mtrl` 0.10.7 marks deprecated, so your editor flags each use,
`ProgressComponent`'s `canvas`, `resize`, `track`, `indicator` and `buffer` (the table above).
Nothing marks the other three, so search for them: the slider's `components`, which is
internal in 3.0.0 and was never on the public `SliderComponent` type (TypeScript already
rejects it; use the slider's own API and `slider.element`); an import from
`mtrl/core/compose/features`, whose names are imported from `material/core/compose`; and a
read of `tab.badge` without a guard, since it may be `undefined` until the badge is shown
(a strict TypeScript project is already told; `setBadge()`, `getBadge()`, `showBadge()` and
`hideBadge()` work either way).

**Sass.** The two Sass rows above are for stylesheets that `@use` material's sources. The Sass sources
ship for reference; configuring them with `@use … with` is not a supported API in material 3.0.0. Theme
with CSS custom properties.

**Type changes the compiler reports.** Besides renames and removals, seven entries below change
a type your code may rely on: tabs' `on` and `off` take a closed event map, and a tab's `click`
payload is wrapped; React's and Solid's `Button` type their own `onChange`, so a
spread of full `HTMLAttributes` must omit it; `SelectChangeEvent["value"]` is
`string | null`; the chip set's `change` listener takes one object, not an array
and a second argument; a standalone chip's `onChange` and `onClick` take their
event's payload; and `emit` on the card and the tabs takes only the
component's own events, with their payloads. A config `on*` option is its event's listener
type: `onConfirm: (time: string) => void`, search `onInput` / `onSubmit:
(value: string) => void`, and `onSuggestionSelect: (suggestion: SearchSuggestion)
=> void` are errors. A `() => void` callback is still assignable, so search
`onClear`, `onExpand` and `onCollapse`, and the navigation rail's `onExpand`
and `onCollapse`, are not. The search's `expand` and `collapse` are typed with the
object they emit, `SearchStateEvent` (`{ component, state, viewMode }`), in `on()`, `off()`,
the `on` map and `onExpand` / `onCollapse`: they were typed `SearchEvent`, so
`event.value` and `event.preventDefault()` there are now errors (they were `undefined`
and a `TypeError` at run time, measured), `event.state` and `event.viewMode` compile, and
a listener annotated `(event: SearchEvent) => void` on those two is an error. The
`<m-search>` component's `on` and `off` take the same map with the element's names
(`open` and `close` carry the `SearchStateEvent`), so a name outside it is an error too. The
`<m-timepicker>` component's `on` and `off` take the time picker's event map
(`TimePickerEvents`) in place of any string and an untyped handler: a name outside
it is an error, and each handler's argument is typed, so one annotated with another type, or
an argument on `open`, `close` or `cancel`, is an error. The time picker's `isOpen` is a
method: `picker.isOpen === true` and assigning it to a `boolean` are errors.
`SnackbarState` gains `"queued"`, so a `switch` over it that had to be exhaustive is not.
The menu's and the select's `open` and `close` payloads (`MenuEvent`, `SelectEvent`) and the
select's `change` payload (`SelectChangeEvent`) have no `preventDefault` and no
`defaultPrevented`: none of these events could ever be cancelled, so
`event.preventDefault()` in such a listener is an error. The menu's `select`, where it keeps
the menu open, keeps both. `ProgressComponent` has no `canvas`, `resize`, `track`, `indicator`
or `buffer`: reading one is an error (TS2339). An import from a path under a core area,
`material/core/compose/features`, is an error too (TS2307).

**Changes your compiler won't catch**

Check these by searching your code: they compile, or come from plain JavaScript, markup or CSS.

- **An app with its own contrast switch** adds `import 'material/styles/contrast'` (and
  `material/themes/<name>-contrast` for a theme it imports on its own). Without that import,
  `data-theme-contrast="medium"` or `"high"` changes no colour, and nothing warns.
  Measured on the unthemed root: with the OS asking for more contrast, `data-theme-contrast="high"`
  stays standard primary `#6750a4`, not high `#312259`. The OS preference (`prefers-contrast: more`)
  still selects high contrast from `material/styles/base`. Import `material/styles/contrast` after
  `material/styles/base`, as with `material/styles/typography`: the opt-in sheets share that cascade
  layer. The contrast colours are the same in either order. `data-theme-contrast` is read
  on the element that carries `data-theme`, or on the root when the page has no `data-theme`;
  on any other element it does nothing (that element inherits its themed ancestor's level).
- **A chip's `{ text }`** renders an empty chip, silently: no label, no error, no warning.
- **Tabs `indicatorHeight` / `indicatorWidthStrategy`** are ignored: the indicator falls back to
  its variant's height (3px on a primary row, 2px on a secondary one) and automatic width.
- **`materialShape('cookie4')`** throws `TypeError: byName[name] is not a function`.
- **`createElement({ rawClass })`** applies no class and writes the value out as an attribute:
  `<div rawclass="legacy-a legacy-b">`. On a component's config a leftover `rawClass` does
  nothing.
- **A listener on the icon button's `toggle` event** never fires: no error, and the button still
  toggles. Listen to `change`. In the React, Vue, Svelte and Solid components the compiler does
  catch it: `onToggle` (Svelte: `ontoggle`) on the icon button is a type error.
- **`select.textfield`** in JavaScript is `undefined`.
- **The text field's classes, parts and defaults key are `text-field`.** A page rule on
  `.mtrl-textfield…` or `::part(textfield)` matches nothing, a `classList` call with the old
  class changes nothing, and defaults set under `'textfield'` are ignored. Nothing warns.
  Search your CSS and your code for `textfield`.
- **A select made with `createSelect()` no longer fills its container.** Unsized, it is
  280px wide, as a text field is; it was as wide as what held it. Nothing warns: a form
  whose selects spanned their column now shows them 280px wide. Search for `createSelect(`
  and give each select that should fill its container a width
  (`.mtrl-select { width: 100%; }`).
- **A text field with a prefix or a suffix has no inline padding.**
  `field.input.style.paddingLeft` and `paddingRight` read `''`, and the label has no inline
  `left`: the stylesheet pads the input from `--mtrl-text-field-prefix-width` and
  `--mtrl-text-field-suffix-width`, which the field writes on its root. A page rule that set
  the padding of `.mtrl-text-field__input` beside an affix was overridden by the inline value
  and now competes with the stylesheet's rule.
- **A FAB's `'surface'` or `'small'`** (the options take any string) renders as the default
  `primary-container`, or at the default 56dp.
- **`data-theme="winter"`** (or `material`, `browngreen`, `legacy`) on the root element gets the
  baseline colours in the OS's colour scheme, and `data-theme-mode` and `data-theme-contrast` on
  that element are ignored. The OS contrast preference (`prefers-contrast: more`) is not applied
  there either: a user who asked for more contrast gets standard contrast. On a nested element
  it matches no rule, so that element keeps its ancestor's colours.
- **`getThemeColor('sys-color-primary-rgb')`** returns `''` (or the `fallback`), so
  `rgba(${…}, 0.12)` yields `rgba(, 0.12)`, a colour CSS and canvas drop silently.
- **A removed constant key** reads `undefined` in JavaScript, with no error:
  `SELECT_CLASSES.TEXTFIELD`, `FAB_SIZES.SMALL`, `TABS_DEFAULTS.INDICATOR_HEIGHT` and the other
  keys in the tables above.
- **Your own CSS reading `var(--mtrl-sys-shape-corner-pill)`** (or `-tiny`, `-extra-tiny`): material's
  stylesheet no longer declares the property, and a `var()` of an undeclared property without a
  fallback gives no value, so the radius is lost silently.
- **`material/styles/base` no longer carries typography.** Without
  `import 'material/styles/typography'`, `.mtrl-display-large` … `.mtrl-label-small`,
  `.mtrl-text-center` / `left` / `right`, `.mtrl-font-thin` / `light` / `regular` /
  `medium` / `bold`, and `.mtrl-truncate`, `-2` and `-3` do nothing, and `h1`–`h6` and `p`
  lose material's type styles. Measured in Chromium with only the base stylesheet: a
  `<div class="mtrl-headline-small">` computed `font-size: 14px`, inherited from `body`
  (with the import it is `24px`).
  `getPropertyValue('--mtrl-sys-typescale-title-large-font-size')` returned `""`, and an
  element styled `font-size: var(--mtrl-sys-typescale-title-large-font-size)` inside a parent
  at `32px` computed `32px`: the custom property is undefined, so the declaration is invalid
  at computed-value time and `font-size` inherits (with the import the property is `22px`
  and the element computes `22px`). Body text keeps its font: `body` stayed `14px`
  `Roboto, sans-serif`. `import 'material/styles'` is unchanged. The typography sheet has to
  load after the base (both style `h1`–`h6` and `p`; loaded first, it loses its bottom
  margins to the reset): `import 'material/styles/typography'` imports the base first itself, and
  a page using `<link>` tags puts `styles/typography.css` after `styles/base.css`.
- **A bundle that evaluates an element CSS module (`material/elements/css/…`) in an earlier task than `define…()`** (a lazy route, a deferred hydration) no longer reserves that element's box in between. On a framework SSR page that does not load the `material/ssr` bridge (Next.js, Nuxt, SvelteKit, SolidStart), the hosts arrive with no shadow root, and the reserved box between the server HTML and hydration is gone. Put `<link rel="stylesheet" href="…/material/elements/preupgrade.css">` in `<head>`, or `import 'material/elements/preupgrade.css'` (one element: `material/elements/preupgrade/<name>.css`). The link also reserves the box from the first paint, before any script. With the bridge loaded, the hosts already have their shadow roots and nothing is lost.
- **Tab and panel ids** change for any value with a character outside `[A-Za-z0-9_-]`
  (`a.b` → `tabx-g-a_2e_b`); a hand-written panel with the old id is never linked. Build ids with
  `tabIdFor` and `tabPanelIdFor`.
- **Checkbox and switch `change.value`** is the boolean checked state; the HTML string token is
  `valueAttribute`, also in `event.detail`.
- **The chip set's `change`** hands its factory listener and `onChange` one plain object,
  `{ value, selected, changed }`, not an array with the changed value as a second argument. In
  a leftover handler `event[0]` and `event.length` are `undefined`, `[...event]` and
  `event.includes(x)` each throw a `TypeError` (the message is the engine's), and a second
  parameter is `undefined`. Read `selected` and `changed`. `onChange` hears the same changes
  as `on("change")`, including `selectByValue(values, true)`, with `changed: null`.
  `selectByValue(values)` and `clearSelection()` stay silent.
- **A chip's config `on*` options** are the matching event's listener. A leftover
  `onChange(selected, chip)` on a chip alone is called with one object: `selected` is
  `{ selected, chip, value }` (so `selected` is always truthy, and the boolean is
  `selected.selected`; deselecting a chip valued `"old"` passes
  `{ selected: false, chip, value: "old" }`), and the second parameter is `undefined`.
  A leftover `onClick(chip)` is called with `{ event, originalEvent, element }`:
  `element` is the chip's root, and the value is not the chip (`focus` is `undefined`).
  The set's `onChange` now hears `selectByValue(values, true)`. A chip in a set emits
  its own `change` when it is clicked, and the item's `onChange` receives that payload.
  A leftover `onChange(selected, chip)` on that item is called with one object, as on a
  chip alone: `selected` is `{ selected, chip, value }` (measured on a filter chip valued
  `"old"`: selecting passes `{ selected: true, chip, value: "old" }`, deselecting passes
  `{ selected: false, chip, value: "old" }`), and the second parameter is `undefined`.
  `setSelected` and `selectByValue` do not emit the chip's `change`. A single-select click
  emits `change` on the clicked chip only; the chip it replaces is updated with
  `setSelected`, which stays silent.
- **A chip's `onClick` and `click` listeners run before the chip toggles**, alone or in a
  set: `chip.isSelected()` inside them is the state before the click. A chip alone used to
  toggle and emit `change` first. Read the new state in `onChange` or a `change` listener,
  which follows.
- **A chip's `change` is emitted only when the selection changed.** In a
  `selectionRequired` set, a click on the last selected chip is refused: it used to emit
  `change` on the chip and on the set, with the chip still selected, and call both `onChange`.
  It now emits none, the item's `onSelect` is not called, and `<m-chips>` dispatches no
  `change`; `click` and `onClick` still report the press.
- **A chip's `remove` listeners in a set run before the set removes the chip.** The item's
  `onRemove` and a `chip.on("remove")` listener find the chip still in `getChips()` and on the
  page; the set then destroys it and emits its own `remove`. A listener added with `on` used
  to run after the set had destroyed and unlisted the chip.
- **The time picker's `isOpen` is a method, `isOpen()`.** A leftover
  `if (picker.isOpen)` compiles in JavaScript and is always true: `picker.isOpen` is now a
  function. Call it.
- **The time picker's config option `isOpen` is `open`.** TypeScript reports a
  leftover in an object literal. In JavaScript `createTimePicker({ isOpen: true })` is
  ignored: the picker stays closed (measured). `TIMEPICKER_DEFAULTS.IS_OPEN` is
  `TIMEPICKER_DEFAULTS.OPEN`; a leftover reads `undefined`.
- **A snackbar waiting behind another is `"queued"`, not `"visible"`.** Right after
  `show()`, `snackbar.state === "visible"` is true only if nothing else was on screen; it was
  true at once. Use `snackbar.isOpen()`, or listen to `open`, which is emitted together with
  the state turning `"visible"`.
- **A snackbar hidden while it is queued emits no `close` and no `dismiss`.** It
  was never open. It used to emit both, and was then shown anyway at its turn, with
  `state` `"hidden"` and no way to hide it (measured). It now leaves the queue.
- **A docked date picker opened with `open()` from a click outside it stays open.** That
  click used to count as a click outside and closed it in the same task (measured: `open`,
  then `close`). The next click outside closes it.
- **Chip-set `add` and `remove`** factory handlers receive `{ value, chip }` and
  `{ value, chip, chipValue }`, not the chip; `<m-chips>`'s `remove` detail `value` is the
  remaining selection, and the removed id is `chipValue`.
- **The time picker's `input`** carries the committed time in `value` while the picker is open;
  the live draft is `draftValue`. Factory `confirm` listeners and `onConfirm` receive `{ value }`.
  A leftover `onConfirm: (time) => { input.value = time }` stores `"[object Object]"` (measured).
- **Search `onInput` and `onSubmit`** receive the `SearchEvent`. A leftover
  `` onSubmit: (query) => `${query}` `` is `"[object Object]"` (measured); read `event.value`.
- **Search `onClear`** receives the `SearchEvent`. It was declared with no argument and was
  called with the query string, `""` after a clear. A leftover template of the argument is
  `"[object Object]"` and `.length` is `undefined` (measured). The query is `event.value`, `""`
  after a clear.
- **Search `onSuggestionSelect`** receives the `SearchEvent`. `` `${suggestion}` `` was already
  `"[object Object]"`; `suggestion.text` is now `undefined` (measured). The text is
  `event.suggestion.text` (measured `"Apple"`).
- **Search `onExpand` and `onCollapse`, and the navigation rail's `onExpand` and `onCollapse`,**
  were called with no argument, so a template of it was `"undefined"`. Each now receives the
  event's object, and a template of that argument is `"[object Object]"` (measured). The rail's
  object is `{ expanded: true }` or `{ expanded: false }`. Search `expand` and `collapse` emit
  `{ component, state, viewMode }` and are declared as `(event: SearchStateEvent) => void`,
  which is what `on("expand")` accepts; that emitted object is unchanged, so `event.value` and
  `event.preventDefault` are not on it.
- **The button group's `on` map** (`click`, `focus`, `blur`, `change`) was accepted and never
  called. Those handlers now run, with the listener's argument. The type is unchanged, so this
  is not a compile error. The segmented-button note that `on.change` keeps its meaning describes
  this.
- **Options whose argument was already the event's** now run first, before a listener added with
  `on()`: time picker `onChange`, `onInput`, `onOpen`, `onClose` and `onCancel`; navigation rail
  and navigation bar `onSelect`; drawer `onSelect`, `onOpen` and `onClose`; text field
  `onTrailingClick`; the chip set's `onChange`, and a chip's `onRemove` and `onTrailingClick`.
  Time picker `onChange` is also the same `{ value }` object `change` emits,
  not a second one.
- **An empty selection is `null`, not `""`,** in the select and the radios, factory and element:
  the `change` payload's `value`, and the radio factory's `getValue()`. A comparison with `""`
  is never true.
- **The carousel's `change`** carries `value` alone: `event.index` (and `event.detail.index` on
  `<m-carousel>`) is `undefined`. Read `value`.
- **A `withInput` you compose yourself** (`material/core/compose`) works on the checked boolean,
  like the checkbox and the switch: `change.value` and `getValue()` are booleans, and
  a leftover `setValue('x')` checks the input and leaves its string unchanged (`setValue('')`
  unchecks it), with no error. The string is `valueAttribute` in the payload, and
  `getValueAttribute()` / `setValueAttribute()`. No `value` event is emitted.
- **A trailing icon without `trailingIconLabel`** is hidden from screen readers and loses its
  pointer cursor; a click listener you added to it is out of their reach. The label is the
  factory's (`trailingIconLabel`, or `setTrailingIcon(html, label)`); on `<m-text-field>` and in
  the framework components a trailing icon is decorative.
- **The button group's `select(value)`** with a value no button carries clears the selection,
  with a warning in development and no event.
- **`<m-button>`** dispatches `change` for a toggle button.
- **A dialog's `open` listener added after calling `open()`** never runs: `open` is emitted
  inside the call. `dialog.open(); dialog.on('open', build)` opens an empty dialog, with no
  error. Add the listener before `open()`, or listen to `afteropen`.
- **A dialog's `open` listener** runs before the surface is visible and before focus is in it:
  one that measures the dialog or moves focus belongs on `afteropen`.
- **An open dialog answers Escape as soon as `open()` returns,** except the key press that
  opened it. It ignored Escape and the scrim for its first 10 ms.
- **An open dialog prevents every Escape key press that reaches the window,** even with
  `closeOnEscape: false`: a `keydown` listener of the page on the window that runs after it
  sees `event.defaultPrevented` true, and nothing else the browser does for Escape happens
  while a dialog is open. A listener on the document, or inside the dialog, runs before it.
- **`dialog.close()` on a closed dialog and `dialog.open()` on an open one** emit nothing. Code
  that counted on `close` or `afterclose` from a `close()` called "to be sure" no longer hears
  them.
- **A menu's `close` listener** runs inside `close()`, 50 ms earlier than it did: the menu is
  still in the document and still has its visible class. One that read the DOM expecting the
  menu gone must wait for the fade (350 ms). The same for a select's `close`, a split
  button's `collapse` when the user dismisses its menu, and a FAB menu's `close` in its
  `menu` presentation.
- **A listener for `open` or `close` on `<m-menu>` or `<m-fab-menu>`** no longer hears an
  opening or a closing made by setting or removing the `open` attribute (or the property):
  that is applied at once and dispatches nothing, as on `<m-dialog>`. Code that set the
  attribute and waited for the event waits for ever; read the state on the next line, or call
  `show()` / `hide()`, which dispatch.
- **`fabMenu.isOpen()` right after `open()`** is true in the `menu` presentation too, before
  its surface exists. An `open` listener that reads the menu's surface must wait for it; a
  second click on the FAB before the surface has arrived now closes the menu.
- **`event.preventDefault()` in a menu's or a select's `open` or `close` listener, or in a
  select's `change` listener,** throws a `TypeError` in JavaScript: the payload has no such
  method any more. It never did anything there; remove the call.
- **`menu.close(); menu.open()`** reopens the menu. The `open()` was ignored for the 50 ms
  the close took, so the menu ended closed.
- **`menu.isOpen()` right after `close()`** is false. Code that waited 50 ms for it no
  longer needs to; code that relied on it still being true (two menus open at once for a
  moment, a toggle read just after a dismissal) now sees the closed state.

- **List corners:** rows are 4px at rest, 16px at outer corners, 12px hovered and 16px
  focused, pressed or selected; the container is 16px. For square rows and container, set
  `--mtrl-list-item-shape`, `--mtrl-list-item-shape-outer`, `--mtrl-list-item-shape-hover`
  and `--mtrl-list-item-shape-active` to `0` on the list, an ancestor or `<m-list>`.
- **Switch and text-button layouts changed after next.1.** At `font-size: 24px; line-height: 2`,
  an upgraded unlabelled `<m-switch>` is 52 × 48px (was 52 × 56); with supporting text its
  height is 56px (was 65). Default typography is unchanged. A text button with an icon now
  reserves its upgraded insets before upgrade, removing shifts of 4px at default/XS/S,
  24px at M, 72px at L and 104px at XL. Check neighbouring content in your layouts.

### Changed (breaking)

- **`material/core/<area>` is an explicit list: seven areas, and no path under them.**
  The export map listed `./core/*`, and a `*` in an exports pattern crosses slashes: besides
  the areas it resolved a folder inside one, `material/core/compose/features`, which the
  README's "Building your own components" imported `withLifecycle()` from (in 0.10.x too).
  The map now names `material/core` and its seven areas: `material/core/canvas`, `/compose`,
  `/dom`, `/shapes`, `/state`, `/theme` and `/utils`. Any other path under `material/core`
  throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, and TypeScript reports the import (TS2307).
  Migration:

  | 0.10 | 3.0 |
  |---|---|
  | `import { withLifecycle } from 'mtrl/core/compose/features'` (and any other name from that path) | `import { withLifecycle } from 'material/core/compose'`: the same name, the same function |

  Every name `material/core/compose/features` exported is an export of
  `material/core/compose`, except `withBadge` and the types `BadgeComponent` and
  `BadgeConfig` of that feature, which no document named: they are internal; for a badge,
  use `createBadge` from `material`. `LabelManager`, the type of `LabelComponent`'s `label`,
  was only in the nested path and is now exported from `material/core/compose`.
- **Progress: `canvas`, `resize`, `track`, `indicator` and `buffer` are no longer on
  `ProgressComponent`.** They named how the indicator is drawn (one canvas; `track`,
  `indicator` and `buffer` were that same canvas under the names of an older SVG), which
  tied the public type to one way of drawing it. The objects are unchanged at run time;
  the type no longer promises them, and how the indicator is drawn may change in a later
  release. Reading `progress.canvas` in TypeScript is now an error (TS2339). Migration:
  for the canvas, `progress.element.querySelector('canvas')`; nothing replaces `resize()`,
  as the component observes its own size; `setBuffer()` and `getBuffer()`, the buffer's
  value, are unchanged.
- **Explicit contrast levels are opt-in.** `material/styles/base` and `material/themes/<name>`
  keep standard contrast and `prefers-contrast: more`. `data-theme-contrast="medium"` and `"high"`
  (material-color-utilities contrast 0.5 and 1.0; the values are unchanged) move to
  `material/styles/contrast` and `material/themes/<name>-contrast`. The full stylesheet `material/styles`
  still includes them. Without the new import the attribute changes no colour and nothing warns.
  Import `material/styles/contrast` after `material/styles/base`, as with `material/styles/typography`:
  the opt-in sheets share that cascade layer. The contrast colours are the same in either
  order (an explicit level is more specific than the standard rule, and the preference rule
  does not match once the attribute is set).
- **Typography leaves `material/styles/base`.** The base no longer carries the type
  classes (`.mtrl-display-large` … `.mtrl-label-small`), the text utilities (`.mtrl-text-*`,
  `.mtrl-font-*`, `.mtrl-truncate*`), material's styles for `h1`–`h6` and `p`, or the
  `--mtrl-sys-typescale-*` tokens, except the three the `body` rule reads
  (`--mtrl-sys-typescale-body-medium-font`, `-font-size` and `-line-height`).
  `import 'material/styles/typography'` restores what left. The full stylesheet `material/styles`
  is unchanged. Migration: without the import, a `<div class="mtrl-headline-small">`
  computed `font-size: 14px` (inherited from `body`; `24px` with the import), and
  `font-size: var(--mtrl-sys-typescale-title-large-font-size)` computed the parent's `32px`
  because the property is undefined and the declaration is invalid at computed-value time
  (`22px` with the import). Body text keeps its font (`14px`, `Roboto, sans-serif`).
- **Pre-upgrade rules leave the element CSS modules.** `material/elements/css/<name>` no longer applies `:not(:defined)` rules when the module is evaluated. The reserved box comes from `material/elements/preupgrade.css` or `material/elements/preupgrade/<name>.css` (the element's spec name), in `<head>` or as an import. A host `renderElement` or a bridge renders with a shadow root carries `data-mtrl-ssr`. The stylesheet's last rule, in `mtrl.preupgrade`, rolls that layer back for the attribute, on the host, its `::before` and `::after`, and its direct children that are not themselves elements waiting to upgrade, so the stylesheet does not style a host the server already rendered or those children. Without the stylesheet, an element has no reserved box until it is defined.

  **Migration:** a bundle that evaluates the element CSS module in an earlier task than `define…()` (a lazy route, a deferred hydration), including a framework SSR page that does not load the `material/ssr` bridge, loads `material/elements/preupgrade.css` in `<head>`. With another tag prefix, a page that set it with `configure({ prefix })` inlines `preupgradeStyles(prefix)` from `material/elements/preupgrade`; the element CSS modules no longer apply these rules.
- **Snackbar, time picker and date picker follow the overlays' one open and close rule.** When `open()` or `close()` (the snackbar's `show()` or `hide()`) returns, the
  state getter has changed and the event has been emitted; opening an open one and closing a
  closed one do nothing and emit nothing; `isOpen()` is a method on every overlay.
  - **Snackbar:** `state` is `"queued"` between `show()` and its turn on screen, then
    `"visible"`, with `open` emitted at that moment; it said `"visible"` while waiting. New
    `isOpen()`, true only while visible; `state` stays. `hide()` on a queued snackbar gives up
    its turn and emits nothing. A queued snackbar dropped by a `queueBehavior: 'replace'`
    snackbar or by `clearSnackbars()` is `"hidden"` and can be shown again; it used to stay
    `"visible"` for good, and `show()` on it did nothing. After `destroy()` the state is
    `"hidden"` (it was left as it was), and a queued snackbar that is destroyed is not shown
    at its turn.
  - **Time picker:** the `isOpen` property is the method `isOpen()`, and the config option
    that opens the picker at creation is `open`, not `isOpen` (its default is
    `TIMEPICKER_DEFAULTS.OPEN`, not `IS_OPEN`): one name was a config key and a method on the
    same component.
  - **`<m-snackbar>`:** its `open` property is `false` while the snackbar waits behind
    another, and `true` from its `open` event; it was `true` as soon as `show()` was called.
  - **Date picker:** new `isOpen()`. The click that calls `open()` no longer closes a docked
    picker: the event that opened an overlay never dismisses it.
  - **The tooltip is outside the rule, by design:** `show()` and `hide()` wait for their
    delays (300 and 100 ms unless called with `true`) and emit no event; read `isVisible()`.
- **material is ESM-only.** The CommonJS bundle (`dist/index.cjs`) and the root's `require`
  condition are gone; `main` is the ESM entry. Every subpath was already import-only, and with
  the internals off the root the bundle would have been a partial API. `require('material')` no longer
  resolves (`ERR_PACKAGE_PATH_NOT_EXPORTED`): use `import`, or `await import('material')` from CommonJS.
- **The package root exports the components and the app-level helpers only.** The 137
  internal names 0.10.4 deprecated on the root are gone from it: the composition core (`pipe`,
  `createBase`, the `with*` features), the DOM, timing and store helpers, and the progress
  indicator's canvas code. The root keeps the component factories and their types,
  `configureHTML`, `schemeToTokens` and `THEME_ROLES`, and the global defaults. Each removed name
  is the same export at its subpath; the
  [migration table](https://github.com/floor/material/blob/main/scripts/fixtures/root-exports.md)
  gives every one:

  ```ts
  import { pipe, createBase, withEvents } from 'mtrl';             // 0.10
  import { pipe, createBase, withEvents } from 'material/core/compose'; // material 3.0.0
  ```

  The subpaths are ESM-only, as material 3.0.0 is. The root's export list is pinned
  (`bun run root-exports:check`), so a name cannot join it unnoticed.
- **The Vue peer dependency is `>=3.4.20`.** The Vue adapter's declarations
  import `DefineSetupFnComponent`, which `@vue/runtime-core` first declared in 3.4.20.
  On Vue below 3.4.20 a project with `skipLibCheck: false` fails to compile them
  (TS2724); with `skipLibCheck: true` every Vue component is `any`. Migration:
  install Vue 3.4.20 or newer.
- **With `skipLibCheck: false`, use `@types/react` 18.2.71 or later.** Earlier versions import
  `scheduler/tracing`, which the current `@types/scheduler` no longer declares, so they fail to
  compile with `skipLibCheck: false`, with or without material.
- **Only the canonical names.** For every row below but the last two, 0.10.5 exported
  both spellings, the old ones deprecated; material 3.0.0 has only the canonical ones. Every exported identifier writes "text field" as
  two words; the strings follow: see 'Text field in two words in every string' below. The declarations are renamed too, so the
  types read the same in an editor. Svelte's component file is `TextField.svelte`. Migration:

  | 0.10 | material 3.0.0 | Entry |
  |---|---|---|
  | `createTextfield` | `createTextField` | `material` (`material/components/text-field` exports `createTextField` too) |
  | `TextfieldConfig`, `TextfieldComponent` | `TextFieldConfig`, `TextFieldComponent` | `material`, `material/components/text-field` |
  | `TextfieldDensity`, `TextfieldEvents` | `TextFieldDensity`, `TextFieldEvents` | `material/components/text-field` |
  | `TextfieldValuePayload`, `TextfieldFocusPayload`, `TextfieldTrailingPayload` | `TextFieldValuePayload`, `TextFieldFocusPayload`, `TextFieldTrailingPayload` | `material/components/text-field` |
  | `TEXTFIELD_VARIANTS`, `TEXTFIELD_STATES`, `TEXTFIELD_TYPES`, `TEXTFIELD_EVENTS`, `TEXTFIELD_DENSITY`, `TEXTFIELD_DEFAULTS`, `TEXTFIELD_CLASSES` | `TEXT_FIELD_VARIANTS`, `TEXT_FIELD_STATES`, `TEXT_FIELD_TYPES`, `TEXT_FIELD_EVENTS`, `TEXT_FIELD_DENSITY`, `TEXT_FIELD_DEFAULTS`, `TEXT_FIELD_CLASSES` | `material/components/text-field/constants` |
  | `CardSchema` | `CardConfig` | `material`, `material/components/card` |
  | `TopAppBar` (type) | `TopAppBarComponent` | `material`, `material/components/top-app-bar` |
  | `BottomAppBar` (type) | `BottomAppBarComponent` | `material`, `material/components/bottom-app-bar` |
  | `textfieldElement`, `defineTextfield` | `textFieldElement`, `defineTextField` | `material/elements` |
  | `TextfieldSpec`, `TextfieldElement`, `TextfieldElementComponent` | `TextFieldSpec`, `TextFieldElement`, `TextFieldElementComponent` | `material/elements` |
  | `Textfield` (component) | `TextField` | `material/react`, `material/solid`, `material/svelte` |
  | `MTextfield` | `MTextField` | `material/vue` |
  | Sass `$textfield`, `textfield()` (`abstract/variables`) | `$text-field`, `v.text-field()`, the same map (both names in 0.10.5); the built CSS is unchanged |
  | `SELECT_CLASSES.TEXTFIELD` (deprecated in 0.10.5) | `SELECT_CLASSES.TEXT_FIELD`, `"select__text-field"`: no overlap, the key is new in material 3.0.0. A recorded exception to the rule that 0.10.x carries the replacement: a class-name key users rarely type, where an alias on 0.10.x would cost the select's last bytes. |
  | `select.textfield` (deprecated in 0.10.5) | `select.textField` | the select's property: no overlap, `textField` is new in material 3.0.0, and reading `select.textfield` in JavaScript now gives `undefined` rather than an error. The same recorded exception as the row above. |

  Each is a rename of the import; the values and types are the same. The React, Solid and
  Svelte `TopAppBar` and `BottomAppBar` components keep their names: only the factory's types
  were renamed.
- **Text field in two words in every string.** the earlier change renamed the identifiers
  (`createTextField`, `TextFieldConfig`, `defineTextField`); the strings now follow, so the name
  is written one way everywhere. The tag is `<m-text-field>`. The classes are `mtrl-text-field`,
  `mtrl-text-field__input`, `mtrl-text-field--focused` and so on, on the text field and inside
  the select. The CSS part is `::part(text-field)`, as parts are named after the classes. The
  subpaths are `material/components/text-field`, `material/components/text-field/constants`,
  `material/styles/text-field`, `material/elements/css/text-field` and
  `material/elements/preupgrade/text-field.css`. The global defaults key is `'text-field'`, as
  `'navigation-rail'` and `'side-sheet'` are. The values of `TEXT_FIELD_CLASSES` change with the
  classes, and `SELECT_CLASSES.TEXT_FIELD` is `select__text-field`. The registry key in
  `elements` is `textField`. Generated ids start with `mtrl-text-field-`. Nothing else changes:
  the identifiers, the options, the events and the rendered structure are the same, and
  `type="text"` is untouched. The old strings have no alias: the old tag is not defined, an old
  subpath throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, and an old class, part or defaults key is
  silently ignored. Migration: replace `m-textfield` with `m-text-field` in markup and
  selectors, `mtrl-textfield` with `mtrl-text-field` in CSS and class calls, `part(textfield)`
  with `part(text-field)`, and `/textfield` with `/text-field` in imports (0.10.7 resolves the
  new subpaths, so imports can move first).
- **Time picker, select and radio events agree with their getters.**

  | Event | 0.10 payload | material 3.0.0 payload |
  |---|---|---|
  | Factory time picker `input` | `{ value: draft }` | `{ value: committed, draftValue: draft }` |
  | `<m-timepicker>` `input` detail | `{ value: draft }` | `{ value: committedOrEmpty, draftValue: draft }` |
  | Factory time picker `confirm` | time string | `{ value: time }` |
  | `<m-timepicker>` `confirm` detail | no event | `{ value: time }` |
  | Factory select `change` on empty ID | `{ value: "", ... }` | `{ value: null, ... }` |
  | `<m-select>` `change` on empty ID | `{ value: "" }` | `{ value: null }` |
  | `<m-radios>` `change` on empty ID | `{ value: "" }` | `{ value: null }` |
  | Factory radios `change` on empty ID | `{ value: "", ... }` | `{ value: null, ... }` |
  | Factory radios `getValue()` with nothing selected | `""` | `null` |

  While the time picker is open, `input.value` no longer moves with the dial:
  it is the committed time. Read `draftValue` for live edits. The factory's
  `onInput` callback also receives the new `{ value, draftValue }` object,
  described by the newly exported `TimePickerInputEvent` type. `onConfirm` receives
  `{ value }` as well: see "A config `on*` option is the listener registered at
  creation." `SelectChangeEvent["value"]` is now `string | null`
  for an empty option ID. The radio factory reports `null` too: `getValue()` returns
  `string | null`, and `RadiosChangePayload["value"]` is `string | null`. Handle `null`
  for an empty selection in the select and the radios, factory and element alike. The radio
  factory's `setValue` accepts `null` too, so the getter and the setter round-trip:
  `setValue(null)` clears the selection, silently. `<m-radios>`'s `value = null`, which the
  React, Solid, Vue and Svelte `value` props drive, clears through it; in 0.10 that cleared
  with a development warning (`no option with value ""`).
- **Chip-set `add` and `remove` report the live selection.** Factory
  callbacks receive one object instead of a bare chip:

  | Event | 0.10 payload | material 3.0.0 payload |
  |---|---|---|
  | `add` | `chip` | `{ value: string \| string[] \| null, chip }` |
  | `remove` | `chip` before removal | `{ value: string \| string[] \| null, chip, chipValue: string \| null }` after removal |
  | `<m-chips>` `remove` detail | `{ value: removedId }` | `{ value: remainingSelection, chipValue: removedId }` |

  `value` matches `getValue()` inside the callback, including for selected chips.
  Inside a factory `remove` handler, `event.chip` is already destroyed and out
  of the set. Its getters still answer, but `getChips().indexOf(event.chip)` is
  `-1` and its element is disconnected.
  The element continues to emit one `remove` and no separate `change` for user
  removal; declaration edits remain silent. Migration: read the chip from
  `event.chip` in factory handlers and the removed identifier from
  `event.chipValue` (or `event.detail.chipValue` on the element). Read the
  remaining selection from `event.value` or `event.detail.value`. The exported
  `ChipsAddEvent` and `ChipsRemoveEvent` types describe the new factory payloads.
- **Checkbox and switch `change.value` is boolean.** Factory payloads
  and custom-element details now carry `{ checked, value, valueAttribute, nativeEvent }`;
  `value` matches the checked model, and `valueAttribute` holds the HTML string token.
  Native forms still submit that token only while checked; setters remain silent and
  element/framework bindings remain `checked`-based. A standalone `withInput`
  (`material/core/compose`) emits the same payload (0.10 sent `{ checked, value: <the input's
  string>, nativeEvent }`), and its methods match it: `getValue()` and `setValue()` work on
  the checked boolean, and the input's string is `getValueAttribute()` / `setValueAttribute()`,
  the names the checkbox and the switch use. Both setters are silent: the `value` event
  `setValue(string)` emitted in 0.10 is gone.
  Migration: read checked state from `value` (or `checked`), and replace reads of the
  old string `value` with `valueAttribute`, including `event.detail` in adapters.
- **List event types match native forwarding.** `scroll` carries
  `{ event, element, originalEvent }`; its nonexistent `component` field is removed.
  Migration: use `element` for the event root, or retain your list reference.
- **Toggle buttons, chips and the carousel report `value` with `change`.** Every
  model event carries `value` in the type `getValue()` returns, read at dispatch:

  | Component | `change` payload, 0.10 → material 3.0.0 |
  |---|---|
  | button, icon button (toggle) | `{ selected }` → `{ selected, value: string }` (the button's value) |
  | selectable chips (filter and input) | `{ selected, chip }` → `{ selected, chip, value: string \| null }` |
  | carousel | `{ index }` → `{ value: number }`: `value` is the index, and `index` is gone |

  The custom elements' `event.detail` carries the same fields, and `<m-button>` now dispatches
  `change` for a toggle button. `ButtonChangePayload` and `IconButtonChangePayload` are
  exported. Migration: keep reading `selected` for the toggled state; in a carousel handler
  read `value` where you read `index` (`event.index`, or `event.detail.index` on
  `<m-carousel>`, is now `undefined`); code that builds these payloads (mocks, test doubles)
  adds `value`. In React and
  Solid, `Button` now types its own `onChange` (the element's `change`): code that spreads a
  full `React.HTMLAttributes` (or Solid's `JSX.HTMLAttributes`) into `Button` must omit
  `onChange`.

  The icon button's DOM `toggle` event, deprecated in 0.10.0, is removed (below): `change`
  carries `{ selected, value }`.

- **The chips set's `change` payload is a plain object and has one argument.**
  `chips.on("change", handler)` listeners and the config's `onChange` are passed
  `{ value, selected, changed }`. `value` keeps the set's single or multi value
  shape, `selected` keeps the selected chip values, and `changed` is the toggled
  chip's value. `on("change")` listeners get every change, with `changed: null`
  for one made by a method (`selectByValue(values, true)`); the config's
  `onChange` hears those method changes too. `<m-chips>` still emits
  `change` with `{ value }` detail. Migration:

  ```ts
  // 0.10: the event was an array, and changedValue was a second argument.
  chips.on("change", (selectedValues, changedValue) => {
    use(selectedValues[0], changedValue);
  });
  // material 3.0.0: on("change") and onChange are each passed one object.
  chips.on("change", ({ selected, changed }) => {
    use(selected[0], changed);
  });
  ```

  | Leftover 0.10 handler expression | material 3.0.0 runtime result on the built package |
  |---|---|
  | `event[0]`, `event.length` | Both are `undefined`. |
  | `[...event]` | Throws a `TypeError`. The message is the engine's: in Bun (JavaScriptCore), `Spread syntax requires ...iterable[Symbol.iterator] to be a function`. |
  | `event.includes("a")` | Throws a `TypeError`. In Bun (JavaScriptCore): `event.includes is not a function. (In 'event.includes("a")', 'event.includes' is undefined)`. |
  | Second `changedValue` parameter | `undefined` in both `on("change")` and `onChange`; each handler is passed exactly one argument. |

- **Tabs `on` and `off` take a closed event map.** A group accepts
  `change` (`TabChangeEventData`). A single tab accepts `click` (the button's
  wrapped `{ event, element, originalEvent }` payload), `focus` and `blur`
  (the native `FocusEvent`). `TabsConfig.on` accepts that same `change` handler.
  Migration, what stops compiling:
  - `tab.on("click", (event: MouseEvent) => …)`: the payload is the wrapped
    `{ event, element, originalEvent }`, so read `payload.originalEvent`.
  - `createTabs({ on: { … } })` with a key other than `change`: `TabsConfig.on` no longer has an
    index signature.
  - `tabs.on("custom", …)` for an event name of your own needs a cast.
  - `on` and `off` return the concrete component (`TabsComponent`, `TabComponent`), not `this`.
- **`emit` on the card and the tabs takes the component's own events.** `CardComponent.emit` and
  `TabsComponent.emit` accepted any event name and any data. They now take the names in
  `CardEvents` and `TabsEvents`, each with the payload `on` and `off` declare for it. They are
  the only two public component types that declare `emit`. Migration, what stops compiling:

  ```ts
  card.emit?.('custom', data);                          // 0.10
  tabs.emit?.('change', { value: 'two' });              // 0.10: a partial payload
  tabs.emit?.('change', { tab, value: 'two' });         // material 3.0.0: the event's whole payload
  ```

  - An event name of your own is a type error. At run time nothing changed: the emitter is
    the same, so untyped code that emits `'custom'` still reaches a listener registered for
    it. Keep your own events on an emitter of your own.
  - A component you build with `withEvents` keeps its open `emit(event: string, data)`.
- **Tab and panel ids are derived from the value with a safe encoding.** A value of
  `[A-Za-z0-9_-]` only keeps its ids, `tab-<group>-<value>` and `tabpanel-<group>-<value>`. Any
  other value gets `tabx-<group>-<encoded>` and
  `tabpanelx-<group>-<encoded>`: `_` becomes `__` and every other character `_<hex code
  point>_`, so the ids hold no whitespace (an id reference such as `aria-controls` is a
  space-separated list) and two values never share one. The tab element carries its value as
  `data-value`, and the conventional panel is found from it rather than parsed out of the id.
  `tabIdFor(groupId, value)` and `tabPanelIdFor(groupId, value)` are exported from
  `material/components/tabs`. Migration: values whose ids worked before change too, not only those
  with a space, a newline or a quote: `a.b` → `tabx-g-a_2e_b`, `/home` → `tabx-g-_2f_home`,
  `user:1` → `tabx-g-user_3a_1`, `café` → `tabx-g-caf_e9_`. A page that writes its own panels
  with the conventional id, or labels them with the tab's id, for any value with a character
  outside `[A-Za-z0-9_-]` must build those ids with `tabPanelIdFor` / `tabIdFor`; a hand-written
  `tabpanel-g-a.b` is otherwise never linked.
- Menu items and search suggestions are present synchronously when their factories return,
  including in server-rendered shadow DOM. Migration: DOM inspection no longer needs
  a timer before reading initial items or suggestions. Menu positioning still waits for
  attachment; opening, focus, lazy submenus and suggestion updates keep their existing behavior.
- **Text field: a trailing icon without `trailingIconLabel` is decorative.** It is
  hidden from screen readers (`aria-hidden`) and no longer shows a pointer cursor. An app that
  built a clear or show-password control from that span with its own click listener lost it for
  screen-reader users. Migration: an interactive trailing icon needs `trailingIconLabel` (or
  `setTrailingIcon(html, label)`), which makes it a button and emits `trailing`. The label is a
  factory option: `<m-text-field>` and the React, Vue, Svelte and Solid components have no label
  attribute or prop, so a trailing icon there is decorative.
- **The dialog is open when `open()` returns, and closed when `close()` returns.**
  The rule, for the dialog first and for every overlay by material 3.0.0: when `open()` or `close()`
  returns, `isOpen()` has changed and the event has been emitted (the cancellable `beforeopen`
  or `beforeclose` first). The classes, the paint, the focus trap and the animation may follow.
  A dialog created with `layer: "top"` and `<m-dialog>` already worked this way, and change
  in two points only, marked "both layers" below; this is the factory dialog without `layer`, which emitted `open` and turned
  `isOpen()` true 10 ms after the call. Migration: add every `open` listener before calling
  `open()` (or pass it in the config's `on`), and move to `afteropen` what needs the dialog
  visible or focus inside it.

  ```ts
  // 0.10: the listener was added in time, because `open` came 10 ms later
  dialog.open();
  dialog.on('open', build); // material 3.0.0: never runs, so the dialog opens empty

  // material 3.0.0: add it before the call
  dialog.on('open', build);
  dialog.open();
  ```

  - **`open` is emitted inside `open()`.** A listener added after the call does not hear it:
    add it before, or listen to `afteropen`. It runs before the surface is visible and before
    focus is trapped; `afteropen` is the "visible, and focus is in" event.
  - **`isOpen()` is the dialog's own state,** true on the line after `open()`. It no longer
    reads the `--visible` class, which is still added 10 ms later so the surface has a state to
    animate from.
  - **`afteropen` and `afterclose` are unchanged in timing and are never emitted inside the
    call,** even with `animationDuration: 0`: `afteropen` when the dialog is visible and focus
    is in it, `afterclose` when it is removed. A listener added right after `open()` still
    hears `afteropen`.
  - **Repeat calls do nothing and emit nothing,** in both layers. `close()` on a closed dialog
    emitted `beforeclose`, `close` and `afterclose` each time, and a second `open()` within
    the 10 ms emitted `beforeopen` and `open` again.
  - **The later call wins,** in both layers. `open()` then `close()` at once ends closed and the surface is
    never shown (it was shown 10 ms later, on a dialog that had emitted `close`); `close()`
    then `open()` at once ends open and stays in the document (the pending removal took it
    out). The call that lost emits no `afteropen` or `afterclose`: a dialog closed before its
    `afteropen` was due never emits it, and one opened again before its `afterclose` was due
    emits no `afterclose`. Both used to arrive late, about a dialog in the other state, in
    the top layer as well.
  - **An open dialog can be dismissed as soon as `open()` returns:** Escape and a click on the
    scrim close it from then, not 10 ms later. One exception, the same for every overlay: the
    event that opened it never dismisses it. A dialog opened from an Escape `keydown` handler
    stays open through that key press, and the next Escape closes it. "The event that opened
    it" is exactly the one whose dispatch had begun when `open()` ran: any other, in the same
    task or the next, counts. This holds in both
    layers: a `layer: "top"` dialog and `<m-dialog>` opened that way used to close at once,
    on the `cancel` the browser sends for that same key press.
  - **`destroy()` right after `open()`** leaves nothing behind (see Fixed).
  - **Escape is handled as a key press, in both layers.** The dialog listens on the
    window and prevents the key, so the browser sends a `layer: "top"` dialog no `cancel` for
    it. `closeOnEscape: false` and a `beforeclose` listener that refuses now hold for any
    number of presses (see Fixed). Only the topmost open dialog answers; a key that something
    open inside it has used (a menu, a select) is left to it. An Escape that cancels an IME
    composition is left to the IME: a default-layer dialog no longer closes on it (a
    top-layer one is the browser's to decide, as before). `<m-dialog>` still dispatches `cancel` for every Escape, and
    `preventDefault()` on it still refuses. A page listener that saw the native `cancel` on
    the factory's `<dialog>` for Escape sees one the dialog sends itself; a close request that
    is not a key press (a back gesture) still arrives as the browser's.
- **The menu is closed when `close()` returns.** The same rule as the dialog's, for
  the menu in both layers and for the two components that hold one, the select and the split
  button. `open()` already worked this way; `close()` set the state and emitted `close` on a
  50 ms timer. Migration: move out of a `close` listener anything that needs the menu gone
  from the document (it leaves 350 ms later), and drop `event.preventDefault()` from `open`
  and `close` listeners and from the select's `change` listeners.

  ```ts
  menu.close();
  menu.isOpen(); // 0.10: true for another 50 ms. material 3.0.0: false
  menu.open();   // 0.10: ignored, the menu ended closed. material 3.0.0: it reopens
  ```

  - **`close` is emitted inside `close()`,** and `isOpen()` is false on the next line. The
    listener runs while the menu is still in the document with its visible class: the class
    and `aria-hidden` follow 50 ms later, the removal 300 ms after that, as before.
  - **Repeat calls do nothing and emit nothing.** Two `close()` calls within 50 ms emitted
    `close` twice outside the top layer.
  - **The later call wins.** `close()` then `open()` at once reopens the menu, with one
    `close` and one `open`; `open()` then `close()` at once ends closed and the surface
    is never shown.
  - **One menu at a time, in the call:** opening a menu closes the one that was open before
    its own `open` is emitted. The other's `close` used to come 50 ms after.
  - **An open menu can be dismissed as soon as `open()` returns:** a click outside and
    Escape close it from then, not 20 ms later. The event that opened it never dismisses it:
    a menu opened by code from a click or a key press on another element ignores that click
    or key press, and the next one counts.
  - **Select:** `close()`, Escape and a chosen option set `isOpen()` false, emit `close` and
    set `aria-expanded="false"` in that call or event.
  - **Split button:** when the user dismisses the menu, `isExpanded()` turns false and
    `collapse` and `change` are emitted in that event, not 50 ms later; `collapse()` then
    `expand()` at once ends expanded (the menu ignored the reopening and collapsed the
    button again).
  - **FAB menu, `menu` presentation:** `close()` sets `isOpen()` false and emits `close` in
    the call. Its `open()` is unchanged here.
  - **`MenuEvent` and `SelectEvent`,** the payloads of `open` and `close`, and
    `SelectChangeEvent` lose `preventDefault` and `defaultPrevented`, in the types and on
    the objects passed at run time: nothing read them, and none of these events can be
    cancelled. A leftover call throws; it never did anything. The menu's `select` keeps
    both: preventing it keeps a `closeOnSelect` menu open.
- **The FAB menu is open when `open()` returns, and `open` on `<m-menu>` and
  `<m-fab-menu>` is applied at once.** The last two parts of the overlays' rule.
  Migration: read the state on the line after setting `open` on either element instead of
  waiting for its event, or call `show()` / `hide()`.
  - **FAB menu, `menu` presentation:** `open()` sets `isOpen()` and `aria-expanded` and
    emits `open` in the call. It used to do so after the menu's module had loaded: a
    microtask later once loaded, a network round trip the first time. The surface is shown
    when the module has arrived. `close()` before that ends closed, with one `open` and one
    `close`, and nothing is shown; it used to be ignored, and the menu then opened. If the
    module fails to load, the FAB menu closes again (`close` is emitted). The `list`
    presentation already worked this way.
  - **`<m-menu>` and `<m-fab-menu>`, the `open` attribute and property:** applied inside
    the attribute callback, so the element is open, or closed, on the next line. Applied
    that way it dispatches no `open` and no `close`, as on `<m-dialog>`, the drawer and
    the sheets. It used to be applied a microtask later and to dispatch both. `show()`,
    `hide()`, `toggle()`, the anchor and the user still dispatch one event per opening and
    per closing.
- **The modal sheets and the modal drawer handle Escape as a key press.**
  The bottom sheet, the side sheet and the drawer, when modal, join the dialog on one stack,
  in both layers. Migration: nothing, unless a page listener relied on what follows.
  - **A refusal holds.** With `layer: "top"`, a sheet with `closeOnEscape: false` and a
    drawer with `dismissible: false` were closed by the browser on the third Escape (it forces
    the third `cancel` refused in a row; measured on the dialog, the same `<dialog>` path).
    The key is now prevented, so no `cancel` is sent.
  - **Only the topmost modal answers,** and after whatever is open inside it has used the
    key. A dialog opened above a sheet takes Escape first.
  - **The event that opened it never dismisses it:** a sheet or a drawer opened from an Escape
    `keydown` handler stays open through that key press. In the top layer it used to close at
    once, on the `cancel` the browser sends for that key press.
  - **Outside the top layer** the listener moves from the document to the window: a menu or a
    select open inside the sheet or the drawer takes Escape first. Every Escape that reaches
    the window while one is open is prevented, a refusing one included.
  - **`<m-drawer>`** still refuses Escape with `no-close-on-escape`: the key press is sent on
    as a `cancel` event on its `<dialog>`, where it listens.
  - A standard (not modal) sheet is unchanged: Escape closes it when pressed inside it.
- **The pickers and the full-screen search handle Escape as a key press, and the time picker
  is open when its factory returns.** The last modals to join the dialog's stack.
  Migration: read `timePicker.isOpen()` right after creating it with `open: true` instead of
  waiting a task.
  - **Time picker, modal date picker, full-screen search:** Escape is prevented and answered
    by the topmost modal only, after whatever inside it has used the key, and never for the
    key press that opened it. Opened from an Escape `keydown` handler, each used to close at
    once on the `cancel` the browser sends for that key press. A picker opened above a dialog
    takes Escape first, as before.
  - **Time picker, `open: true`:** `isOpen()` is true and `open` has been emitted (to
    `onOpen`) when `createTimePicker()` returns; it used to open on a 0 ms timer. The surface
    is still shown a task later, where the picker has been put by then: a modal `<dialog>`
    must not be moved once it is shown. `close()` before that task leaves it closed, with
    nothing shown.
  - **Docked date picker:** the click that opened it is the only one it ignores. It ignored
    every click in the task `open()` ran in, so a second click delivered before a timer had
    run was lost.
- **A config `on*` option is the listener registered at creation.** It runs with the same
  argument, the same number of times, as a listener passed to `on(event)` at that point, and it
  runs before a listener added afterwards. Whether a method notifies is unchanged (a silent
  `setValue`, `setActive`, `clear()` or button-group `select` stays silent). The bottom app bar's
  `onVisibilityChange` and the top app bar's `onScroll` have no matching event, so they stay
  callbacks and are not in the table. A chip's `onSelect`
  has no matching event either, so it stays a callback. A chip option used to be called beside
  the emit, with its own arguments. A chip set registers `onChange` before a handler supplied
  in `on`, and before a listener added after `createChips`. A chip's `onChange` and `onClick`
  are registered first: a chip's config has no `on` map. A chip in a set emits its own `change`
  on a click, after the set has toggled it, and the item's `onChange` receives that payload
  (`{ selected, chip, value }`). The calls on that click run in this order: the item's
  `onClick`, the set's `onChange`, a set `change` listener added after `createChips`, the
  item's `onSelect`, a chip `click` listener added after the chip was created, the item's
  `onChange`, and a chip `change` listener added after the chip was created. `setSelected`
  and `selectByValue` do not emit the chip's `change`. A single-select click emits it on the
  clicked chip only.

  | Component | Option | Old argument | New argument |
  |---|---|---|---|
  | Time picker | `onConfirm` | the 24-hour string | `{ value }` |
  | Time picker | `onChange` | `{ value }`, a second object from the one `change` emitted | the same `{ value }` object `change` emits |
  | Time picker | `onInput` | the `input` event | the same object |
  | Time picker | `onOpen`, `onClose`, `onCancel` | no argument | no argument |
  | Search | `onInput`, `onSubmit` | the query string | the `SearchEvent` |
  | Search | `onClear` | the query string (declared with no argument; `""` after a clear) | the `SearchEvent` |
  | Search | `onSuggestionSelect` | the suggestion | the `SearchEvent` (`suggestion` holds it) |
  | Search | `onExpand`, `onCollapse` | no argument | the `SearchStateEvent`: `{ component, state, viewMode }` |
  | Navigation rail | `onExpand` | no argument | `{ expanded: true }` |
  | Navigation rail | `onCollapse` | no argument | `{ expanded: false }` |
  | Navigation rail, navigation bar | `onSelect` | the select event | the same object |
  | Drawer | `onSelect` | the select event | the same object |
  | Drawer | `onOpen`, `onClose` | no argument | no argument |
  | Text field | `onTrailingClick` | the trailing payload | the same object |
  | Button group | `on.click`, `on.focus`, `on.blur`, `on.change` | accepted, never called | the listener's argument |
  | Chips | `onChange` | `{ value, selected, changed }`, and only for a user's change | The same object as `on("change")`. The set's `onChange` now hears `selectByValue(values, true)`, with `changed: null`. `selectByValue(values)` and `clearSelection()` stay silent. |
  | Chip | `onChange` (a chip alone) | `(selected, chip)` | `{ selected, chip, value }`, the `change` payload |
  | Chip | `onChange` (a chip in a set) | `(selected, chip)`, and the chip did not emit `change` | `{ selected, chip, value }`, the chip's `change` payload. A click emits that `change`. `setSelected` and `selectByValue` do not. |
  | Chip | `onClick` | the chip | `{ event, originalEvent, element }`, the `click` payload |
  | Chip | `onRemove` | the chip | the chip |
  | Chip | `onTrailingClick` | the chip | the chip |
  | Chip | `onSelect` | the chip | the chip. No matching event. |

  ```ts
  createTimePicker({ onConfirm: (time) => { input.value = time; } });          // 0.10
  createTimePicker({ onConfirm: ({ value }) => { input.value = value; } });    // material 3.0.0
  createSearch({                                                                // 0.10
    onSubmit: (query) => console.log(query),
    onSuggestionSelect: (suggestion) => console.log(suggestion.text),
  });
  createSearch({                                                                // material 3.0.0
    onSubmit: (event) => console.log(event.value),
    onSuggestionSelect: (event) => console.log(event.suggestion?.text),
  });
  ```

  A listener added with `on()` used to run before the option, which was called after `emit`.
  The option is now first. `component.off(event, theSameFunction)` removes it: the option is
  that function, not a wrapper. A navigation rail or bar listener that destroys the component
  during `select`, or the rail during `expand`, used to skip the option. The option now runs
  first, so it is called; listeners already taken for that `emit` still run.

  In JavaScript, a leftover template of an argument that is now an object is `"[object Object]"`
  (measured), including assigning the time picker's `onConfirm` argument to an input's `value`.
  Search `onClear`'s `.length` is `undefined`; the query is `event.value`. Search
  `suggestion.text` is `undefined`; the text is `event.suggestion.text`. The navigation rail's
  expand and collapse templates were `"undefined"` when the option was called with no argument.

  A leftover chip `onChange(selected, chip)` receives one object, measured on a filter chip
  valued `"old"`:

  | Call | `arguments.length` | First parameter | Second parameter |
  |---|---|---|---|
  | Selecting | 1 | `{ selected: true, chip, value: "old" }` | `undefined` |
  | Deselecting | 1 | `{ selected: false, chip, value: "old" }` | `undefined` |

  A leftover `onChange(selected, chip)` on a chip in a set gets the same object, measured
  on a filter chip valued `"old"`: selecting passes `{ selected: true, chip, value: "old" }`
  and deselecting passes `{ selected: false, chip, value: "old" }`, `arguments.length` is 1,
  and the second parameter is `undefined`.

  The object is always truthy, so a leftover `if (selected)` stays true when the chip is
  deselected. The boolean is `selected.selected`. A leftover `onClick(chip)` receives one
  argument, `{ event, originalEvent, element }`, where `element` is the chip's root; it is
  not the chip component (`focus` is `undefined`), and a second parameter is `undefined`.
  `onRemove` and `onTrailingClick` still receive the chip. `chips.off("change", onChange)`
  removes the set's option. A handler that calls `selectByValue(x, true)` for one fixed
  value runs twice — the change that was not that value, then the move onto it — and then
  stops, because `selectByValue` emits only when the selection changed.

### Removed

- **`select.menu` and `splitButton.menu`.** The menu inside a select or a split button
  is no longer a member of either: a public handle on an inner component is what would stop the
  menu from being loaded on demand later. Both were marked `@deprecated` in 0.10.6. A leftover
  `.menu` is a compile error in TypeScript; in JavaScript it reads `undefined` (measured), so a
  call through it throws a `TypeError`. Use the component's own methods and events (the
  migration table lists them). Changing a split button's items after creation, which only
  `splitButton.menu.setItems()` did, is `splitButton.setItems()`. The select has no public way
  to change its `placement` after creation; `<m-select>`'s `placement` attribute still does.
- **The options 0.10 deprecated are removed**, first those it promised to remove in material 3.0.0. Migration:

  | 0.10 | material 3.0.0 |
  |---|---|
  | `createElement({ rawClass })` (`mtrl/core/dom`) | `class` or `className`, unprefixed since 0.10. `rawClass` was applied on 0.10.x. In material 3.0.0 `createElement` applies no class for it and, as for any option it does not know, writes it out as an attribute: `<div rawclass="legacy-a legacy-b">` (an array becomes `rawclass="a,b"`). The seven component configs that typed it (those extending `BaseComponentConfig`) never applied it, and a leftover there still does nothing, so for them only the type changes. |
  | a dialog button's `color` | nothing: it had no effect; M3's dialog actions are text buttons in the dialog's colours |
  | the tooltip's `rich` option | `variant: 'rich'`; `rich` was never read |
  | `TOOLTIP_DEFAULTS.RICH` (deprecated in 0.10.5) | nothing: it was the default of the removed `rich` option |
  | checkbox `variant`, and its type `CheckboxVariant` (deprecated in 0.10.5) | nothing: M3 has one checkbox style |
  | list `prefix` | nothing: the prefix is fixed at build time |
  | radios `rippleConfig` | nothing: never applied; the stylesheet draws the state layer |
  | tabs `ResponsiveConfig.smallScreen.maxVisibleTabs` | nothing: it never had an effect; for more than four tabs, use a scrollable row |
  | time picker `closeOnSelect`, `TIMEPICKER_DEFAULTS.CLOSE_ON_SELECT` | nothing: never applied; the picker is confirmed with OK, as M3 specifies |
  | `SLIDER_MEASUREMENTS.TRACK_RADIUS`, `SMALL_TRACK_EXTERNAL_RADIUS`, `LARGE_TRACK_RADIUS_RATIO`, `HANDLE_GAP_PRESSED_REDUCTION`, `CENTER_GAP`, `EDGE_PADDING` | nothing: not read since the earlier change; the stylesheet and `getExternalTrackRadius` give the geometry |
  | `TABS_DEFAULTS.INDICATOR_HEIGHT`, `INDICATOR_ANIMATION_DURATION`, `INDICATOR_ANIMATION_TIMING`, `ICON_SIZE` | `indicator.height` and `indicator.animationDuration` to override; nothing read these |
  | `TEXT_FIELD_CLASSES.LABEL_FLOATING` | nothing: a floating label is the field's `--populated` or `--focused` state |
  | `TIMEPICKER_SELECTORS.MODAL`, `DIAL_CANVAS`, `DIAL_HAND` | nothing: they matched no element (the dialog's `::backdrop`, the DOM dial, `__dial-track` and `__dial-handle`; the earlier change, the earlier change) |
  | FAB and extended FAB `variant: 'surface'`, `FAB_VARIANTS.SURFACE`, `EXTENDED_FAB_VARIANTS.SURFACE` (deprecated since 0.8) | a container or tone style (`'primary-container'`, `'primary'`, …). The `--surface` CSS is removed, so a leftover `'surface'` renders as the default `primary-container`. |
  | FAB `size: 'small'`, `FAB_SIZES.SMALL` (deprecated since 0.8); `FAB_CLASSES.SMALL`, `FAB_ICON_SIZES.SMALL` (deprecated in 0.10.5) | `'default'`, `'medium'` or `'large'`: M3 Expressive has no small FAB. The `--small` CSS is removed, so a leftover `'small'` renders at the default 56dp. The extended FAB's `small` size stays. |
  | a chip's `text` (`ChipConfig`, including a chip set's items) | `label`. A leftover `{ text }` now renders an empty chip, silently: no label and no error or warning. Search your chip configs and chip set items for `text:`. |
  | tabs `indicatorHeight`, `indicatorWidthStrategy` | `indicator.height`, `indicator.widthStrategy` (since 0.3.2). A leftover is ignored: the indicator falls back to its variant's height (3px on a primary row, 2px on a secondary one) and automatic width. |
  | shape names `'cookie4'`, `'cookie9'` (`materialShape`, the shapes) | `'cookie4Sided'`, `'cookie9Sided'`, Compose's names (since 0.10.2). `materialShape('cookie4')` now throws (`TypeError: byName[name] is not a function`). |
  | `rippleConfig.timing` and `rippleConfig.opacity` (button, icon button, FAB, extended FAB, button group, radios, tabs, and the core `RippleConfig`); their defaults `DEFAULT_RIPPLE_CONFIG.TIMING`, `.OPACITY` (button, icon button) and `BUTTON_GROUP_DEFAULTS.RIPPLE_TIMING`, `.RIPPLE_OPACITY` (deprecated in 0.10.5) | nothing: never applied; the stylesheet draws the wave's motion and opacity. `duration` stays. The core's `RIPPLE_CONFIG.timing`, `.opacity`, `RIPPLE_TIMING` and `RIPPLE_SCHEMA`, on no public entry, go with them. |

- **material 3.0.0 exports nothing deprecated.** What 0.10.0 deprecated and 0.10.x already replaced (or
  never used) is removed, and so is what was kept only for compatibility: material 3.0.0 has no deprecated
  export, member or event. Migration:

  | 0.10 | material 3.0.0 |
  |---|---|
  | `CHECKBOX_VARIANTS` (`mtrl/components/checkbox`, `/constants`) | nothing: M3 has one checkbox style, and `variant` had no effect |
  | `RADIO_VARIANTS`, `RADIO_LABEL_POSITIONS`, `RADIO_SIZES`, `RADIO_CLASSES` (`mtrl/components/radios`, `/constants`) | nothing: no component read them |
  | `RADIO_DEFAULTS.VARIANT`, `.LABEL_POSITION`, `.SIZE` (deprecated in 0.10.6) | nothing: the radios have no such options, and nothing read the keys. `RADIO_DEFAULTS.DIRECTION` stays. In JavaScript a removed key reads `undefined`. |
  | the icon button's DOM `toggle` event, from the factory's button and from `<m-icon-button>` (deprecated in 0.10.0, the earlier change) | `change`, which carries `{ selected, value }`. A leftover `toggle` listener never fires, with no error. In the React, Vue, Svelte and Solid components the icon button refuses `onToggle` (Svelte: `ontoggle`), and the compiler's error says what to do: `Type '() => void' is not assignable to type '"onToggle was removed in material 3.0.0: use onChange"'`. Without that guard the name would fall through to the host's native `toggle` handler, compile, and never fire. |
  | `TIMEPICKER_DIAL`, `TIMEPICKER_Z_INDEX` (`mtrl/components/timepicker`, `/constants`) | nothing: the dial is sized in CSS and the picker is a modal `<dialog>` in the top layer |
  | `TIMEPICKER_CLASSES` | `TIMEPICKER_SELECTORS` (public since 0.9.0), which is not a like-for-like swap: its values are prefixed selectors (`".mtrl-time-picker__dial"`) where the old were bare class names (`"time-picker__dial"`), and 13 of the 33 old keys have no selector of the same name (`ROOT`, `OPEN`, the six `DIALOG_*`, `DIAL_NUMBER_ACTIVE`, `PERIOD_ACTIVE`, `TOGGLE_TYPE`, `CANCEL`, `CONFIRM`) |
  | `getThemeColor('sys-color-X-rgb')` (`mtrl/core/utils`): the `'r, g, b'` triplet, derived | `getThemeColor('sys-color-X', { alpha })`. The `-rgb` name now returns `''` (or the `fallback`), as any undeclared variable does, so `rgba(${getThemeColor('sys-color-primary-rgb')}, 0.12)` now yields `rgba(, 0.12)`, an invalid colour that CSS and canvas drop silently: a missing colour, not an error. Use `getThemeColor('sys-color-primary', { alpha: 0.12 })`. A theme that declares its own `-rgb` properties is unaffected. |

- **Component subpaths export the component only, and are listed one by one.** The
  internals 0.10.5 deprecated on `mtrl/components/<name>` are gone, with no replacement: card's
  `withAPI`, `withLoading`, `withExpandable`, `withSwipeable`, `withElevation` (a no-op: the
  variant sets the elevation, the earlier change) and the `*Feature` types; tabs' `with*` features, `addScrollIndicators`, `createTabsState`,
  `createTabIndicator`, `updateTabPanels`, `setupKeyboardNavigation` and their config and
  component types; switch's `withSupportingText` and `SupportingTextComponent`. Datepicker's
  `DEFAULT_DATE_FORMAT` leaves the component's index but stays public in its constants:
  `import { DEFAULT_DATE_FORMAT } from 'material/components/datepicker/constants'`. `ChipConfig`
  loses `managedSelection` and `cell`, which only the chip set sets. `CardComponent`'s `loading`,
  `expandable` and `swipeable` members are removed; `createCard` never set them. Tabs'
  `ResponsiveConfig` and `TabIndicator` and datepicker's `CalendarAPI`, which public members are
  typed with, are now exported. The manifest's `./components/*` and `./components/*/constants`
  patterns become one entry per component (and per component with constants), so the folders
  inside a component no longer resolve. Each component's export list is pinned
  (`bun run component-exports:check`).
  Migration: these subpaths now throw `ERR_PACKAGE_PATH_NOT_EXPORTED`. They held internals, with
  no replacement; a single chip is `createAssistChip` and the other factories in
  `material/components/chips`, and `CHIP_CLASSES`/`CHIP_STATES` are internal class and state names:
  `mtrl/components/bottom-sheet/features`, `carousel/features`, `chips/chip`,
  `chips/chip/constants`, `chips/features`, `drawer/features`, `list/features`, `menu/features`,
  `progress/features`, `search/features` (the low-level `withInput`), `side-sheet/features`,
  `slider/features`, `textfield/features`. Every other `material/components/<name>` and
  `material/components/<name>/constants` that existed in 0.10 still resolves, except
  `segmented-button` and `segmented-button/constants`, removed with segmented buttons (the earlier change,
  above).
- **Segmented buttons are removed.** `createSegmentedButton` and `createSegment`
  (deprecated since 0.8.0), their types, `mtrl/components/segmented-button`,
  `mtrl/styles/segmented-button` and the `--mtrl-segmented-button-*` properties are gone. M3
  replaced the segmented button with the connected button group. Migrate:

  ```ts
  createSegmentedButton({ mode: 'multi', density: 'compact',            // 0.10
    segments: [{ text: 'Day', value: 'day', checkmarkIcon }] });
  createButtonGroup({ kind: 'connected', selection: 'multi', density: 'compact', // material 3.0.0
    buttons: [{ text: 'Day', value: 'day', selectedIcon: checkmarkIcon }] });
  ```

  - `mode` is `selection` (`single`, `multi`, or `none` for plain actions); `segments` are
    `buttons`; `checkmarkIcon` is `selectedIcon`. `density`, `disabled`, `ripple`,
    `rippleConfig` and `on.change` keep their meaning.
  - `enableSegment(value)` / `disableSegment(value)` become `enableButton(index)` /
    `disableButton(index)`, or `getButtonById(id)` for one button.
  - The `change` event carries the selection; it has no `oldValue`, so keep the previous value
    if you need it.
  - The button group's `select(value)` now clears the selection when no button carries `value`,
    with a warning in development and no event, as the segmented button and the other selection
    components do.
    On a `required` group, which cannot be emptied, it warns and leaves the selection as it was.
- **The deprecated themes `material`, `winter`, `browngreen` and `legacy` are removed.** 0.10 deprecated them; their files, `mtrl/themes/<name>` entries and
  their rules in the full stylesheet are gone. A leftover `data-theme="winter"` (or any of the
  four) on the root element gets the baseline colours in the OS's colour scheme, and
  `data-theme-mode` and `data-theme-contrast` on that element are ignored: an app with its own
  dark toggle follows the OS until it renames the theme. The OS contrast preference
  (`prefers-contrast: more`) is not applied there either, so a user who asked for more contrast
  gets standard contrast. On a nested element a removed name matches no rule, so that element
  keeps its ancestor's colours. Migration: `material` → `baseline`,
  `winter` → `ocean`, `browngreen` → `brownbeige`; `legacy` has no replacement (pick any theme,
  or keep its colours as custom properties of your own).
- **The shape scale is M3's and nothing else.** The mtrl-only steps `extra-tiny` (1px),
  `tiny` (2px) and `pill` (100px) are removed from `$shape`, with their
  `--mtrl-sys-shape-corner-*` properties on `:root`. `v.shape('tiny')` and the rest now stop the
  build with an error naming the migration (as does any step not on the scale). Migrate:
  - `extra-tiny` and `tiny`: write the radius as a literal (`1px`, `2px`).
  - `pill`: use `full`, or half the component's height when its corners animate (a 9999px
    radius snaps when animated).
  - A theme setting `--mtrl-sys-shape-corner-pill` can drop it; nothing reads it.
- **`$mtrl-sys-shape` is removed from `abstract/theme`.** Nothing read it. Use
  `v.shape(<step>)`.

### Added

- **Every `material/components/<name>` entry exports its factory both ways:** as the default
  export and by its name (`import createButton from 'material/components/button'` and
  `import { createButton } from 'material/components/button'` are the same function, and the
  same one the root exports). 21 entries had only the default and gain the name; `chips` and
  `divider` had only the name and gain the default. Nothing is removed.
- **`isOpen()` on the snackbar and the date picker**, as on every other overlay.
- **Split button `setItems(items)` and `getItems()`.** `setItems` replaces the menu's
  items and returns the split button; `getItems` returns them. A split button created without
  `items` has no menu and `getItems` returns `[]`: the first non-empty `setItems` creates the
  menu, which then works as one created with items (and opens at once if the split button is
  expanded). `setItems([])` empties the menu and keeps it. After `destroy()` it does nothing.
- **The navigation bar.** `createNavigationBar` and `<m-navigation-bar>` (with
  `<m-navigation-bar-item>`), and the React, Vue, Svelte and Solid components: M3 Expressive's bar
  for compact and medium windows, three to five destinations, from Compose's `ShortNavigationBar`.
  - **Geometry and colour:** 64dp on surface container; a 56×32 indicator on secondary container,
    the active icon on it, the active label in secondary.
  - **`itemLayout`:** `'auto'` puts the icon above the label, and beside it in a 40dp pill with the
    items centred once the bar itself is 600px wide (a container query, so a bar in a narrow pane
    stays vertical). `'vertical'` and `'horizontal'` fix it.
  - **Destinations:** links (`href`) or buttons, badges (a count or the dot) folded into the
    accessible name, `aria-current="page"` on the active one, in a named `nav` landmark. Every
    destination is a tab stop and the arrow keys move along the bar, as in the navigation rail,
    whose destination code the bar now shares.
  - **`hideOnScroll`:** off by default; it slides the bar away while the page scrolls down,
    without the slide under reduced motion, and focus inside always brings it back.
- **Every public `variant` option's type is exported from `material` and from its component's
  subpath.** New on both: `TextFieldVariant`, `SelectVariant`, `MenuVariant`, `ProgressVariant`,
  `TabsVariant`, `TooltipVariant`. New on `material` (already on the subpath): `BadgeVariant`,
  `CardVariant`, `CarouselVariant`, `DatePickerVariant`, `ExtendedFabVariant`, `FabVariant`,
  `IconButtonVariant`, `SearchVariant`, `SplitButtonVariant`, `ToolbarVariant`.
- **Framework components accept the host element's HTML attributes.**
  React, Vue, Svelte and Solid props take that framework's `HTMLAttributes` as well
  as the component's own props. Where a name is both, the component's type wins, so
  a switch's `checked` stays a boolean and a button's `type` stays a string. The same
  rule covers events. A component's `change`, `input` or `select` handler stays
  the element's `CustomEvent`, including in Vue, where those handlers come from emits and
  would otherwise be intersected with the host's `onChange` / `onInput` / `onSelect`. A global a supported release leaves off that interface is accepted too
  (`popover` on React 18 through 18.3.31 and on Vue through 3.5, `enterKeyHint` on React 18
  before 18.3.31, `nonce` on React 18.0.0, Vue and Svelte);
  a release that already declares the key keeps its own type. Vue spells `inputmode`
  and `itemprop`, and Solid and Svelte spell `enterkeyhint`.
- Search listener types on `material/components/search`, beside `SearchEvent`: `SearchEvents`
  (each event's listener, so `SearchEvents["expand"]` types a handler) and `SearchStateEvent`
  (what `expand` and `collapse` carry). `material/elements` adds `SearchElementEvents`, the same
  map with `<m-search>`'s names (`change`, `select`, `open`, `close`).
- Read-only `getValue()` aliases on carousel, tabs, drawer, navigation rail and
  button group; existing accessors remain. Button toggle `change`, card
  `expandedChanged`, list `keydown`, and interactive touch events now have their
  actual payload types, including both slider touch delivery shapes.
- `material/ssr`: `renderElement` renders elements as declarative shadow DOM on Node or Bun; server-only, with no runtime dependencies. `<m-toolbar>` renders a declarative shadow root like the other elements. Before upgrade, each toolbar item is its own tab stop; after upgrade, the toolbar is one. Carousel and FAB menu stay opted out. It inlines the CSS by default, or links the stylesheets in the same order as the browser and the inline styles (without adding build-manifest dependencies), renders nested elements, and applies the shared HTML policy; each call defines only the host tags it meets, including nested authored and factory-generated elements, instead of recreating all 36 classes. Asynchronous FAB-menu and submenu configurations use the host-only fallback. The identity HTML policy is not a sanitizer; configure a synchronous sanitizer for untrusted markup. The React, Svelte, Solid and Vue bridges render a host that carries ordinary HTML attributes (`popover`, `inputmode`, `enterkeyhint`, `itemprop`, `nonce`, `is`, and the rest of the host's HTML attributes): the framework emits those attributes on the host, and the shared renderer skips names outside its allowlist, including event-handler names and `srcdoc`, so they never enter the shadow markup. Calling `renderElement` directly rejects an unknown host attribute. Underneath are an internal detached element lifecycle, style registry seams, and a synchronous server DOM scope with inert scheduling and complete resource teardown. Worker and edge runtimes are unsupported in `material` 3.0.0. A resolver that tries `workerd` or `worker` before `browser` (Cloudflare Workers) loads the browser stub: `renderElement` throws "material/ssr is server-only", and importing `material/ssr/react`, `material/ssr/vue`, `material/ssr/svelte` or `material/ssr/solid` does nothing, so the page has no declarative roots and no error.
- `material/ssr/react`: an opt-in, server-only entry. Imported in the server bootstrap, it makes the React adapters emit styled declarative shadow roots during SSR (React 18 and 19), with no server code in the client bundle. Without it, React output is unchanged. A `Suspense` boundary inside a component contributes its fallback to the server-rendered shadow root: a button has no label slot with an empty fallback but has one with a text fallback; a boundary around a tab leaves the root without that tab with either fallback. Put the boundary outside the component when the server root needs resolved content. A child that suspends stays on the server: the static pass retries the host only when that render suspended, and the shadow root is built from the children once they can render. A child that throws is not retried: the page render reaches it, so the error is reported as it is without the bridge. When that separate render throws something other than a suspension, development logs one warning per host in the response, naming the element and the error; production logs nothing. Retries wait on a backoff (doubling to 250ms) and stop after 40 attempts, about eight seconds; past that the host has no shadow root and the page keeps streaming, so a slower child still arrives. The suspension is recognised from the throw site of whichever React build this process loaded, not from the error text, so a production build that minifies the message still retries. At the cap, development logs one warning naming the element; production logs nothing. When no stack frame can be read, development logs one warning that suspending children render without a server shadow root; production logs nothing. The server-rendered shadow root is built in a separate render, without the context of providers above the component. The page's own render (the light DOM) sees the provided value. Until upgrade, a child reading context with a default shows that default in the painted shadow root; a child requiring its context leaves this component without a declarative shadow root while the page still renders. Pass the resolved string as a prop or attribute, or accept client-rendered text until upgrade. A fix is planned for a later 3.x release. The Vue and Solid bridges see the provided value in both the shadow root and light DOM.
- `material/ssr/svelte`: an opt-in, server-only entry. Imported in the server bootstrap, it makes every generated Svelte component emit a styled declarative shadow root during SSR, on the same `Symbol.for("mtrl.ssr")` bridge as React, with no server code in the client bundle. Carousel and FAB menu emit no template. Without the import, Svelte output gains only the empty branch marker. Like React, its shadow root is built in a separate render without provider context; the page's light DOM sees the provided value. A child reading context with a default shows that default in the painted shadow root until upgrade. A child requiring context leaves that component without a declarative shadow root while the page still renders: the host falls back to light DOM, then upgrades normally in the browser. Development logs once per affected host in each response, naming the element and including the child render error; production logs nothing.
- `material/ssr/vue`: an opt-in, server-only entry. Imported in the server bootstrap, it makes every generated Vue component emit a styled declarative shadow root during SSR, on the same `Symbol.for("mtrl.ssr")` bridge as React, with no server code in the client bundle. Carousel and FAB menu emit no template. Without the import, Vue output is unchanged. A host's child may use `async setup()` under `Suspense`, including data created outside that child and `renderToWebStream`: the shadow bridge serializes those children once. A host whose `v-html` contains an unclosed `<template>` renders, and `material/ssr/vue` imports the server renderer from `vue/server-renderer`.
- `material/ssr/solid`: an opt-in, server-only entry. Imported in the server bootstrap, it makes every generated Solid component emit a styled declarative shadow root during SSR, on the same `Symbol.for("mtrl.ssr")` bridge as React, with no server code in the client bundle. Carousel and FAB menu emit no template. Without the import, Solid output is unchanged. Async and streaming SSR finish when a component inside a host creates a resource under an outer `Suspense`: the shadow bridge reuses the page's serialized children, preserving its resource ownership and hydration keys without rendering children twice.
- Per-element SSR opt-out: specs accept `ssr: false` or a synchronous host
  predicate. Carousel and FAB menu emit their host and light DOM without a
  declarative root; menu and split-button do the same for nested submenus. `<m-toolbar>`
  renders a declarative shadow root. Async
  button/card global defaults conservatively use this fallback for the whole render.
  Eligible light-DOM descendants still render their own roots. Pre-upgrade CSS keeps
  the host's box until browser upgrade, and these paths no longer throw. React SSR
  honors the same opt-out without emitting an empty declarative template.
- Element CSS also ships as `.css` files (`material/elements/css/<name>.css`, `hosts/<element>.css`), for server-rendered `<link>` styles.
- `ssr:check` (CI): server-rendered elements are checked in Chromium, Firefox and WebKit, for a styled first paint without JavaScript, pixel stability and no layout movement on upgrade, and the security reparse; markup parity stays in Chromium. Chromium security and per-node parity checks cover all 36 element defaults.
- `ssr:check` and `svelte-ssr:check` cover two more cases: a toolbar's server-rendered
  icon buttons are measured across the upgrade (pixels, layout, and each button keeping its
  parser-created root), and Svelte named snippets (card `headline` and `actions`, top app bar
  `leading` and `trailing`) are checked as slotted before script and adopted by hydration.

### Changed

- **An upgraded `<m-switch>` is shorter under a tall line height than in the 3.0.0 prereleases.**
  At a page's `font-size: 24px; line-height: 2` the upgraded switch is 52 × 56 → 52 × 48
  unlabelled, and 65 → 56 tall with supporting text, so in a flex row centred on it the text
  beside rises 4–4.5 px and what follows 8–9 px. At the default type nothing moves. Text beside
  an unlabelled `<m-switch>` no longer moves when the element upgrades. Its pre-upgrade
  baseline now matches the control's center; a supporting-text-only switch uses its text
  baseline. The upgraded switch host uses the control's box directly, so 12px or 24px
  surrounding text with line-height 1 or 2 cannot add an extra host line box. Inline and
  baseline/center flex layouts are checked in both text directions.
- **A list row takes the expressive shape.** A row is 4 px at rest, 16 px on the list's outer corners, 12 px hovered, and 16 px focused, pressed or selected. With the default colours nothing changes at rest on screen: the row and the list are both the surface colour. Hover, focus and press look different, and rows given their own background show the corners. Set `--mtrl-list-item-shape`, `--mtrl-list-item-shape-outer`, `--mtrl-list-item-shape-hover` and `--mtrl-list-item-shape-active` to `0` on the list, on any ancestor, or on the `<m-list>` element for square rows. M3 Lists specs: "Unselected corner radius: 4dp inner, 16dp outer" and "Selected corner radius: 16dp".
- **The list's container is rounded, 16 px, by the same property as the rows' outer corners** (`--mtrl-list-item-shape-outer`). It is visible at rest on a list placed over a background that is not the surface colour. Set `--mtrl-list-item-shape-outer` to `0` on the list, on any ancestor, or on the `<m-list>` element to square the container and the rows' outer corners. M3 Lists specs, read 2026-10-03 (https://m3.material.io/components/lists/specs): "An expressive list has a segmented style and round corners". That page gives the item's corners and no value for the container.
- **The package's README on npm is a short one.** `npm-readme.md` is packed as the package's
  `README.md` (install, one example, the component list, and links to md3.io); the full
  README stays on GitHub. Nothing in the API changes.
- **The slider's label takes the Body Large role, and a labelled horizontal slider is 4px
  taller.** The label on a slider is this library's — the specification puts no label
  on a slider — so the form controls' label role decides, as it does for the checkbox, radio
  and switch labels: the label's text is now 16px on a 24px line (was 18px on an inherited 20px
  line). A horizontal slider with a label is 4px taller: 72 → 76px at XS and S, 76 → 80 at M,
  92 → 96 at L, 132 → 136 at XL; a vertical slider's height is unchanged. A layout that
  reserved the old height gains 4px per labelled slider.
- **The element authoring API is experimental.** `defineElement`, `ElementSpec`,
  `registerStyles`, `hasStyles` and `SHADOW_BASE_STYLES` (from `material/elements`), the API
  for writing custom elements of your own on material's machinery, are tagged
  `@experimental` in their TSDoc and are outside semantic versioning in 3.x: they may change
  in a minor release. Nothing about them changes in this release. The elements material
  defines (`<m-button>`, `<m-text-field>` and the rest), their attributes, properties and
  events, and the `define…()` functions are covered by semantic versioning as before. If
  you build your own elements on this API, pin the minor version (`~3.0.0`).
- **Slider: the `components` bag is internal.** The slider's controller reads an older
  `components` object as a fallback for its elements; nothing in the library fills it, the
  public `SliderComponent` never had it, and it is now marked internal and outside the
  public contract: it may go in any release. Use the slider's own API (`setValue()`,
  `getValue()` and the rest of `SliderComponent`) and `slider.element`.
- **Tabs: `tab.badge` may be `undefined` until the badge is shown.** The type always allowed
  it (`badge?: BadgeComponent`); it is now the documented contract, on `tab.badge` and on
  `getBadgeComponent()`: a tab creates its badge no later than when it shows it, so a later
  release can create it only then. Nothing changes at run time in this release: the badge
  still exists from the first `setBadge()`, or from creation with the `badge` option. Use
  `setBadge()`, `getBadge()`, `showBadge()` and `hideBadge()`, which work whether the badge
  exists yet or not, and check `tab.badge` for `undefined` before reading it.
- **A short chip with a secondary action is wider, by the specification.** Material 3, Chips:
  "Secondary actions (such as a trailing icon button for Remove) must have a 48x48dp
  interaction target that doesn't interfere with the chip's primary action (such as Edit or
  Drag). To achieve this, apply a minimum width of 88dp to the chip, or 42dp to the label
  text." A chip with a remove or trailing button is therefore at least 88px wide, its label
  at least 42px: the last 48px of the chip are the secondary action's target, by the
  specification, and the chip's own action owns the rest, at least 40px. An input chip
  labelled "Label" is 88px (was 80.05) and one labelled "OK" 88px (was 64.5); a filter chip,
  whose action starts 16px in, measures 92px (was 84.05 for "Label" and 68.5 for "OK"). A
  chip whose label already filled the 88px floor is unchanged.
- **An extra-small button's space between its icon and its label is 4px.** It was 8px. Material 3's token `md.comp.button.xsmall.icon-label-space` is 4, and Compose's `ButtonDefaults.ExtraSmallIconSpacing` is 4.
- **An unsized select is 280px wide, as an unsized text field is.** `createSelect()` made a
  select that took its container's whole width (200px in a 200px container, 400px in a
  400px one), where the text field, on both paths, and `<m-select>` are 280px whatever holds
  them. The factory's select now sizes as they do. Migration: to keep a select filling its
  container, give it the width: `select.element.style.width = '100%'` or the rule
  `.mtrl-select { width: 100%; }`; for the element, `m-select { width: 100%; }`. There is
  no option for it.
- **Text field: the spacing follows the M3 measurements.** A field's layout shifts
  by the amounts below; nothing in the API changes. Sources: the measurement tables on
  m3.material.io's text fields page, and Compose's `TextFieldImpl.kt` for the positions the
  site gives only as diagrams.
  - **A filled field's text is 24px down under its label and 8px above the bottom edge**
    ("Top/bottom padding 8dp"; the label's 16dp line is between): it was 22px down and 10px
    above. The floated label's line is centred 16px down, 1.8px lower than it was. A select's
    text moves with it. **Without a label the text is centred,** 16px down
    (`contentPaddingWithoutLabel`): it kept the labelled field's place, 22px.
  - **An outlined field's text is 16px down** (was 15.5px), and its floated label is centred
    on the top edge (it sat 1.7px below it).
  - **A prefix or suffix is on the text's line** in every case; in a compact field it was
    1.5px above it, in an outlined one half a pixel below.
  - **Compact density, which M3 does not measure, keeps its own heights and takes the rules
    that are not numbers:** the outlined floated label centred on the edge (1.5px lower
    before), the text centred in an outlined or unlabelled field (10px down; it was 10.5px
    outlined, 13.5px filled without a label), and the insets around its 20px icon box, 12px
    and 16px.
  - **An icon is 12px in and what follows it 16px further** ("Left/right padding with icons
    12dp", "Padding between icons and text 16dp"): beside a leading icon the text and the
    label start 52px in, and before a trailing icon the text ends 52px in. Both were 44px (the
    outlined field's text 45px). At compact density, whose icon box is 20px, 48px (was 40px,
    and 41px outlined). A select's text ends 52px before its end, as it has a trailing icon.
  - **A filled field's floated label stays beside the leading icon,** 52px in, where the
    resting label is (Compose places both with one expression). It moved to 16px. The outlined
    field's floated label goes to the notch, 16px in, as before.
  - **A prefix starts where the content does,** 16px in (`TextFieldPadding`), or 52px beside a
    leading icon; it was 12px, and 44px. **An affix is 2px from the text**
    (`PrefixSuffixTextPadding`): the prefix was 4px from it (5px outlined), and the text
    touched the suffix.
  - **The label is not moved by a prefix** (Compose: "Prefix/suffix does not get applied to
    label"). Resting, it starts 16px in, where it was 25.5px beside a "$" (the prefix is hidden
    while the label rests). Floated in a filled field, 16px, where it was 12px.
  - **The outlined input has no border at its sides:** its transparent border is top and
    bottom only and its horizontal padding is 16px (was 15px beside a 1px border), so both
    variants place the text at the same pixel. The outline itself is unchanged.
  - **A multiline field's first line and label are where a single-line field has them**
    (Compose places the text with no single-line branch). The first line starts 24px down in a
    filled field with a label (was 12px) and 16px down in an outlined field or without a label
    (was 13px and 12px); the resting label is 16px down (was 12px), and the floated label is
    the single-line field's (4px lower than it was). Compact, which M3 does not measure, takes
    the compact single-line field's: the first line 14px down under a filled label (was 8px),
    10px otherwise (was 8px and 9px). The Sass map's `padding-top-multiline` is 16px (was
    12px) and `padding-top-multiline-compact` 10px (was 8px), with two new keys for the filled
    field's label, `padding-top-multiline-label` (24px) and
    `padding-top-multiline-compact-label` (14px). **The 100px minimum height stays:** M3 gives a
    text area no height ("Text areas are taller than text fields and wrap overflow text onto a
    new line … These should be used instead of multi-line fields on the web",
    m3.material.io/components/text-fields/guidelines, "Input text"); Compose's 56dp is its
    multi-line field, which starts as one line and grows.
- **SSR docs: what the two style modes cost.** Inline styles stay the default. The
  README's server-rendering section and `RenderOptions`' TSDoc now say what inline costs (gzip
  cannot see a repeat further back than its 32 KB window, so serve brotli or use link mode
  for pages with many selects, or that mix large roots (text fields, dialogs) in turn; and
  the HTML is 0.5 to 0.9 MB uncompressed for 30 to 44 roots) and link mode's caveat (WebKit paints the roots unstyled until the
  stylesheets arrive). No code changes.
- **What `open()` has done when it returns is documented and pinned by tests.** The
  surface may be painted after `open()` returns; the state is not deferred. On return: a
  select's `isOpen()` is true, its input has `aria-expanded="true"` and `open` has been emitted;
  a split button's `expand()` has set `isExpanded()` and emitted `expand` and `change`; a time
  picker's `isOpen` is true and `open` has been emitted; a date picker has emitted `open`; a
  dialog has run `beforeopen`, and with `layer: "top"` it is open and has emitted `open`. None
  of this changed in material 3.0.0. The first ArrowDown, ArrowUp, Enter, Space, Home, End or typed character on a closed
  select opens it and is not lost.
- **SSR docs.** The README names every attribute whose value is markup, including `avatar` and `leading-avatar`, which are not a person's name or an image URL; `FabMenuConfig.closeIcon` is markup too. The React and Svelte bridges build the server-rendered shadow root without the context of providers above the component.
- CI's Solid and Vue SSR runs on the lowest supported peer version are ordinary commands,
  `solid-ssr:floor` and `vue-ssr:floor`. Each reads the floor from `peerDependencies`,
  installs it without saving, runs the check and restores the installed version, so nothing after
  it runs on the floor version unnoticed.
- **CI runs the same checks in less time.** The browser checks run in five groups instead of
  three, the package checks no longer hold the browser groups back, and Playwright's browsers
  and their system packages come from a cache that every pull request can read (a slow Ubuntu
  mirror made one install step take 26 minutes). `test/build/ci-commands.test.ts` lists the
  commands CI runs and fails when one is dropped.

### Fixed

- **A text button with an icon no longer moves when it upgrades.** The pre-upgrade
  stylesheet now reserves the same inline padding as the upgraded button at the
  default size and every explicit size, keeping the button and following content in
  place. It had moved 4 px at the default, `xs` and `s` sizes, and 24, 72 and 104 px
  at `m`, `l` and `xl`, where the layout-shift scores were 0.017, 0.091 and 0.180.
- **The text field's trailing icon button keeps its 48px target centred under `dir="rtl"`.**
  The `touch-target` mixin anchored its `::after` with `inset-inline-start: 50%` and then moved it
  with the physical `translate(-50%, -50%)`. Right-to-left, the logical inset pins the box's right
  edge at the button's centre and the translate then pushes it another 24px left: the 48 x 48 box
  sat with its centre 48px left of the button's centre and its right edge 4px left of the button's
  left edge, so the button's hit area was its own 40px box (plus the engine's one pixel), measured
  by walking `elementFromPoint` out from each edge in headless Chromium. The mixin now anchors with
  physical offsets (`left: 50%`), as the icon button's own rule does, so the physical translate
  centres it in both directions; left-to-right measures the same as before. Only the trailing-icon
  target rule changes in the compiled sheet (2,744 rules before and after, one changed). The
  mixin's only live user is the text field's trailing icon button, which only the factory renders
  (the `<m-text-field>` element has no attribute for the label that makes the icon a button).
- **The side sheet's and the dialog's close buttons reach 48 x 48.** Both were hand-built 40px
  buttons with no expanded target, so a pointer 4px outside an edge — the outer band of the M3
  target — hit nothing, left-to-right and right-to-left alike. Each now carries the icon button's
  own mechanism: a `::after` box 48 x 48 centred on it, so the reachable target is 48 x 48 while
  the button still paints 40 x 40, in place. M3 "Density": "The default target size should be at
  least 48x48 CSS pixels."
- **A multiline text field uses the value it was created with.** `createTextField({ type: 'multiline', value })` wrote that string as a `value` attribute. A textarea does not take its value from that attribute, so `getValue()` was empty, the label stayed down, and a reset restored nothing. The value is now the textarea's default value, which is its text: the field shows it, the label floats, and a reset restores it. A single-line field still uses the `value` attribute. `<m-text-field>` no longer sets the default a second time.
- **An unlabelled switch is its 52 x 48 track box, not the label's row.** With no label the root
  kept the label's 12px gap, so it was 64px wide (12 + the 52px track) and 56px tall: in a 48px
  slot the track ran 16px past the end and the checked 40px state layer 20px past it. The gap
  belongs between a label and the track, and with no label the root is now the track's width and
  48px tall with the 32px track centred. M3 "Switch" -> Specs -> Measurements gives the track
  32x52dp and "Target: Size 48dp", and no height for a label row; its Accessibility section:
  "Don't apply density to switches by default — this lowers their targets below our best
  practice of 48x48 CSS pixels." So the unlabelled row is 48 tall, and a labelled switch keeps
  its 56px row, unchanged. A switch with supporting text and no label is not unlabelled: its
  helper stands where the label would, keeping the 12px gap and the 56px row. A label made only
  of spaces is not empty, so the factory still treats `label: " "` as a labelled switch (the
  element trims its text, so this is the factory only). Factory and element, left-to-right and
  right-to-left. Before upgrade,
  write the tag with nothing between its tags: a whitespace-only text node (a space, a line
  break) is not `:empty`, so such a host keeps the labelled layout although the element then
  builds no label.
- **A radio row grows with a wrapping label, and the circle stays centred on the label block.** The row was a fixed 48px, so a three-line label painted 12px above and below it, and two adjacent wrapping labels overlapped. The row is now at least 48px (`min-height`) with 4px of vertical padding, so it grows with the text and a one-line row stays 48px (circle 14px from the top and 10px from the inline start, text 12px from the top, 8px gap). The circle stays centred on the label block, as a labelled checkbox's box is. A horizontal group keeps `align-items: flex-start` and sets no `align-self`: options on one line share the start edge, and the next line starts after the tallest row. The pre-upgrade `<m-radio>` reserves the same minimum (`min-height: 48px`); a short label stays 48px.
- **An unlabelled radio is centred in its 48px target.** The factory always appends `.mtrl-radios__text`, and an empty label still took the 8px inline-start margin, so the 40px control sat flush at the start: the 20px circle's centre was at 20 rather than 24 (inset 10/18) and the state layer's inset was 0/8. An empty text span now takes no space. The row would then be 40px wide, so the unlabelled row sets `min-width: 48px` and centres the control. The circle's inset is 14/14 and the state layer's inset is 4/4, in both directions. A label made only of spaces is not empty, so the factory still treats `label: " "` as a labelled option (the element trims its text, so this is the factory only). Material 3 radio button, Specs, Measurements: icon size 20dp, state layer size 40dp, target size 48dp.
- **An unlabelled checkbox centres its box in its 48px target, state layer inside.** The 18px
  box sat flush at the inline-start (start inset 0, end inset 30), so the 40px state layer
  (`::before`, centred on the box) spanned −11 to 29 — 11px outside the target — and the
  focus ring reached 16px before the root's edge. Factory and element, left-to-right and
  right-to-left. With no label the root is its own target, so the box now keeps 15px on both
  sides (M3 "Icon alignment Center-aligned", "Target size 48dp") and the state layer
  ("State-layer size 40dp") lies 4px inside the root on all sides. A labelled checkbox, whose
  root hugs box, gap and label, is unchanged. Before upgrade, write the tag with nothing between
  its tags: a whitespace-only text node (a space, a line break) is not `:empty`, so such a host
  keeps the labelled layout although the element then builds no label.
- **An `<m-icon-button>`'s icon keeps its size token.** The element's inner `<button>` kept Chrome's
  default padding, `1px 6px`, because the page reset's `button { padding: 0 }` is not in the shadow
  root's adopted stylesheets, while the factory, which the page's global stylesheet does reach,
  computes `0px`. Where the container left no room for icon and padding, the icon, a shrinkable flex
  item, was drawn under its token: outlined xs narrow 14 against 20, outlined s narrow 18 against 24,
  filled, tonal and standard xs narrow 16 against 20 and their s narrow 20 against 24, outlined xs
  default width 18 against 20. The component stylesheet the element adopts now repeats the reset.
- The package no longer contains a second copy of the README and licence under `dist/`.
- **Select: the menu, measured against the field in every layer.** Three defects from a
  measurement of the select, in the factory's default layer (the menu inside the select's
  element), with `layer: "top"`, and in `<m-select>`:
  - **Right to left, the selected option's check mark was drawn over its text.** It stayed at
    the item's right, where right-to-left text begins: 18px of overlap. It is at the item's
    end in both directions. The same holds for a selected item of any menu.
  - **The menu is its field's width in both layers.** In the default layer it kept a menu's
    280px maximum, so under a 400px field it was 280px wide and stopped 120px short; in the
    top layer it was 400px. The rule is one: the menu is as wide as its field (Compose's
    exposed dropdown matches its anchor's width), and never under the 112px the M3 site gives
    a menu as its minimum.
  - **The selected option has one look, the M3 token's:** secondary-container with
    on-secondary-container text (`md.comp.menu.list-item.selected.container.color` and
    `.label-text.color`). In the top layer, and so in `<m-select>`, it was the primary colour
    at 12% with primary text.
- **A button's asymmetric icon padding mirrors in right-to-left.** A size `s` button with a leading icon, and a text button at `xs` or `s` with a leading icon, keep 12px before the icon and 16px after the label in both directions. Under `dir="rtl"` those insets had stayed physical, so the start side was 16px and the end side 12px. The insets are logical and follow the direction the icon already follows, including into a shadow root whose `dir` ancestor is outside it.
- **`<m-text-field>` in a right-to-left page is mirrored.** A `dir="rtl"` on an
  ancestor is outside the element's shadow root, where the stylesheet's `[dir]` selectors do
  not reach, and the class that stands in for it was set for the outlined variant only: a
  filled `<m-text-field>` kept its left-to-right layout (label, icons, prefix and suffix on
  the wrong side, the text's padding unswapped), and an outlined one mirrored its label and
  its outline's corners only. A field now takes the `mtrl-text-field--rtl` class from its
  computed direction in both variants, and the stylesheet mirrors on that class or on an
  ancestor's `dir`. The same holds for a text field built by the factory inside a shadow
  root of your own. In the light DOM a plain filled field is still mirrored by the
  stylesheet alone, with no style read: it reads its direction only inside a shadow root,
  once, in the task that created it. **A plain filled field that is attached to a shadow
  root in a later task than the one that created it, or whose host is not yet connected
  when that task ends, is not mirrored until you call `updatePositions()`.** A direction
  changed afterwards is likewise picked up only by the field's next placement
  (`updatePositions()`, or a setter that places), as it was for the outlined variant; the
  field does not watch for either. Also fixed, in the light DOM too: **right to left, a
  field with both a leading and a trailing icon** padded its text 16px on the leading icon's
  side, under the icon; it is 52px on both.
- **Text field: with reduced motion, the filled field's focus indicator no longer fades.** Its 0.2s transition was not in the field's reduced-motion rule, where the
  label, the outline, the icons and the affixes are. It also runs on the motion tokens now
  (`duration-short4`, `easing-standard`: the same 0.2s, on the standard curve, where it was the
  browser's `ease`).
- **Text field, right to left: a compact filled field with a leading icon keeps its compact
  padding.** The right-to-left rule beside an icon set all four sides, so the
  field took the default density's top and bottom padding and its text sat 2.5px low.
- **A filled multiline text field's first line no longer runs under its floated label.** The textarea padded its text 12px from the top whatever the variant, and the
  floated label's box ends 19.2px down: they overlapped by 7.2px (13px at compact density).
  The first line now starts under the label, at the single-line field's text (the values are
  under "Changed"). `<m-text-field type="multiline">` reserves the same first line before it
  upgrades, so a sibling on its line does not move when the element is defined.
- **Text field: beside an icon, a prefix or a suffix no longer leaves the value under the icon.** The input's padding was sized from the affix alone. With a leading icon and a
  prefix the value began 25.5px in, under the icon (12 to 36px) and before the prefix (44px);
  a trailing icon with a suffix did the same at the other end; right to left, the padding was
  on the wrong side. The text now starts 2px after the prefix and ends 2px before the suffix,
  whatever stands outside them, in both variants, both densities and both directions
  (measured: with the icon, the text starts at 63.5px, after a 9.5px prefix at 52px). The
  script no longer writes `padding-left` and `padding-right` on the input or `left` on the
  label. It writes each affix's measured width on the field's root, as
  `--mtrl-text-field-prefix-width` and `--mtrl-text-field-suffix-width`, and the stylesheet
  adds the icon's inset. The insets themselves, the gap to the text and the label, which no
  longer follows the prefix, are under "Changed".
- **A top-layer dialog that refuses Escape stays open, however often it is pressed.** With `closeOnEscape: false` the third Escape closed it; with a `beforeclose`
  listener that refused, the third Escape made the browser close the `<dialog>` while
  `isOpen()` stayed true and no `close` was emitted (measured in Chromium, Firefox and
  WebKit: the browser lets a page refuse `cancel` twice in a row and forces the third). Escape
  is now a key press the dialog prevents, so no `cancel` is sent. And when the browser does
  close the `<dialog>` itself, the dialog's state follows: `isOpen()` is false and `close` is
  emitted, without `beforeclose`. The defect is also in 0.10.x; the fix is in material 3.0.0.
- **Escape with a menu open inside a default-layer dialog closes the menu only.** It
  closed the dialog as well, under the menu: the dialog's listener ran before the menu's.
- **Chips: a chip destroyed while it has focus hands focus to its neighbour.**
  `chip.destroy()` called directly on a focused chip of a set left focus on the page, so a
  keyboard user lost their place. Focus now moves to the chip that takes its place, or to
  the one before when it was the last, as it does when the set removes a chip.
- **A dialog destroyed right after `open()` no longer locks the page's scroll.** The
  default-layer dialog shows its surface 10 ms after `open()`. `destroy()` in that window left
  the timer running: it then set `overflow: hidden` on the body for a dialog that was gone,
  with nothing left to undo it. `destroy()` now cancels what `open()` and
  `close()` left pending, and removes the dialog's document listeners.
- **Snackbar: a queued snackbar dropped from the queue can be shown again.** One
  waiting behind another and then dropped by a `queueBehavior: 'replace'` snackbar or by
  `clearSnackbars()` kept `state` `"visible"` without ever being shown, and `show()` on it
  did nothing from then on. It is now hidden when dropped. The defect is also in 0.10.x; the
  fix is in material 3.0.0.
- **Date picker: `open()` called from a click outside a docked picker opens it.**
  The same click then reached the picker's outside-click listener and closed it at once. A
  click in the task that called `open()` no longer closes it. The defect is also in 0.10.x;
  the fix is in material 3.0.0.
- **Snackbar: destroying the one on screen lets the next take its turn.**
  `destroy()` on the visible snackbar left the queue waiting for it, so snackbars shown behind
  it stayed queued until some other snackbar was shown. The queue now moves on, after its
  usual gap.
- **Accessibility: scrolling from script honours reduced motion in the chips, the tabs and the
  search.** The chip set's `scrollToChip`, the tabs' scroll buttons and the search's
  arrow keys through the suggestions each asked for a smooth scroll explicitly, which overrides
  the stylesheet, so they glided with the reduced-motion preference on. They now name no
  behaviour: each scroller scrolls smoothly from its stylesheet (`scroll-behavior: smooth`,
  new on the tabs' scroller and the suggestion list), and jumps at once under reduced motion.
  A script of yours that scrolls the tabs' scroller or the suggestion list now scrolls it
  smoothly too.
- **A chip destroyed on its own leaves its chip set.** Calling `destroy()` on a chip, rather than removing it through the set, used to leave that chip in the set. The set could then count it as selected beside another chip, including two selected chips in a single-select set, and the arrow keys stopped on it. The set now drops that chip. Dropping it does not emit `remove` or `change`. Removing a chip through the set is unchanged.
- Checkboxes keep their check icon, and pre-upgrade element styles appear, when one process uses multiple documents.
- A multiline text field reserves its textarea box before it upgrades, so the field and the line beside it no longer jump when the element is defined.
- **Single-select chip sets keep one selected chip.** Adding a chip
  with `selected: true` selects it and deselects the previous chip, including
  initial factory config and `<m-chip selected>` declarations. The last selected
  chip wins; `add.value` reports the resulting selection. Programmatic additions
  emit `add` and no `change`. Selecting a chip through its `setSelected(true)`
  also replaces the previous selection silently. A chip the set has removed or
  destroyed no longer clears that selection: destroying the chip drops the set's
  hook. The public chip factories ignore a caller-supplied `onSelected`.
- **Progress indicators size their canvas when they are created.** A linear canvas is as tall as its track (4dp, 8dp thick, 10dp wavy at the default thickness) and fills its container; a circular one is its token size (40dp, 48dp wavy, or the configured size from 24dp to 240dp). The size comes from those tokens, not from measuring the element, so the canvas no longer reserves the default 300×150 until it upgrades.
- **Sliders, tabs and loading indicators take their first position from configuration.** A slider's track, stops and inset icon are a percentage of the value, so they no longer wait on a measurement that is 0 before layout. A tab's indicator anchors to the active label, or to the tab itself when it is secondary. A loading indicator's canvas is its token size (48dp, or the configured size) when it is created.
- Element upgrade removes leftover direct declarative shadow templates, including when definitions precede parsing; those templates no longer count as label content.
- Elements construct on a server DOM (linkedom) without browser-only APIs.
- Element teardown finishes cleanup after an individual cleanup throws.
- Text field and select placement cancel and reset their shared measurement timer when the
  last pending field is destroyed, allowing the next lifecycle to schedule again.
- Prefilled multiline text fields render in SSR, including inside another custom element.
- `consumer:check` no longer fails on the open split button's screenshot pair. One of the two
  captures sometimes blended the menu's shadow a few levels lighter where it falls on the buttons
  (26 to 29 pixels, either build). The comparison fixture now keeps an open menu on a compositor
  layer of its own, and a pair that differs in pixels only is captured once more before it counts.
- `ssr:check` no longer depends on whether the browser has applied `:hover` at the page origin
  when it captures. The fixture sat there, under a new page's resting pointer, and CI captured a
  button group hovered before the upgrade and not after. The stage now starts 32px down, and both
  passes assert that no control of the fixture is under the pointer.
- `preupgrade:check` fails a row when a sibling moves more than 0.5px on either axis,
  regardless of its layout-shift score. Known movements name the sibling, axis and signed
  measured value with a 0.5px tolerance; other movements in that row still fail. Filtered
  runs enforce the same checks, and a disappeared defect requires removing its exception.
  Consumer-typography switch cases also reject host movement or resizing over 0.5px.
- SSR parity now requires exact Chromium matches for progress, sliders, tabs and loading
  indicators after the earlier change/the earlier change; their 22 resolved exceptions are removed.
- Element CSS file and export checks run after the CI build, so unit tests pass without `dist/`.
- SSR security reparsing runs in the Chromium CI job while unit tests remain browser-free;
  SSR parity and benchmark tooling load the source renderer and source CSS registry.
- Source SSR reads the element CSS registry without resolving built package exports; source tests register real Sass output without mocking the CSS import.

`material` 3.0.0 is MIT; `material` 1.x was GPL-3.
