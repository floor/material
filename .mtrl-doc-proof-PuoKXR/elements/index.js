import { buttonElement, defineButton } from "./button.js";
import { switchElement, defineSwitch } from "./switch.js";
import { tabsElement, tabDeclaration, defineTabs } from "./tabs.js";
import { progressElement, defineProgress } from "./progress.js";
import { loadingIndicatorElement, defineLoadingIndicator } from "./loading-indicator.js";
import { badgeElement, defineBadge } from "./badge.js";
import { dividerElement, defineDivider } from "./divider.js";
import { iconButtonElement, defineIconButton } from "./icon-button.js";
import { fabElement, defineFab } from "./fab.js";
import { extendedFabElement, defineExtendedFab } from "./extended-fab.js";
import { checkboxElement, defineCheckbox } from "./checkbox.js";
import { sliderElement, defineSlider } from "./slider.js";
import { textFieldElement, defineTextField } from "./text-field.js";
import { radiosElement, radioDeclaration, defineRadios } from "./radios.js";
import { navigationBarElement, navigationBarItemDeclaration, defineNavigationBar } from "./navigation-bar.js";
import { navigationRailElement, navigationRailItemDeclaration, defineNavigationRail } from "./navigation-rail.js";
import { navigationDrawerElement, navigationDrawerItemDeclaration, defineNavigationDrawer } from "./navigation-drawer.js";
import { drawerElement, drawerItemDeclaration, defineDrawer } from "./drawer.js";
import { appBarElement, defineAppBar } from "./app-bar.js";
import { topAppBarElement, defineTopAppBar } from "./top-app-bar.js";
import { bottomAppBarElement, defineBottomAppBar } from "./bottom-app-bar.js";
import { buttonGroupElement, buttonGroupItemDeclaration, defineButtonGroup } from "./button-group.js";
import { chipsElement, chipDeclaration, defineChips } from "./chips.js";
import { listElement, listItemDeclaration, defineList } from "./list.js";
import { cardElement, defineCard } from "./card.js";
import { carouselElement, carouselItemDeclaration, defineCarousel } from "./carousel.js";
import { menuElement, menuItemDeclaration, defineMenu } from "./menu.js";
import { fabMenuElement, fabMenuItemDeclaration, defineFabMenu } from "./fab-menu.js";
import { selectElement, selectOptionDeclaration, defineSelect } from "./select.js";
import { splitButtonElement, defineSplitButton } from "./split-button.js";
import { tooltipElement, defineTooltip } from "./tooltip.js";
import { toolbarElement, defineToolbar } from "./toolbar.js";
import { snackbarElement, defineSnackbar } from "./snackbar.js";
import { dialogElement, defineDialog } from "./dialog.js";
import { bottomSheetElement, defineBottomSheet } from "./bottom-sheet.js";
import { sideSheetElement, defineSideSheet } from "./side-sheet.js";
import { datepickerElement, defineDatepicker } from "./datepicker.js";
import { timepickerElement, defineTimepicker } from "./timepicker.js";
import { searchElement, searchSuggestionDeclaration, defineSearch } from "./search.js";
export { defineElement, DEFAULT_PREFIX, SHADOW_BASE_STYLES } from "./define.js";
export { registerStyles, hasStyles } from "./styles.js";
export { describe, describeDeclaration, camel, pascal, toAttribute, getPrefix, configure, isBrowser, } from "./adapter.js";
export { buttonElement, defineButton } from "./button.js";
export { switchElement, defineSwitch } from "./switch.js";
export { tabsElement, tabDeclaration, defineTabs } from "./tabs.js";
export { progressElement, defineProgress } from "./progress.js";
export { loadingIndicatorElement, defineLoadingIndicator } from "./loading-indicator.js";
export { badgeElement, defineBadge } from "./badge.js";
export { dividerElement, defineDivider } from "./divider.js";
export { iconButtonElement, defineIconButton } from "./icon-button.js";
export { fabElement, defineFab } from "./fab.js";
export { extendedFabElement, defineExtendedFab } from "./extended-fab.js";
export { checkboxElement, defineCheckbox } from "./checkbox.js";
export { sliderElement, defineSlider } from "./slider.js";
export { textFieldElement, defineTextField } from "./text-field.js";
export { radiosElement, radioDeclaration, defineRadios } from "./radios.js";
export { navigationBarElement, navigationBarItemDeclaration, defineNavigationBar } from "./navigation-bar.js";
export { navigationRailElement, navigationRailItemDeclaration, defineNavigationRail } from "./navigation-rail.js";
export { navigationDrawerElement, navigationDrawerItemDeclaration, defineNavigationDrawer } from "./navigation-drawer.js";
export { drawerElement, drawerItemDeclaration, defineDrawer } from "./drawer.js";
export { appBarElement, defineAppBar } from "./app-bar.js";
export { topAppBarElement, defineTopAppBar, } from "./top-app-bar.js";
export { bottomAppBarElement, defineBottomAppBar } from "./bottom-app-bar.js";
export { buttonGroupElement, buttonGroupItemDeclaration, defineButtonGroup } from "./button-group.js";
export { chipsElement, chipDeclaration, defineChips } from "./chips.js";
export { listElement, listItemDeclaration, defineList } from "./list.js";
export { cardElement, defineCard } from "./card.js";
export { carouselElement, carouselItemDeclaration, defineCarousel } from "./carousel.js";
export { menuElement, menuItemDeclaration, defineMenu } from "./menu.js";
export { fabMenuElement, fabMenuItemDeclaration, defineFabMenu } from "./fab-menu.js";
export { selectElement, selectOptionDeclaration, defineSelect } from "./select.js";
export { splitButtonElement, defineSplitButton } from "./split-button.js";
export { tooltipElement, defineTooltip } from "./tooltip.js";
export { toolbarElement, defineToolbar } from "./toolbar.js";
export { snackbarElement, defineSnackbar } from "./snackbar.js";
export { dialogElement, defineDialog } from "./dialog.js";
export { bottomSheetElement, defineBottomSheet } from "./bottom-sheet.js";
export { sideSheetElement, defineSideSheet } from "./side-sheet.js";
export { datepickerElement, defineDatepicker } from "./datepicker.js";
export { timepickerElement, defineTimepicker } from "./timepicker.js";
export { searchElement, searchSuggestionDeclaration, defineSearch } from "./search.js";
export const elements = {
    button: buttonElement,
    switch: switchElement,
    tabs: tabsElement,
    progress: progressElement,
    loadingIndicator: loadingIndicatorElement,
    badge: badgeElement,
    divider: dividerElement,
    iconButton: iconButtonElement,
    fab: fabElement,
    extendedFab: extendedFabElement,
    checkbox: checkboxElement,
    slider: sliderElement,
    textField: textFieldElement,
    radios: radiosElement,
    navigationBar: navigationBarElement,
    navigationRail: navigationRailElement,
    navigationDrawer: navigationDrawerElement,
    drawer: drawerElement,
    appBar: appBarElement,
    topAppBar: topAppBarElement,
    bottomAppBar: bottomAppBarElement,
    buttonGroup: buttonGroupElement,
    chips: chipsElement,
    list: listElement,
    card: cardElement,
    carousel: carouselElement,
    menu: menuElement,
    fabMenu: fabMenuElement,
    select: selectElement,
    splitButton: splitButtonElement,
    tooltip: tooltipElement,
    toolbar: toolbarElement,
    snackbar: snackbarElement,
    dialog: dialogElement,
    bottomSheet: bottomSheetElement,
    sideSheet: sideSheetElement,
    datepicker: datepickerElement,
    timepicker: timepickerElement,
    search: searchElement,
};
export const declarations = {
    tab: tabDeclaration,
    radio: radioDeclaration,
    navigationBarItem: navigationBarItemDeclaration,
    navigationRailItem: navigationRailItemDeclaration,
    navigationDrawerItem: navigationDrawerItemDeclaration,
    drawerItem: drawerItemDeclaration,
    buttonGroupItem: buttonGroupItemDeclaration,
    chip: chipDeclaration,
    listItem: listItemDeclaration,
    carouselItem: carouselItemDeclaration,
    menuItem: menuItemDeclaration,
    fabMenuItem: fabMenuItemDeclaration,
    selectOption: selectOptionDeclaration,
    searchSuggestion: searchSuggestionDeclaration,
};
export const defineAll = (options) => {
    defineButton(options);
    defineSwitch(options);
    defineTabs(options);
    defineProgress(options);
    defineLoadingIndicator(options);
    defineBadge(options);
    defineDivider(options);
    defineIconButton(options);
    defineFab(options);
    defineExtendedFab(options);
    defineCheckbox(options);
    defineSlider(options);
    defineTextField(options);
    defineRadios(options);
    defineNavigationBar(options);
    defineNavigationRail(options);
    defineNavigationDrawer(options);
    defineDrawer(options);
    defineAppBar(options);
    defineTopAppBar(options);
    defineBottomAppBar(options);
    defineButtonGroup(options);
    defineChips(options);
    defineList(options);
    defineCard(options);
    defineCarousel(options);
    defineMenu(options);
    defineFabMenu(options);
    defineSelect(options);
    defineSplitButton(options);
    defineTooltip(options);
    defineToolbar(options);
    defineSnackbar(options);
    defineDialog(options);
    defineBottomSheet(options);
    defineSideSheet(options);
    defineDatepicker(options);
    defineTimepicker(options);
    defineSearch(options);
};
