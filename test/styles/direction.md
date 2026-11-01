# The direction switch

The full contract of `src/styles/abstract/_direction.scss` and
`src/styles/abstract/_emit.scss`. This file is documentation only; it is not
packed with the package, so the shipped modules stay lean.

## Which artefact compiles in which form

`_emit.scss` holds the switch: `$direction-arms: false !default`. The default
is logical: every sheet the library itself adopts — the elements' shadow
roots, the pre-upgrade rules — keeps the native logical properties, which
mirror on the computed `dir` alone and never on `lang`.

The two artefacts a consumer's bundler takes through a CSS pipeline,
`dist/styles.css` and `dist/styles/<name>.css`, are compiled once more with
`$direction-arms: true` (`scripts/build-styles.ts`): a bundler configured for
older browser targets rewrites `inset-inline-start` and the logical corner
radii into `:lang()` arms that match a language, never `dir="rtl"`
(`src/styles/components/_text-field.scss`), so those sheets carry the physical
side plus a direction arm instead — nothing left to lower. The entry
configures the module; every `@use` after it reads the same value.

In the arms form each call of `_direction.scss` emits the physical side the
value matches left-to-right plus the mirrored side as a direction arm (`rtl`
in `abstract/_mixins.scss`), so no `:lang()` lowering of the sheet can pin a
start placement to the left edge of a right-to-left page.

## The call sites' options

`$self: true` is the form for a value the site sets on itself (a factory's
root): the arm also matches the marker on that element. The arm resets the
base side to `auto` so the mirrored rule replaces the base one instead of
adding to it, exactly as the logical property resolves one side per
direction.

`$arm: false` writes the declaration without its arm: for a site whose
mirrored form is aggregated — several placements in one arm, named at a block
that also carries the marker's own form (`arms`, `arms-selector`). The call
site pairs it with one of those.

## The mixins

- `start($value, $self, $arm)` / `end(...)`: the inline-start / inline-end
  inset.
- `sides($start, $end, ...)`: both inline insets at once, `auto` allowed on
  either side — the pair a placement pins to one edge writes as one call, and
  the arm swaps the two values whole.
- `corners($start-start, $start-end, $end-start, $end-end, ...)`: the four
  logical corner radii, `null` for a corner this rule does not declare. With
  all four the arms form is the physical `border-radius` shorthand and the arm
  swaps its start and end columns; with fewer, each declared corner is the
  physical longhand and the arm writes the mirrored longhand — the sites that
  round part of a box name every corner they own.
- `arms($self)`: a direction arm this site aggregates by hand: the mirrored
  declarations of several placements in one block, so every shipped copy pays
  one prelude. Nothing in the logical form — the properties mirror natively
  there.
- `arms-selector($subject)`: the same arms-only wrapper for a subject that is
  not the include site's selector extended — a BEM element or a variant class
  written at the root of the component's block, whose prelude is shorter
  without the component class the nesting would add (`rtl-selector` in
  `abstract/_mixins.scss`).
- `arms-at-root($prelude)`: an arms-only block at the document root under a
  prelude this site owns whole: the aggregated arm whose shape the wrappers
  above do not express — one prelude shared across the marker forms, a
  subject list of its own, cut by the nested LTR boundary. The prelude is the
  site's; only the arms-only part is the switch's. Nothing in the logical
  form.
- `arms-self-only()`: only the self arm, for a marker on the root this block
  is written in: the arm members of `arms` need the marker on an ancestor,
  and a part of a root that carries the marker itself is reached by the
  root's own selector. The logical form emits nothing.
- `flip-start($value)` / `flip-end($value)`: a logical alias of a physical
  base a shared rule already wrote on the pair (a FAB's `--top-end` beside
  `--top-right`): the arms form flips that base under a self arm; the logical
  form replaces it with the logical property, which resolves the corner in
  either direction. The physical alias of the pair never goes through this —
  it stays where the shared rule put it.
- `transition($property, $timing)` (a function): one transition entry for
  `$property` under `$timing` (a duration and an easing together), in the
  form this compile emits: an inline inset names both physical sides in the
  arms form, so a move animates whichever side the direction placed it on
  instead of jumping on the side the arm unset.
- `start-value($name, $value)`: an inline-start inset whose value states
  re-place (a switch's handle and state layer): the base names a custom
  property as the value's fallback and the states override the property
  (`start-value-set`), so the arms form carries one arm per subject while
  every state's move rides the property — a bundler lowers no custom
  property. The logical form is the plain logical inset, state overrides
  included; it mirrors natively and names no property.
- `start-value-set($name, $value)`: a state's override of a `start-value`
  base: the property this state moves the subject to.
