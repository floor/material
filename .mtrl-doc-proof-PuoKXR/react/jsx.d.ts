/** Types the bare `m-*` tags in React's JSX, for the elements used directly rather than through the components. */
import type * as React from "react";
import type { ElementEvents, ElementMarkup } from "../elements/index.js";
import type { ReactHostAttributes } from "./create.js";
/** The element's events as React 19 listens to them on a custom element: an `on<event>` prop in lower case gets the element's own event (`onchange={(e) => e.detail.value}`). */
type Events<S> = {
    [K in keyof ElementEvents<S> & string as `on${Lowercase<K>}`]?: (event: ElementEvents<S>[K]) => void;
};
/** A tag's props: its attributes as markup writes them, its events, and any HTML attribute. */
type Tag<S, E extends HTMLElement> = Omit<React.DetailedHTMLProps<ReactHostAttributes<E>, E>, keyof ElementMarkup<S> | keyof Events<S>> & ElementMarkup<S> & Events<S>;
declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "m-button": Tag<import("../elements/button.js").ButtonSpec, import("../elements/button.js").ButtonElement>;
            "m-switch": Tag<import("../elements/switch.js").SwitchSpec, import("../elements/switch.js").SwitchElement>;
            "m-tabs": Tag<import("../elements/tabs.js").TabsSpec, import("../elements/tabs.js").TabsElement>;
            "m-progress": Tag<import("../elements/progress.js").ProgressSpec, import("../elements/progress.js").ProgressElement>;
            "m-loading-indicator": Tag<import("../elements/loading-indicator.js").LoadingIndicatorSpec, import("../elements/loading-indicator.js").LoadingIndicatorElement>;
            "m-badge": Tag<import("../elements/badge.js").BadgeSpec, import("../elements/badge.js").BadgeElement>;
            "m-divider": Tag<import("../elements/divider.js").DividerSpec, import("../elements/divider.js").DividerElement>;
            "m-icon-button": Tag<import("../elements/icon-button.js").IconButtonSpec, import("../elements/icon-button.js").IconButtonElement>;
            "m-fab": Tag<import("../elements/fab.js").FabSpec, import("../elements/fab.js").FabElement>;
            "m-extended-fab": Tag<import("../elements/extended-fab.js").ExtendedFabSpec, import("../elements/extended-fab.js").ExtendedFabElement>;
            "m-checkbox": Tag<import("../elements/checkbox.js").CheckboxSpec, import("../elements/checkbox.js").CheckboxElement>;
            "m-slider": Tag<import("../elements/slider.js").SliderSpec, import("../elements/slider.js").SliderElement>;
            "m-text-field": Tag<import("../elements/text-field.js").TextFieldSpec, import("../elements/text-field.js").TextFieldElement>;
            "m-radios": Tag<import("../elements/radios.js").RadiosSpec, import("../elements/radios.js").RadiosElement>;
            "m-navigation-bar": Tag<import("../elements/navigation-bar.js").NavigationBarSpec, import("../elements/navigation-bar.js").NavigationBarElement>;
            "m-navigation-rail": Tag<import("../elements/navigation-rail.js").NavigationRailSpec, import("../elements/navigation-rail.js").NavigationRailElement>;
            "m-navigation-drawer": Tag<import("../elements/navigation-drawer.js").NavigationDrawerSpec, import("../elements/navigation-drawer.js").NavigationDrawerElement>;
            /** @deprecated Material Design 3 names this the navigation drawer. Use NavigationDrawer instead. */
            "m-drawer": Tag<import("../elements/drawer.js").DrawerSpec, import("../elements/drawer.js").DrawerElement>;
            "m-app-bar": Tag<import("../elements/app-bar.js").AppBarSpec, import("../elements/app-bar.js").AppBarElement>;
            /** @deprecated Material Design 3 names this the app bar. Use AppBar instead. */
            "m-top-app-bar": Tag<import("../elements/top-app-bar.js").TopAppBarSpec, import("../elements/top-app-bar.js").TopAppBarElement>;
            /** @deprecated Material Design 3 Expressive replaces the bottom app bar with the docked toolbar. Use Toolbar with variant="docked" placement="bottom" instead. A centred FAB, adding a FAB after creation, a custom transition duration and a custom tag are not yet available on the docked toolbar. */
            "m-bottom-app-bar": Tag<import("../elements/bottom-app-bar.js").BottomAppBarSpec, import("../elements/bottom-app-bar.js").BottomAppBarElement>;
            "m-button-group": Tag<import("../elements/button-group.js").ButtonGroupSpec, import("../elements/button-group.js").ButtonGroupElement>;
            "m-chips": Tag<import("../elements/chips.js").ChipsSpec, import("../elements/chips.js").ChipsElement>;
            "m-list": Tag<import("../elements/list.js").ListSpec, import("../elements/list.js").ListElement>;
            "m-card": Tag<import("../elements/card.js").CardSpec, import("../elements/card.js").CardElement>;
            "m-carousel": Tag<import("../elements/carousel.js").CarouselSpec, import("../elements/carousel.js").CarouselElement>;
            "m-menu": Tag<import("../elements/menu.js").MenuSpec, import("../elements/menu.js").MenuElement>;
            "m-fab-menu": Tag<import("../elements/fab-menu.js").FabMenuSpec, import("../elements/fab-menu.js").FabMenuElement>;
            "m-select": Tag<import("../elements/select.js").SelectSpec, import("../elements/select.js").SelectElement>;
            "m-split-button": Tag<import("../elements/split-button.js").SplitButtonSpec, import("../elements/split-button.js").SplitButtonElement>;
            "m-tooltip": Tag<import("../elements/tooltip.js").TooltipSpec, import("../elements/tooltip.js").TooltipElement>;
            "m-toolbar": Tag<import("../elements/toolbar.js").ToolbarSpec, import("../elements/toolbar.js").ToolbarElement>;
            "m-snackbar": Tag<import("../elements/snackbar.js").SnackbarSpec, import("../elements/snackbar.js").SnackbarElement>;
            "m-dialog": Tag<import("../elements/dialog.js").DialogSpec, import("../elements/dialog.js").DialogElement>;
            "m-bottom-sheet": Tag<import("../elements/bottom-sheet.js").BottomSheetSpec, import("../elements/bottom-sheet.js").BottomSheetElement>;
            "m-side-sheet": Tag<import("../elements/side-sheet.js").SideSheetSpec, import("../elements/side-sheet.js").SideSheetElement>;
            "m-datepicker": Tag<import("../elements/datepicker.js").DatepickerSpec, import("../elements/datepicker.js").DatepickerElement>;
            "m-timepicker": Tag<import("../elements/timepicker.js").TimepickerSpec, import("../elements/timepicker.js").TimepickerElement>;
            "m-search": Tag<import("../elements/search.js").SearchSpec, import("../elements/search.js").SearchElement>;
            "m-tab": Tag<typeof import("../elements/tabs.js").tabDeclaration, HTMLElement>;
            "m-radio": Tag<typeof import("../elements/radios.js").radioDeclaration, HTMLElement>;
            "m-navigation-bar-item": Tag<typeof import("../elements/navigation-bar.js").navigationBarItemDeclaration, HTMLElement>;
            "m-navigation-rail-item": Tag<typeof import("../elements/navigation-rail.js").navigationRailItemDeclaration, HTMLElement>;
            "m-navigation-drawer-item": Tag<typeof import("../elements/navigation-drawer.js").navigationDrawerItemDeclaration, HTMLElement>;
            /** @deprecated Material Design 3 names this the navigation drawer. Use NavigationDrawerItem instead. */
            "m-drawer-item": Tag<typeof import("../elements/drawer.js").drawerItemDeclaration, HTMLElement>;
            "m-button-group-item": Tag<typeof import("../elements/button-group.js").buttonGroupItemDeclaration, HTMLElement>;
            "m-chip": Tag<typeof import("../elements/chips.js").chipDeclaration, HTMLElement>;
            "m-list-item": Tag<typeof import("../elements/list.js").listItemDeclaration, HTMLElement>;
            "m-carousel-item": Tag<typeof import("../elements/carousel.js").carouselItemDeclaration, HTMLElement>;
            "m-menu-item": Tag<typeof import("../elements/menu.js").menuItemDeclaration, HTMLElement>;
            "m-fab-menu-item": Tag<typeof import("../elements/fab-menu.js").fabMenuItemDeclaration, HTMLElement>;
            "m-select-option": Tag<typeof import("../elements/select.js").selectOptionDeclaration, HTMLElement>;
            "m-search-suggestion": Tag<typeof import("../elements/search.js").searchSuggestionDeclaration, HTMLElement>;
        }
    }
}
export {};
