# Migrating to material 3

This guide covers `mtrl` applications moving to `material` 3, checked against the published **3.0.5** package. Upgrade to the latest `mtrl` 0.10.x first and clear its deprecation warnings, then install `material` and update imports. The old `material@legacy` package is a separate library; these are not its API mappings.

Changes below took effect in **3.0.0**, unless another version is stated. Canonical names often existed alongside deprecated names in 0.10.x; material 3 removes the aliases. Search application code, templates, styles, saved theme settings, and generated markup.

## 1. Replace retired themes first

| Retired name in 3.0.0 | Replacement |
| --- | --- |
| `material` | `baseline` |
| `winter` | `ocean` |
| `browngreen` | `brownbeige` |
| `legacy` | No direct replacement: choose a current theme or supply your own color custom properties. |

Replace the name in both imports and `data-theme`. At the root, a retired name gets baseline colors in the **system** light/dark scheme: that element's `data-theme-mode` and `data-theme-contrast` are ignored. The system contrast preference is ignored too.

Inside another theme, the retired name matches no theme rule and inherits its ancestor's colors. There is no warning. The retired theme imports fail to resolve.

```html
<!-- Before: the requested dark/high palette is ignored -->
<html data-theme="winter" data-theme-mode="dark" data-theme-contrast="high">
<!-- After -->
<html data-theme="ocean" data-theme-mode="dark" data-theme-contrast="high">
```

**Compiling several themes yourself (3.0.x): import baseline first.** Its unscoped `:root` light defaults, system-dark defaults, and `.dark-theme` rules can overwrite another theme when baseline comes later. On `<html data-theme="ocean">`, `:root` and `[data-theme="ocean"]` have equal specificity: baseline last gives baseline primary colors (`#6750a4` in system light, `#d0bcff` in system dark), instead of Ocean's `#006493`. Put the baseline partial before every other theme, or use the shipped themes bundle (included in `material/styles`). The shipped themes index already forwards baseline first. This import-order workaround is verified against **3.0.5**.

## 2. Rename options, factories, and selectors

All rows in this table changed in **3.0.0**. They cover the changelog's complete **Renamed** table; lists map in the same order.

| Old name | Use instead |
| --- | --- |
| `createTextfield`; `TextfieldConfig`, `TextfieldComponent`, `TextfieldDensity`, `TextfieldEvents`, `TextfieldValuePayload`, `TextfieldFocusPayload`, `TextfieldTrailingPayload` | `createTextField`; `TextFieldConfig`, `TextFieldComponent`, `TextFieldDensity`, `TextFieldEvents`, `TextFieldValuePayload`, `TextFieldFocusPayload`, `TextFieldTrailingPayload`; all are available from `material/components/text-field` |
| `TEXTFIELD_VARIANTS`, `TEXTFIELD_STATES`, `TEXTFIELD_TYPES`, `TEXTFIELD_EVENTS`, `TEXTFIELD_DENSITY`, `TEXTFIELD_DEFAULTS`, `TEXTFIELD_CLASSES` | `TEXT_FIELD_VARIANTS`, `TEXT_FIELD_STATES`, `TEXT_FIELD_TYPES`, `TEXT_FIELD_EVENTS`, `TEXT_FIELD_DENSITY`, `TEXT_FIELD_DEFAULTS`, `TEXT_FIELD_CLASSES` from `material/components/text-field/constants` |
| `textfieldElement`, `defineTextfield`, `TextfieldSpec`, `TextfieldElement`, `TextfieldElementComponent` | `textFieldElement`, `defineTextField`, `TextFieldSpec`, `TextFieldElement`, `TextFieldElementComponent` from `material/elements` |
| `Textfield` in React, Solid, Svelte; `MTextfield` in Vue | `TextField`; `MTextField` |
| Sass `$textfield`, `textfield()` in `abstract/variables` | `$text-field`, `text-field()`; for example, `v.text-field('height')` |
| `SELECT_CLASSES.TEXTFIELD` | `SELECT_CLASSES.TEXT_FIELD` (`select__text-field`) |
| `select.textfield` | `select.textField` |
| `<m-textfield>` | `<m-text-field>`; the old tag is unregistered and has no component rendering |
| `mtrl-textfield`, `mtrl-textfield__…`, `mtrl-textfield--…` | `mtrl-text-field`, `mtrl-text-field__…`, `mtrl-text-field--…`; old selectors no longer match |
| `::part(textfield)` on a text field or select | `::part(text-field)` |
| `/components/textfield`, `/components/textfield/constants`, `/styles/textfield`, `/elements/css/textfield` import suffixes | The same suffixes with `text-field`; also use `/elements/preupgrade/text-field.css` |
| `setComponentDefaults('textfield', …)`, `setGlobalDefaults({ textfield: … })` | The key `'text-field'`; old defaults are silently unused |
| `CardSchema` | `CardConfig` |
| Time picker option `isOpen`; `TIMEPICKER_DEFAULTS.IS_OPEN` | `open`; `TIMEPICKER_DEFAULTS.OPEN`. To read state, call `picker.isOpen()`; testing the function itself is always truthy. |
| Factory types `TopAppBar`, `BottomAppBar` | `TopAppBarComponent`, `BottomAppBarComponent`; adapter components keep their names |
| Chip option `text` (also in chip-set items) | `label`; old `text` silently renders an empty label |
| Tabs `indicatorHeight`, `indicatorWidthStrategy` | `indicator: { height, widthStrategy }`; old options are ignored |
| Shape names `cookie4`, `cookie9` | `cookie4Sided`, `cookie9Sided`; old names throw |
| `createElement({ rawClass: … })` | `class` or `className`; `rawClass` becomes an HTML attribute instead of setting classes |
| Tooltip option `rich: true` | `variant: 'rich'`; the old option does not select the rich variant |
| Icon-button adapter handler `onToggle` (Svelte: `ontoggle`) | `onChange` (Svelte: `onchange`); read `event.detail.selected` and `event.detail.value`. The old handler is rejected by the adapter's types. |

**Spelling check, not a new 3.0 rename:** the text-field factory option is `maxLength` in material 3.0.5. This spelling already existed in `mtrl` 0.10.7. A JavaScript `maxlength` option is ignored; an object literal is a TypeScript error. The **HTML attribute remains `maxlength`**, including on `<m-text-field>`.

Change `select.textfield` and `SELECT_CLASSES.TEXTFIELD` when upgrading to 3.0.0: unlike most aliases, their replacements do not exist in 0.10.x. The Sass rows describe source helpers, not a supported Sass configuration API in 3.0.5; theme with CSS custom properties.

## 3. Name interactive trailing icons

Since **3.0.0**, a factory trailing icon without `trailingIconLabel` is decorative: it is an `aria-hidden` span and is absent from the accessibility tree. A custom click listener does not give it an accessible name or button semantics. The label option and button behavior were introduced in **mtrl 0.10.5**.

```ts
import { createTextField } from 'material';

const field = createTextField({
  trailingIcon: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trailingIconLabel: 'Clear',
});
field.on('trailing', () => field.setValue(''));
// To replace an icon later: field.setTrailingIcon(iconHTML, 'Clear');
```

The label makes the trailing control a button. In **3.0.5**, `<m-text-field>` and the framework adapters have no trailing-icon label attribute or prop, so their trailing icons remain decorative.

## 4. Replace removed names and imports

These removals took effect in **3.0.0**, except the legacy navigation factories, removed in **mtrl 0.10.0**.

| Removed name | Replacement or action |
| --- | --- |
| Icon-button event `toggle` | Factory: `button.on('change', ({ selected, value }) => …)`. On `<m-icon-button>`, listen for DOM `change` and read `event.detail`. Old listeners never fire. |
| `createSegmentedButton`, `createSegment`; segmented-button component/style imports | `createButtonGroup({ kind: 'connected' })`. Map `mode` → `selection`, `segments` → `buttons`, `checkmarkIcon` → `selectedIcon`; selection can be `single`, `multi`, or `none`. |
| Retired theme imports | Use the theme replacements in section 1. |
| FAB / extended FAB `variant: 'surface'`, `FAB_VARIANTS.SURFACE`, `EXTENDED_FAB_VARIANTS.SURFACE` | Choose a current container or tone variant, such as `'primary-container'` or `'primary'`; the constants have matching keys. A leftover surface variant falls back to default styling. |
| FAB `size: 'small'`, `FAB_SIZES.SMALL`, `FAB_CLASSES.SMALL`, `FAB_ICON_SIZES.SMALL` | Use `default`, `medium`, or `large`; `FAB_SIZES` and `FAB_ICON_SIZES` have `DEFAULT`, `MEDIUM`, `LARGE`. For size classes, use `FAB_CLASSES.MEDIUM` or `.LARGE`; default needs no size modifier. A leftover small FAB renders at the default 56px. **Extended FAB still supports `small`.** |
| `getThemeColor('sys-color-X-rgb')` | `getThemeColor('sys-color-X', { alpha: 0.12 })` from `material/core/utils`. Undeclared `-rgb` properties return an empty string, breaking a surrounding `rgba(…)`. Your own declared properties still work. |
| `TIMEPICKER_CLASSES` | `TIMEPICKER_SELECTORS` from the time-picker constants: these are **prefixed selectors**, not bare class names, and not every old key has an equivalent. For example, `DIAL` is `.mtrl-time-picker__dial`. |
| `TABS_DEFAULTS.INDICATOR_HEIGHT`, `INDICATOR_ANIMATION_DURATION` | Configure `indicator.height`, `indicator.animationDuration` on the tabs instance. |
| `DEFAULT_DATE_FORMAT` from the date-picker component entry | Import it from `material/components/datepicker/constants`. |
| Sass shape steps `extra-tiny`, `tiny`, `pill` | Write literal `1px`, `2px`; use `full` for `pill`. The old shape helper calls fail compilation. |
| Sass `$mtrl-sys-shape` | `v.shape(<step>)` from `abstract/variables`. |
| `select.menu` | Use the select's `open()`, `close()`, `isOpen()`, `getOptions()`, `setOptions()` and its `open`, `close`, `change` events. The `menu` **configuration option stays**. |
| `splitButton.menu` | Use `expand()`, `collapse()`, `isExpanded()`, `setItems()`, `getItems()` and `expand`, `collapse`, `select` events. Both removed `.menu` properties read `undefined`. |
| Progress public types: `canvas`, `track`, `indicator`, `buffer` element, `resize()` | Find the canvas with `progress.element.querySelector('canvas')`; size is observed automatically. `setBuffer()` / `getBuffer()` control the numeric buffer. **3.0.5 caveat:** TypeScript rejects the legacy members, but JavaScript still exposes them. Migrate to the supported API. |
| `createNavigation`, `createNavigationSystem` (**mtrl 0.10.0**) | Choose `createNavigationRail`, `createDrawer`, or `createTabs` for the layout. |

Delete these obsolete options and constants; they have no replacement in **3.0.0**:

- Checkbox `variant`, `CheckboxVariant`, `CHECKBOX_VARIANTS`; list `prefix`; radios `rippleConfig`, `RADIO_VARIANTS`, `RADIO_LABEL_POSITIONS`, `RADIO_SIZES`, `RADIO_CLASSES`, and `RADIO_DEFAULTS.VARIANT`, `.LABEL_POSITION`, `.SIZE`.
- `TOOLTIP_DEFAULTS.RICH`; time-picker `closeOnSelect`, `TIMEPICKER_DEFAULTS.CLOSE_ON_SELECT`, `TIMEPICKER_DIAL`, `TIMEPICKER_Z_INDEX`, and `TIMEPICKER_SELECTORS.MODAL`, `.DIAL_CANVAS`, `.DIAL_HAND`.
- `TABS_DEFAULTS.INDICATOR_ANIMATION_TIMING`, `.ICON_SIZE`; `TEXT_FIELD_CLASSES.LABEL_FLOATING`; `SLIDER_MEASUREMENTS.TRACK_RADIUS`, `.SMALL_TRACK_EXTERNAL_RADIUS`, `.LARGE_TRACK_RADIUS_RATIO`, `.HANDLE_GAP_PRESSED_REDUCTION`, `.CENTER_GAP`, `.EDGE_PADDING`.
- Chip options `managedSelection`, `cell`: the chip set owns these internals.

For imports in **3.0.0**, replace the `mtrl` package name with `material`. Use ESM `import` (or dynamic `import()` from CommonJS). Node's `require('material')` fails.

Core helpers left the root: for example, import `pipe` from `material/core/compose`; the [complete root-export mapping](scripts/fixtures/root-exports.md) lists the moves.

Replace `core/compose/features` with `core/compose`; nested component folders such as `components/chips/chip` no longer resolve. Use public component factories instead.

See the [full 3.0.0 migration notes](CHANGELOG.md#migrating-from-010x) for event payload and other behavioral changes beyond these names, and the [older migration notes](CHANGELOG.md#migrating-from-09x) if starting before 0.10.
