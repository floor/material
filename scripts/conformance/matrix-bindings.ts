import type { Aspect, FixtureBinding, Probe, RowBinding } from "./matrix-types";

const height = (part: string): Probe => ({ part, box: "height" });
const width = (part: string): Probe => ({ part, box: "width" });
const css = (part: string, style: string): Probe => ({ part, style });
const colour = (part: string): Probe => css(part, "backgroundColor");
const corner = (part: string): Probe => css(part, "borderTopLeftRadius");
const outline = (part: string): Probe => ({ part, outline: true });
const inset = (part: string, relativeTo: string, edge: "left" | "right" | "top" | "bottom"): Probe =>
  ({ part, relativeTo, inset: edge });

const gap = (part: string, relativeTo: string, edge: "right" | "bottom"): Probe => ({ part, relativeTo, gap: edge });
const present = (part: string): Probe => ({ part, read: "present" });
const opacity = (part: string): Probe => ({ part, read: "opacity" });
const elevation = (part: string): Probe => ({ part, read: "elevation" });
const translateX = (part: string): Probe => ({ part, read: "translateX" });
const sideInsets = (part: string, relativeTo: string): Probe => ({ part, sideInsets: relativeTo });
const different = (part: string, relativeTo: string, axis: "width" | "height" | "aspectRatio"): Probe =>
  ({ part, relativeTo, different: axis });
const widthPair = (part: string, secondCase: string): Probe => ({ part, widthPair: secondCase });

type Spec = [key: string, property: string, aspect: Aspect, fixtureCase: string, probe: Probe, token?: string, variant?: string];
const spec = ([key, property, aspect, fixtureCase, probe, token, variant]: Spec): RowBinding =>
  ({ key, property, aspect, case: fixtureCase, probe, token, variant });

function fixture(fixtureName: string, name: string, specs: Spec[], id = fixtureName): FixtureBinding {
  return { fixture: fixtureName, id, name, rows: specs.map(spec) };
}

const buttonSizes = [
  ["xs", "XSmall"], ["s", "Small"], ["m", "Medium"], ["l", "Large"], ["xl", "XLarge"],
] as const;
const buttonVariants = ["filled", "tonal", "outlined", "elevated", "text"];
const buttonHeight: Spec[] = buttonVariants.flatMap(variant => buttonSizes.map(([size, token]): Spec =>
  [`container-height/${variant}/${size}`, "Container height", "size", `${variant}/${size}/rest`, height("root"),
    `Button${token}Tokens.ContainerHeight`, `${variant}, size ${size}`],
));

const buttonGeometry = buttonSizes.flatMap(([size, token]): Spec[] => [
  [`square-corner/${size}`, "Square corner radius", "shape", `filled/${size}/square rest`, corner("root"),
    `Button${token}Tokens.ContainerShapeSquare`, `filled, size ${size}`],
  [`icon-size/${size}`, "Icon size", "size", `filled/${size}/icon rest`, width("icon"),
    `Button${token}Tokens.IconSize`, `filled, size ${size}`],
  [`icon-label-gap/${size}`, "Icon to label space", "spacing", `filled/${size}/icon rest`, css("root", "columnGap"),
    `Button${token}Tokens.IconLabelSpace`, `filled, size ${size}`],
  [`padding-start/${size}`, "Content start padding", "spacing", `filled/${size}/rest`, css("root", "paddingLeft"),
    `Button${token}Tokens.LeadingSpace`, `filled, size ${size}`],
]);

const groupHeights = ["standard", "connected/round", "connected/square"].flatMap(variant =>
  buttonSizes.map(([size, token]): Spec => [
    `button-height/${variant}/${size}`, "Button height", "size", `${variant}/${size}/rest`, height("middle"),
    `Button${token}Tokens.ContainerHeight`, `${variant.replace("/", " ")}, size ${size}`,
  ]),
);
const iconHeights = buttonSizes.map(([size, token]): Spec => [
  `container-height/${size}`, "Container height", "size", `filled/${size}/rest`, height("root"),
  `${token}IconButtonTokens.ContainerHeight`, `filled, size ${size}`,
]);
const splitHeights = buttonSizes.map(([size, token]): Spec => [
  `container-height/${size}`, "Container height", "size", `filled/${size}/rest`, height("root"),
  `SplitButton${token}Tokens.ContainerHeight`, `filled, size ${size}`,
]);
const cardVariants = [["elevated", "Elevated"], ["filled", "Filled"], ["outlined", "Outlined"]] as const;
const cards = cardVariants.flatMap(([variant, token]): Spec[] => [
  [`corner/${variant}`, "Container corner radius", "shape", `${variant}/light/rest`, corner("card"), `${token}CardTokens.ContainerShape`, variant],
  [`container-colour/${variant}`, "Container tone", "colour", `${variant}/light/rest`, colour("card"), `${token}CardTokens.ContainerColor`, variant],
]);
const chips = [["assist", "Assist"], ["filter", "Filter"], ["input", "Input"], ["suggestion", "Suggestion"]] as const;
const chipSizes = chips.flatMap(([variant, token]): Spec[] => [
  [`container-height/${variant}`, "Container height", "size", `${variant}/rest`, height("chip"), `${token}ChipTokens.ContainerHeight`, variant],
  [`container-corner/${variant}`, "Container corner radius", "shape", `${variant}/rest`, corner("chip"), `${token}ChipTokens.ContainerShape`, variant],
]);
const fabSizes = [["default", "Baseline"], ["medium", "Medium"], ["large", "Large"]] as const;
const fabGeometry = fabSizes.flatMap(([size, token]): Spec[] => [
  [`container-height/${size}`, "Container height", "size", `size/${size}/rest`, height("root"), `Fab${token}Tokens.ContainerHeight`, size],
  [`container-width/${size}`, "Container width", "size", `size/${size}/rest`, width("root"), `Fab${token}Tokens.ContainerWidth`, size],
  [`icon-size/${size}`, "Icon size", "size", `size/${size}/rest`, width("icon"), `Fab${token}Tokens.IconSize`, size],
]);
const extendedGeometry = [["small", "Small"], ["medium", "Medium"], ["large", "Large"]].flatMap(([size, token]): Spec[] => [
  [`container-height/${size}`, "Container height", "size", `size/${size}/rest`, height("root"), `ExtendedFab${token}Tokens.ContainerHeight`, size],
  [`icon-size/${size}`, "Icon size", "size", `size/${size}/rest`, width("icon"), `ExtendedFab${token}Tokens.IconSize`, size],
  [`icon-label-gap/${size}`, "Icon to label space", "spacing", `size/${size}/rest`, css("root", "columnGap"), `ExtendedFab${token}Tokens.IconLabelSpace`, size],
]);

export const bindings: FixtureBinding[] = [
  fixture("badge", "Badge", [
    ["container-height/small", "Container height", "size", "small/base/light", height("badge"), "BadgeTokens.Size", "small"],
    ["container-width/small", "Container width", "size", "small/base/light", width("badge"), "BadgeTokens.Size", "small"],
    ["container-colour/small", "Container tone", "colour", "small/base/light", colour("badge"), "BadgeTokens.Color", "small"],
    ["container-height/large", "Container height", "size", "large/base/light", height("badge"), "BadgeTokens.LargeSize", "large"],
    ["container-colour/large", "Container tone", "colour", "large/base/light", colour("badge"), "BadgeTokens.LargeColor", "large"],
  ]),
  fixture("bottom-app-bar", "Bottom app bar", [
    ["container-height/end-fab/rest", "Bar height with end FAB", "size", "end/base/light", height("root"), "BottomAppBarTokens.ContainerHeight"],
    ["container-height/centred-fab/rest", "Bar height with centred FAB", "size", "center/base/light", height("root"), "BottomAppBarTokens.ContainerHeight"],
    ["end-padding/no-fab/rest", "End padding without FAB", "spacing", "plain/base/light", css("root", "paddingRight")],
    ["container-height/no-fab/rest", "Bottom app bar height without FAB", "size", "plain/base/light", height("root"), "BottomAppBarTokens.ContainerHeight"],
    ["container-colour/no-fab/rest", "Bottom app bar tone without FAB", "colour", "plain/base/light", colour("root"), "BottomAppBarTokens.ContainerColor"],
  ]),
  fixture("bottom-sheet", "Bottom sheet", [
    ["side-clearance/standard/above-640", "Side clearance at 700px", "spacing", "standard/wide-700", inset("surface", "viewport", "left")],
    ["side-clearance/modal/above-640", "Side clearance at 700px", "spacing", "modal/wide-700", inset("surface", "viewport", "left")],
    ["top-clearance/standard/expanded", "Top clearance", "spacing", "standard/full/light", inset("surface", "viewport", "top")],
    ["corner/modal-partial", "Top corner radius", "shape", "modal/partial/light", corner("surface"), undefined, "modal, partial"],
    ["container-colour/modal", "Container tone", "colour", "modal/partial/light", colour("surface"), "SheetBottomTokens.DockedContainerColor", "modal"],
    ["max-width/modal", "Maximum width", "size", "modal/full/light", width("surface"), undefined, "modal"],
    ["top-clearance/modal/expanded", "Top clearance", "spacing", "modal/full/light", inset("surface", "viewport", "top"), undefined, "modal, expanded"],
    ["focus-ring/handle/focus", "Handle focus indicator", "focus", "modal/focus", outline("handle")],
  ]),
  fixture("button", "Button", [
    ["corner/square-s/selected", "Selected square-toggle radius", "shape", "filled/s/selected (square toggle)", corner("root")],
    ...buttonHeight, ...buttonGeometry,
    ["container-colour/filled", "Container tone", "colour", "filled/m/rest", colour("root"), "FilledButtonTokens.ContainerColor", "filled"],
    ["outline-width/outlined", "Outline width", "shape", "outlined/m/rest (border)", css("root", "borderTopWidth"), "ButtonMediumTokens.OutlinedOutlineWidth", "outlined"],
    ["height/filled-s/density-minus-3", "Container height", "density", "filled/s/density -3", height("root"), undefined, "filled, size s"],
    ["focus", "Focus indicator", "focus", "filled/m/focus", outline("root"), undefined, "filled"],
    ["elevation/filled", "Container shadow", "elevation", "filled/m/rest", css("root", "boxShadow"), undefined, "filled"],
  ]),
  fixture("button-group", "Button group", [
    ["item-variant/standard/rest", "Per-item visual variant", "other", "standard/mixed-options", present("filledItem")],
    ["item-size/standard/rest", "Per-item size", "size", "standard/mixed-options", different("first", "middle", "height")],
    ["item-width/standard/rest", "Per-item width option", "size", "standard/mixed-options", present("wideItem")],
    ...groupHeights,
    ["gap/standard", "Button gap", "spacing", "standard/s/rest", css("group", "columnGap"), "ButtonGroupSmallTokens.BetweenSpace", "standard"],
    ["gap/connected", "Button gap", "spacing", "connected/round/s/rest", css("group", "columnGap"), undefined, "connected"],
  ]),
  fixture("card", "Card", [
    ["focus-elevation/filled/focus", "Keyboard focus elevation", "elevation", "filled/light/focus", elevation("card")],
    ["focus-ring/filled/focus", "Keyboard focus indicator", "focus", "filled/light/focus", outline("card")],
    ["state-layer-opacity/filled/dragged", "Dragged state layer opacity", "colour", "filled/light/dragged", opacity("layer"), "StateTokens.DraggedStateLayerOpacity"],
    ["focus-elevation/outlined/focus", "Keyboard focus elevation", "elevation", "outlined/light/focus", elevation("card")],
    ["focus-ring/outlined/focus", "Keyboard focus indicator", "focus", "outlined/light/focus", outline("card")],
    ["state-layer-opacity/outlined/dragged", "Dragged state layer opacity", "colour", "outlined/light/dragged", opacity("layer"), "StateTokens.DraggedStateLayerOpacity"],
    ["state-layer-opacity/elevated/dragged", "Dragged state layer opacity", "colour", "elevated/light/dragged", opacity("layer"), "StateTokens.DraggedStateLayerOpacity"],
    ["state-layer-opacity/elevated/hover", "Hover state layer opacity", "colour", "elevated/light/hover", opacity("layer"), "StateTokens.HoverStateLayerOpacity"],
    ...cards,
    ["focus-ring/elevated/focus", "Focus indicator", "focus", "elevated/light/focus", outline("card"), undefined, "elevated"],
  ]),
  fixture("carousel", "Carousel", [
    ["mixed-item-widths/uncontained/rest", "Mixed item widths", "size", "uncontained/mixed", different("first", "second", "width")],
    ["mixed-aspect-ratios/uncontained/rest", "Mixed item aspect ratios", "size", "uncontained/mixed", different("first", "second", "aspectRatio")],
    ["item-state/all/disabled", "Disabled item state", "other", "uncontained/disabled-item", present("disabled")],
    ["inline-padding/multi-browse/rest", "Inline start padding", "spacing", "multi-browse/base/light", inset("first", "root", "left")],
    ["item-gap/multi-browse/rest", "Inter-item gap", "spacing", "multi-browse/base/light", gap("first", "second", "right")],
    ["block-padding/uncontained/rest", "Block start padding", "spacing", "uncontained/base/light", inset("first", "root", "top")],
    ["item-gap/uncontained/rest", "Inter-item gap", "spacing", "uncontained/base/light", gap("first", "second", "right")],
    ["block-padding/hero/rest", "Block start padding", "spacing", "hero/base/light", inset("first", "root", "top")],
    ["inline-padding/hero/rest", "Inline start padding", "spacing", "hero/base/light", inset("first", "root", "left")],
    ["item-gap/hero/rest", "Inter-item gap", "spacing", "hero/base/light", gap("first", "second", "right")],
    ["small-item-width/hero/opening", "Opening small preview width", "size", "hero/base/light", width("second")],
    ["block-padding/centered-hero/rest", "Block start padding", "spacing", "hero-center/base/light", inset("first", "root", "top")],
    ["inline-padding/centered-hero/rest", "Inline start padding", "spacing", "hero-center/base/light", inset("first", "root", "left")],
    ["item-gap/centered-hero/rest", "Inter-item gap", "spacing", "hero-center/base/light", gap("first", "second", "right")],
    ["small-item-width/centered-hero/opening", "Opening small preview width", "size", "hero-center/base/light", width("second")],
    ["block-padding/multi-browse/rest", "Block start padding", "spacing", "multi-browse/base/light", inset("first", "root", "top"), undefined, "multi-browse"],
    ["inline-padding/uncontained/rest", "Inline start padding", "spacing", "uncontained/base/light", inset("first", "root", "left"), undefined, "uncontained"],
    ["corner/multi-browse", "Item corner radius", "shape", "multi-browse/base/light", corner("first"), undefined, "multi-browse"],
    ["density/multi-browse/minus-one", "Container height", "density", "multi-browse/density/-1", height("root"), undefined, "multi-browse"],
  ]),
  fixture("checkbox", "Checkbox", [
    ["box-height/default", "Box height", "size", "unselected/rest", height("icon")],
    ["box-width/default", "Box width", "size", "unselected/rest", width("icon")],
    ["checked-colour", "Selected box tone", "colour", "selected/rest", colour("icon"), "CheckboxTokens.SelectedContainerColor"],
    ["focus-ring/default/focus", "Focus indicator", "focus", "unselected/focus", outline("state layer")],
    ["density/minus-one", "Box height", "density", "unselected/rest/density -1", height("icon")],
  ]),
  fixture("chips", "Chips", [
    ...chipSizes,
    ["selected-colour/filter", "Selected container tone", "colour", "filter/selected/rest", colour("chip"), "FilterChipTokens.FlatSelectedContainerColor", "filter"],
    ["icon-size/assist", "Leading icon size", "size", "assist/icon/rest", width("leading icon"), "AssistChipTokens.IconSize", "assist"],
  ]),
  fixture("date-picker", "Date picker", [
    ["confirmation-footer/docked-day/rest", "Built-in confirmation footer", "other", "docked/single/day/light", present("confirm")],
    ["container-height/docked-day/rest", "Docked day picker height", "size", "docked/single/day/light", height("surface")],
    ["modal-width", "Modal width", "size", "modal/single/day/light", width("surface"), "DatePickerModalTokens.ContainerWidth"],
    ["modal-corner", "Modal corner radius", "shape", "modal/single/day/light", corner("surface"), "DatePickerModalTokens.ContainerShape"],
    ["modal-colour", "Modal tone", "colour", "modal/single/day/light", colour("surface"), "DatePickerModalTokens.ContainerColor"],
    ["year-width", "Selected year indicator width", "size", "modal/single/year/light", css("selectedYearInk", "width"), "DatePickerModalTokens.SelectionYearContainerWidth"],
  ], "datepicker"),
  fixture("dialog", "Dialog", [
    ["container-width/full-screen/rest", "Full-screen container width", "size", "900/fullscreen/light/rest", width("dialog")],
    ["close-icon-colour/full-screen/rest", "Full-screen close icon tone", "colour", "900/fullscreen/light/rest", css("closeIcon", "color")],
    ["corner/basic", "Container corner radius", "shape", "900/medium/light/rest", corner("dialog"), "DialogTokens.ContainerShape", "basic"],
    ["colour/basic", "Container tone", "colour", "900/medium/light/rest", colour("dialog"), "DialogTokens.ContainerColor", "basic"],
    ["body-tracking/basic", "Body letter spacing", "typography", "900/medium/light/rest", css("body", "letterSpacing"), "TypeScaleTokens.BodyMediumTracking", "basic"],
    ["close-focus/basic", "Close button focus indicator", "focus", "900/medium/light/close-focus", outline("close"), undefined, "basic"],
  ]),
  fixture("divider", "Divider", [
    ["thickness/horizontal", "Divider thickness", "size", "full-width/horizontal/ltr/light", height("divider"), "DividerTokens.Thickness", "horizontal"],
    ["thickness/vertical", "Divider thickness", "size", "full-width/vertical/ltr/light", width("divider"), "DividerTokens.Thickness", "vertical"],
    ["colour/horizontal", "Divider tone", "colour", "full-width/horizontal/ltr/light", colour("divider"), "DividerTokens.Color", "horizontal"],
  ]),
  fixture("extended-fab", "Extended FAB", [
    ...extendedGeometry,
    ["label-tracking/small", "Label letter spacing", "typography", "size/small/rest", css("text", "letterSpacing"), "TypeScaleTokens.TitleMediumTracking", "small"],
  ]),
  fixture("fab", "FAB", [
    ["focus-ring/default/focus", "Keyboard focus indicator", "focus", "primary-container/default/focus", outline("root")],
    ...fabGeometry,
  ]),
  fixture("fab-menu", "FAB menu", [
    ["button-height", "Close button height", "size", "primary/open", height("fab"), "FabMenuBaselineTokens.CloseButtonContainerHeight"],
    ["button-icon", "Close icon size", "size", "primary/open", width("close icon"), "FabMenuBaselineTokens.CloseButtonIconSize"],
    ["item-height", "Item height", "size", "primary/open", height("item 1"), "FabMenuBaselineTokens.ListItemContainerHeight"],
    ["item-icon", "Item icon size", "size", "primary/open", width("item icon"), "FabMenuBaselineTokens.ListItemIconSize"],
    ["item-tracking", "Item letter spacing", "typography", "primary/open", css("item text", "letterSpacing"), "TypeScaleTokens.TitleMediumTracking"],
  ]),
  fixture("icon-button", "Icon button", [
    ["focus-ring/standard/focus", "Keyboard focus indicator", "focus", "standard/m/focus", outline("root")],
    ...iconHeights,
    ["icon-size/size-s", "Icon size", "size", "filled/s/rest", width("icon"), "SmallIconButtonTokens.IconSize", "filled, size s"],
    ["focus-ring/filled/focus", "Focus indicator", "focus", "filled/m/focus", outline("root"), undefined, "filled"],
  ]),
  fixture("list", "List", [
    ["container-colour/segmented/rest", "Segmented row tone", "colour", "segmented/light/unselected/rest", colour("row")],
    ["between-space/segmented-one-line/rest", "Segmented item gap", "spacing", "segmented/lines-1/density-0", gap("row", "second", "bottom")],
    ["divider-trailing-space/inset/rest", "Inset divider end spacing", "spacing", "standard/lines-3/density-0", inset("divider", "content", "right")],
    ["vertical-padding/segmented-two-line/rest", "Segmented vertical padding", "spacing", "segmented/lines-2/density-0", css("row", "paddingTop")],
    ["vertical-padding/segmented-three-line/rest", "Segmented vertical padding", "spacing", "segmented/lines-3/density-0", css("row", "paddingTop")],
    ["selected-colour/standard", "Selected container tone", "colour", "standard/light/selected/rest", colour("row"), "ListTokens.ItemSelectedContainerColor", "standard"],
    ["selected-colour/segmented", "Selected container tone", "colour", "segmented/light/selected/rest", colour("row"), "ListTokens.ItemSelectedContainerColor", "segmented"],
    ["top-space/segmented-one-line/rest", "Item top padding", "spacing", "segmented/lines-1/density-0", css("row", "paddingTop"), "ListTokens.ItemTopSpace", "segmented, one line"],
    ["bottom-space/segmented-one-line/rest", "Item bottom padding", "spacing", "segmented/lines-1/density-0", css("row", "paddingBottom"), "ListTokens.ItemBottomSpace", "segmented, one line"],
    ["supporting-tracking", "Supporting text letter spacing", "typography", "standard/light/unselected/rest", css("supporting", "letterSpacing"), "TypeScaleTokens.BodyMediumTracking"],
    ["trailing-space/three-line/rest", "Trailing slot inset", "spacing", "standard/lines-3/density-0", inset("trailing", "row", "right"), "ListTokens.ItemTrailingSpace"],
    ["focus/standard", "Row focus indicator", "focus", "standard/light/unselected/focus", outline("action"), undefined, "standard"],
  ]),
  fixture("loading-indicator", "Loading indicator", [
    ["container-height", "Container height", "size", "contained/indeterminate/light", height("root"), "LoadingIndicatorTokens.ContainerHeight"],
    ["container-width", "Container width", "size", "contained/indeterminate/light", width("root"), "LoadingIndicatorTokens.ContainerWidth"],
  ]),
  fixture("menu", "Menu", [
    ["container-colour/baseline", "Container tone", "colour", "baseline/light/unselected/rest", colour("root"), "MenuTokens.ContainerColor", "baseline"],
    ["container-corner/baseline", "Container corner radius", "shape", "baseline/light/unselected/rest", corner("root"), "MenuTokens.ContainerShape", "baseline"],
    ["container-colour/standard", "Container tone", "colour", "standard/light/unselected/rest", colour("root"), "StandardMenuTokens.ContainerColor", "standard"],
    ["container-corner/segmented", "Container corner radius", "shape", "segmented/light/unselected/rest", corner("root"), "SegmentedMenuTokens.ContainerShape", "segmented"],
    ["selected-colour/baseline", "Selected item tone", "colour", "baseline/light/selected/rest", colour("item"), "MenuTokens.ListItemSelectedContainerColor", "baseline"],
  ]),
  fixture("navigation-bar", "Navigation bar", [
    ["item-width/horizontal/medium-width", "Item width in 660px and 840px bars", "size", "horizontal/light/ltr/selected/rest/0", widthPair("item", "horizontal-wide/light/ltr/selected/rest/0")],
    ["container-height/vertical", "Container height", "size", "vertical/light/ltr/selected/rest/0", height("container"), "NavigationBarTokens.TallContainerHeight", "vertical"],
    ["container-height/horizontal", "Container height", "size", "horizontal/light/ltr/selected/rest/0", height("container"), "NavigationBarTokens.ContainerHeight", "horizontal"],
    ["container-colour", "Container tone", "colour", "vertical/light/ltr/selected/rest/0", colour("container"), "NavigationBarTokens.ContainerColor"],
    ["label-colour/horizontal/selected", "Selected inline label tone", "colour", "horizontal/light/ltr/selected/rest/0", css("label", "color"), "NavigationBarTokens.ItemActiveIconColor", "horizontal"],
    ["indicator-trailing-space/horizontal/selected", "Indicator end padding", "spacing", "horizontal/light/ltr/selected/rest/0", inset("label", "indicator", "right"), "NavigationBarHorizontalItemTokens.ActiveIndicatorTrailingSpace", "horizontal"],
    ["focus-ring/horizontal/focus", "Focus indicator", "focus", "horizontal/light/ltr/selected/focus/0", outline("indicator"), undefined, "horizontal"],
  ]),
  fixture("navigation-drawer", "Navigation drawer", [
    ["divider-side-inset/standard/rest", "Divider side insets", "spacing", "standard/light/ltr/selected/rest/0", sideInsets("divider", "container")],
    ["divider-top-space/standard/rest", "Gap before divider", "spacing", "standard/light/ltr/selected/rest/0", gap("second", "divider", "bottom")],
    ["divider-side-inset/modal/rest", "Divider side insets", "spacing", "modal/light/ltr/selected/rest/0", sideInsets("divider", "container")],
    ["divider-top-space/modal/rest", "Gap before divider", "spacing", "modal/light/ltr/selected/rest/0", gap("second", "divider", "bottom")],
    ["indicator-width/standard/selected", "Standard selected pill width", "size", "standard/light/ltr/selected/rest/0", width("indicator"), "NavigationDrawerTokens.ActiveIndicatorWidth"],
    ["label-weight/standard/selected", "Selected label weight", "typography", "standard/light/ltr/selected/rest/0", css("label", "fontWeight")],
    ["container-width/modal", "Container width", "size", "modal/light/ltr/selected/rest/0", width("container"), "NavigationDrawerTokens.ContainerWidth", "modal"],
    ["indicator-height", "Indicator height", "size", "modal/light/ltr/selected/rest/0", height("indicator"), "NavigationDrawerTokens.ActiveIndicatorHeight"],
    ["indicator-width", "Indicator width", "size", "modal/light/ltr/selected/rest/0", width("indicator"), "NavigationDrawerTokens.ActiveIndicatorWidth"],
    ["indicator-colour", "Indicator tone", "colour", "modal/light/ltr/selected/rest/0", colour("indicatorFill"), "NavigationDrawerTokens.ActiveIndicatorColor"],
  ]),
  fixture("navigation-rail", "Navigation rail", [
    ["container-shape/modal-expanded/rest", "Modal rail corner radius", "shape", "modal/light/ltr/selected/rest/0", corner("container")],
    ["item-hit-width/modal-expanded/rest", "Item hit width", "size", "modal/light/ltr/selected/rest/0", width("item")],
    ["side-padding/modal-expanded/rest", "Modal rail item side padding", "spacing", "modal/light/ltr/selected/rest/0", css("container", "paddingLeft")],
    ["container-width/collapsed", "Container width", "size", "collapsed/light/ltr/selected/rest/0", width("container"), "NavigationRailCollapsedTokens.ContainerWidth", "collapsed"],
    ["item-height/expanded", "Item height", "size", "expanded/light/ltr/selected/rest/0", height("item"), "NavigationRailBaselineItemTokens.ContainerHeight", "expanded"],
    ["icon-size/expanded", "Icon size", "size", "expanded/light/ltr/selected/rest/0", width("icon"), "NavigationRailBaselineItemTokens.IconSize", "expanded"],
  ]),
  fixture("progress", "Progress", [
    ["height/linear", "Track height", "size", "linear/flat/half/light", height("canvas"), "LinearProgressIndicatorTokens.Height", "flat linear"],
    ["width/circular", "Indicator width", "size", "circular/flat/half/light", width("canvas"), "CircularProgressIndicatorTokens.Size", "flat circular"],
    ["height/circular", "Indicator height", "size", "circular/flat/half/light", height("canvas"), "CircularProgressIndicatorTokens.Size", "flat circular"],
  ]),
  fixture("radio", "Radio buttons", [
    ["icon-size", "Icon size", "size", "unselected/rest", width("circle"), "RadioButtonTokens.IconSize"],
    ["selected-colour", "Selected icon tone", "colour", "selected/rest", css("dot", "backgroundColor"), "RadioButtonTokens.SelectedIconColor"],
    ["target-size", "Hit target width", "size", "unselected/rest", width("item")],
    ["focus/unselected", "Focus indicator", "focus", "unselected/focus", outline("ripple"), undefined, "unselected"],
  ], "radios"),
  fixture("search", "Search", [
    ["bar-height/contained", "Bar height", "size", "contained/bar/light/rest", height("header"), "SearchBarTokens.ContainerHeight", "contained"],
    ["bar-colour/contained", "Bar tone", "colour", "contained/bar/light/rest", colour("header"), "SearchBarTokens.ContainerColor", "contained"],
    ["trailing-space/contained-no-actions/enabled", "End padding without actions", "spacing", "contained/bar/light/no-actions", inset("inputWrap", "header", "right"), undefined, "contained"],
    ["trailing-space/divided-no-actions/enabled", "End padding without actions", "spacing", "divided/bar/light/no-actions", inset("inputWrap", "header", "right"), undefined, "divided"],
    ["trailing-icon/contained", "Trailing icon size", "size", "contained/bar/light/rest", width("trailingGlyph"), undefined, "contained"],
    ["focus/contained", "Bar focus indicator", "focus", "contained/bar/light/focus", outline("header"), undefined, "contained"],
  ]),
  fixture("select", "Select", [
    ["option-height/filled/popup-top-layer", "Top-layer popup option height", "size", "filled/popup-top", height("option")],
    ["menu-container-shape/filled/popup", "Popup corner radius", "shape", "filled/light/popup", corner("popup")],
    ["trailing-icon-colour/filled/focus", "Focused trailing icon tone", "colour", "filled/light/focus", css("indicatorIcon", "color"), "FilledAutocompleteTokens.TextFieldFocusTrailingIconColor"],
    ["trailing-icon-colour/filled/error-focus", "Error focus trailing icon tone", "colour", "filled/light/error-focus", css("indicatorIcon", "color"), "FilledAutocompleteTokens.TextFieldErrorFocusTrailingIconColor"],
    ["option-height/outlined/popup-top-layer", "Top-layer popup option height", "size", "outlined/popup-top", height("option")],
    ["menu-container-shape/outlined/popup", "Popup corner radius", "shape", "outlined/light/popup", corner("popup")],
    ["trailing-icon-colour/outlined/focus", "Focused trailing icon tone", "colour", "outlined/light/focus", css("indicatorIcon", "color"), "OutlinedAutocompleteTokens.TextFieldFocusTrailingIconColor"],
    ["trailing-icon-colour/outlined/error-focus", "Error focus trailing icon tone", "colour", "outlined/light/error-focus", css("indicatorIcon", "color"), "OutlinedAutocompleteTokens.TextFieldErrorFocusTrailingIconColor"],
    ["menu-container-colour/filled/popup", "Popup tone", "colour", "filled/light/popup", colour("popup"), "FilledAutocompleteTokens.MenuContainerColor"],
    ["label-colour/outlined/hover", "Hovered outlined label tone", "colour", "outlined/light/hover", css("label", "color"), "OutlinedAutocompleteTokens.FieldHoverLabelTextColor"],
    ["field-height/outlined", "Field height", "size", "outlined/light/rest", height("field"), "OutlinedTextFieldTokens.ContainerHeight", "outlined"],
    ["field-colour/outlined", "Field tone", "colour", "outlined/light/rest", colour("field"), undefined, "outlined"],
    ["trailing-icon/outlined", "Trailing icon size", "size", "outlined/light/rest", width("indicatorIcon"), "OutlinedAutocompleteTokens.TextFieldTrailingIconSize", "outlined"],
    ["menu-container-colour/outlined/popup", "Popup tone", "colour", "outlined/light/popup", colour("popup"), "OutlinedAutocompleteTokens.MenuContainerColor", "outlined"],
  ]),
  fixture("side-sheet", "Side sheet", [
    ["headline-colour/standard/rest", "Headline tone", "colour", "standard/ltr/start/light", css("title", "color")],
    ["action-row/standard/rest", "Built-in action row", "other", "standard/ltr/start/light", present("actionRow")],
    ["headline-colour/modal/rest", "Headline tone", "colour", "modal/ltr/start/light", css("title", "color")],
    ["action-row/modal/rest", "Built-in action row", "other", "modal/ltr/start/light", present("actionRow")],
    ["back-button/modal/rest", "Built-in back button", "other", "modal/ltr/start/light", present("back")],
    ["detached-spacing/detached/rest", "Detached sheet spacing option", "other", "modal/detached", present("detached")],
    ["max-width/standard", "Maximum width", "size", "standard/ltr/start/light", css("surface", "maxWidth"), undefined, "standard"],
    ["header-padding/standard", "Header start padding", "spacing", "standard/ltr/start/light", css("header", "paddingLeft"), undefined, "standard"],
    ["content-padding/modal", "Content start padding", "spacing", "modal/ltr/start/light", css("content", "paddingLeft"), undefined, "modal"],
    ["close-target/standard", "Close hit target width", "size", "standard/ltr/start/light", css("target", "width"), undefined, "standard"],
  ]),
  fixture("slider", "Slider", [
    ["handle-width/xs", "Handle width", "size", "xs/discrete/light", css("handleInk", "width"), "SliderTokens.HandleWidth", "size xs"],
    ["handle-height/xs", "Handle height", "size", "xs/discrete/light", css("handleInk", "height"), "SliderTokens.HandleHeight", "size xs"],
    ["active-colour/xs", "Active track tone", "colour", "xs/discrete/light", colour("active"), "SliderTokens.ActiveTrackColor", "size xs"],
    ["focus/xs", "Handle focus indicator", "focus", "xs/focus/light", outline("handleInk"), undefined, "size xs"],
  ]),
  fixture("snackbar", "Snackbar", [
    ["close-icon-inset-start/one-line-action-close/rest", "Close glyph start inset", "spacing", "light/single/action-close", inset("icon", "close", "left")],
    ["close-icon-inset-end/one-line-action-close/rest", "Close glyph end inset", "spacing", "light/single/action-close", inset("icon", "close", "right")],
    ["height/single-line", "Container height", "size", "light/message", height("container"), "SnackbarTokens.SingleLineContainerHeight", "single line"],
    ["height/two-lines", "Container height", "size", "light/wrapped", height("container"), "SnackbarTokens.TwoLinesContainerHeight", "two lines"],
    ["container-colour", "Container tone", "colour", "light/message", colour("container"), "SnackbarTokens.ContainerColor"],
    ["label-tracking", "Message letter spacing", "typography", "light/message", css("message", "letterSpacing"), "TypeScaleTokens.BodyMediumTracking"],
    ["corner", "Container corner radius", "shape", "light/message", corner("container"), "SnackbarTokens.ContainerShape"],
  ]),
  fixture("split-button", "Split button", [
    ["menu-icon-offset/filled-xs/rest", "Chevron horizontal translation", "spacing", "chevron offset/xs", translateX("chevron")],
    ["menu-icon-offset/filled-s/rest", "Chevron horizontal translation", "spacing", "chevron offset/s", translateX("chevron")],
    ["menu-icon-offset/filled-m/rest", "Chevron horizontal translation", "spacing", "chevron offset/m", translateX("chevron")],
    ["menu-icon-offset/filled-l/rest", "Chevron horizontal translation", "spacing", "chevron offset/l", translateX("chevron")],
    ["menu-icon-offset/filled-xl/rest", "Chevron horizontal translation", "spacing", "chevron offset/xl", translateX("chevron")],
    ["inner-corner/filled-m/rest", "Inner corner radius", "shape", "filled/m/rest", css("leading", "borderTopRightRadius"), "SplitButtonMediumTokens.InnerCornerCornerSize"],
    ["inner-corner/filled-l/rest", "Inner corner radius", "shape", "filled/l/rest", css("leading", "borderTopRightRadius"), "SplitButtonLargeTokens.InnerCornerCornerSize"],
    ["inner-corner/filled-xl/rest", "Inner corner radius", "shape", "filled/xl/rest", css("leading", "borderTopRightRadius"), "SplitButtonXLargeTokens.InnerCornerCornerSize"],
    ["height/filled-m/density-minus-1", "Button height at negative density", "density", "filled/m/density -1", height("root")],
    ["height/filled-m/density-minus-2", "Button height at negative density", "density", "filled/m/density -2", height("root")],
    ["height/filled-m/density-minus-3", "Button height at negative density", "density", "filled/m/density -3", height("root")],
    ["state-layer/filled-trailing/selected", "Selected trailing state layer opacity", "colour", "selected layer/m", opacity("trailing layer")],
    ...splitHeights,
    ["gap/size-m", "Button gap", "spacing", "filled/m/rest", css("root", "columnGap"), "SplitButtonMediumTokens.BetweenSpace", "filled, size m"],
    ["trailing-icon/size-m", "Trailing icon size", "size", "filled/m/rest", width("chevron"), "SplitButtonMediumTokens.TrailingIconSize", "filled, size m"],
    ["pressed-opacity/size-m", "Press ripple opacity", "colour", "filled/m/pressed (ripple wave)", css("ripple wave", "opacity"), "StateTokens.PressedStateLayerOpacity", "filled, size m"],
  ]),
  fixture("switch", "Switch", [
    ["track-colour/unselected/disabled", "Disabled unselected track tone", "colour", "unselected/disabled", colour("track"), "SwitchTokens.DisabledUnselectedTrackColor"],
    ["track-opacity/unselected/disabled", "Disabled unselected track opacity", "colour", "unselected/disabled", opacity("track"), "SwitchTokens.DisabledTrackOpacity"],
    ["track-width", "Track width", "size", "unselected/rest", width("track"), "SwitchTokens.TrackWidth"],
    ["track-height", "Track height", "size", "unselected/rest", height("track"), "SwitchTokens.TrackHeight"],
    ["selected-handle-width", "Selected handle width", "size", "selected/rest", width("thumb"), "SwitchTokens.SelectedHandleWidth"],
    ["selected-track-colour", "Selected track tone", "colour", "selected/rest", colour("track"), "SwitchTokens.SelectedTrackColor"],
    ["selected-disabled-handle-colour", "Disabled selected handle tone", "colour", "selected/disabled", colour("thumb"), "SwitchTokens.DisabledSelectedHandleColor"],
  ]),
  fixture("tabs", "Tabs", [
    ["container-colour/primary/selected", "Container tone", "colour", "primary-text/light/ltr/selected/rest/0", colour("container"), "PrimaryNavigationTabTokens.ContainerColor"],
    ["label-line-height/primary/rest", "Label line-height", "typography", "primary-text/light/ltr/selected/rest/0", css("label", "lineHeight"), "TypeScaleTokens.TitleSmallLineHeight"],
    ["container-colour/secondary/selected", "Container tone", "colour", "secondary-text/light/ltr/selected/rest/0", colour("container"), "SecondaryNavigationTabTokens.ContainerColor"],
    ["label-line-height/secondary/rest", "Label line-height", "typography", "secondary-text/light/ltr/selected/rest/0", css("label", "lineHeight"), "TypeScaleTokens.TitleSmallLineHeight"],
    ["container-height/primary-stacked", "Tab height", "size", "primary-stacked/light/ltr/selected/rest/0", height("item"), "PrimaryNavigationTabTokens.IconAndLabelTextContainerHeight", "primary, icon and label"],
    ["container-height/primary-text", "Tab height", "size", "primary-text/light/ltr/selected/rest/0", height("item"), "PrimaryNavigationTabTokens.ContainerHeight", "primary, text"],
    ["container-height/secondary-text", "Tab height", "size", "secondary-text/light/ltr/selected/rest/0", height("item"), "SecondaryNavigationTabTokens.ContainerHeight", "secondary, text"],
    ["indicator-height/primary", "Indicator height", "size", "primary-stacked/light/ltr/selected/rest/0", height("indicator"), "PrimaryNavigationTabTokens.ActiveIndicatorHeight", "primary"],
    ["indicator-colour/primary", "Indicator tone", "colour", "primary-stacked/light/ltr/selected/rest/0", colour("indicator"), "PrimaryNavigationTabTokens.ActiveIndicatorColor", "primary"],
  ]),
  fixture("text-field", "Text field", [
    ["trailing-action-focus-ring/filled/focus", "Trailing action focus ring", "focus", "filled/trailing-focus", outline("trailing")],
    ["trailing-action-focus-ring/outlined/focus", "Trailing action focus ring", "focus", "outlined/trailing-focus", outline("trailing")],
    ["height/filled", "Container height", "size", "filled/light/rest", height("field"), "OutlinedTextFieldTokens.ContainerHeight", "filled"],
    ["height/outlined", "Container height", "size", "outlined/light/rest", height("field"), "OutlinedTextFieldTokens.ContainerHeight", "outlined"],
    ["corner/outlined", "Container corner radius", "shape", "outlined/light/rest", corner("outline"), "OutlinedTextFieldTokens.ContainerShape", "outlined"],
    ["outline-width/outlined-focus", "Focus outline width", "focus", "outlined/light/focus", css("outline", "borderTopWidth"), undefined, "outlined"],
    ["leading-icon/filled", "Leading icon size", "size", "filled/light/rest", width("leadingIcon"), "FilledTextFieldTokens.LeadingIconSize", "filled"],
  ]),
  fixture("time-picker", "Time picker", [
    ["scroll-variant/scroll/rest", "Scroll variant", "other", "input/scroll", present("scroll")],
    ["inline-embedding/input/rest", "Inline input embedding", "other", "input/inline", present("inline")],
    ["focus-indicator/input/period-focus", "Period button focus indicator", "focus", "input/period-selected/focus/light", outline("selectedPeriod")],
    ["dialog-corner/dial", "Dialog corner radius", "shape", "dial/base/light", corner("surface"), "TimePickerTokens.ContainerShape", "dial"],
    ["dialog-colour/dial", "Dialog tone", "colour", "dial/base/light", colour("surface"), "TimePickerTokens.ContainerColor", "dial"],
    ["dial-diameter", "Dial diameter", "size", "dial/base/light", width("dial"), "TimePickerTokens.ClockDialContainerSize"],
    ["period-tracking/dial", "Period label letter spacing", "typography", "dial/base/light", css("selectedPeriod", "letterSpacing"), "TypeScaleTokens.TitleMediumTracking", "dial"],
    ["dialog-corner/input", "Dialog corner radius", "shape", "input/base/light", corner("surface"), "TimeInputTokens.ContainerShape", "input"],
  ], "timepicker"),
  fixture("toolbar", "Toolbar", [
    ["container-elevation/floating-horizontal-no-fab/rest", "Floating toolbar default elevation without FAB", "elevation", "floating/standard/base/light", elevation("bar")],
    ["collapse-into-fab/floating-with-fab/scroll", "Collapse into FAB when scrolling", "other", "floating/standard/collapsed-with-fab", present("collapsed")],
    ["floating/height", "Floating container height", "size", "floating/standard/base/light", height("bar"), "FloatingToolbarTokens.ContainerHeight"],
    ["floating/standard-colour", "Floating standard tone", "colour", "floating/standard/base/light", colour("bar"), "FloatingToolbarTokens.StandardContainerColor"],
    ["floating/vibrant-colour", "Floating vibrant tone", "colour", "floating/vibrant/base/light", colour("bar"), "FloatingToolbarTokens.VibrantContainerColor"],
    ["floating/start-padding", "Floating start padding", "spacing", "floating/standard/base/light", css("bar", "paddingLeft"), "FloatingToolbarTokens.ContainerLeadingSpace"],
    ["docked/height", "Docked container height", "size", "docked/standard/base/light", height("bar"), "DockedToolbarTokens.ContainerHeight"],
  ]),
  fixture("tooltip", "Tooltip", [
    ["persistent/rich/click-triggered", "Persistent click-triggered tooltip", "other", "rich/persistent", present("surface")],
    ["caret-shape/rich/custom", "Custom caret shape", "shape", "rich/custom-caret", present("customCaret")],
    ["gap-trigger/plain/above", "Trigger gap above anchor", "spacing", "plain/top-layer/light", gap("surface", "target", "bottom")],
    ["caret/plain/rest", "Default caret", "other", "plain/short/light", present("arrow")],
    ["caret/rich/rest", "Default caret", "other", "rich/short/light", present("arrow")],
    ["subhead/rich/rest", "Structured rich subhead", "other", "rich/html-looking-text", present("subhead")],
    ["actions/rich/rest", "Structured rich actions", "other", "rich/html-looking-text", present("action")],
    ["hide-delay/plain/after-pointer-exit", "Pointer exit hide delay", "motion", "behavior", css("behavior", "hideDelay")],
    ["simultaneous-visible/plain/focus-and-hover", "Tooltip count during focus and hover", "other", "behavior", css("behavior", "visibleAfterOtherHover")],
    ["colour/plain", "Surface tone", "colour", "plain/short/light", colour("surface"), "PlainTooltipTokens.ContainerColor", "plain"],
    ["corner/plain", "Corner radius", "shape", "plain/short/light", corner("surface"), "PlainTooltipTokens.ContainerShape", "plain"],
    ["transition-duration/plain", "Transition duration", "motion", "plain/short/light", css("surface", "transitionDuration"), undefined, "plain"],
    ["max-width/plain", "Maximum width", "size", "plain/long", css("surface", "maxWidth"), undefined, "plain"],
    ["colour/rich", "Surface tone", "colour", "rich/short/light", colour("surface"), "RichTooltipTokens.ContainerColor", "rich"],
    ["corner/rich", "Corner radius", "shape", "rich/short/light", corner("surface"), "RichTooltipTokens.ContainerShape", "rich"],
    ["body-tracking/rich", "Body letter spacing", "typography", "rich/short/light", css("surface", "letterSpacing"), "TypeScaleTokens.BodyMediumTracking", "rich"],
  ]),
  fixture("top-app-bar", "App bar", [
    ["top-app-bar/medium-flexible/expressive/rest", "Medium flexible variant", "other", "small/medium-flexible", present("mediumFlexible")],
    ["top-app-bar/large-flexible/expressive/rest", "Large flexible variant", "other", "small/large-flexible", present("largeFlexible")],
    ["top-app-bar/subtitle/expressive/rest", "Subtitle", "other", "small/subtitle", present("subtitle")],
    ["top-app-bar/search-variant/expressive/rest", "Search variant", "other", "small/search", present("search")],
    ["top-app-bar/leading-space/small/rest", "Small bar leading button inset", "spacing", "small/rest/light", inset("leading", "root", "left")],
    ["top-app-bar/trailing-space/small/rest", "Small bar trailing button inset", "spacing", "small/rest/light", inset("lastTrailing", "root", "right")],
    ["top-app-bar/title-inset/medium-no-leading/rest", "Title inset without leading button", "spacing", "medium/no-leading", inset("title", "root", "left")],
    ["top-app-bar/title-inset/large-no-leading/rest", "Title inset without leading button", "spacing", "large/no-leading", inset("title", "root", "left")],
    ["container-height/small", "Bar height", "size", "small/rest/light", height("root"), "AppBarSmallTokens.ContainerHeight", "small"],
    ["container-height/centre", "Bar height", "size", "center/rest/light", height("root"), "AppBarSmallTokens.ContainerHeight", "centre-aligned"],
    ["leading-icon-size/small", "Leading icon size", "size", "small/rest/light", width("leadingIcon"), undefined, "small"],
    ["leading-inset/small", "Leading target inset", "spacing", "small/rest/light", inset("leading", "root", "left"), undefined, "small"],
  ], "app-bar"),
];
