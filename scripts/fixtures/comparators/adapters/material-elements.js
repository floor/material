import 'material/styles/base-elements';
import 'material/elements/css/button';
import { defineButton } from 'material/elements';
import { attach, element, finish, icon } from '../shared.js';
export async function mount(scenario) {
  document.body.innerHTML = '<main></main>'; defineButton();
  const c = { button: attach('button', element('<m-button variant="filled" size="s">Save</m-button>')) };
  if (__COMPARATOR_APP__) {
    await Promise.all([import('material/elements/css/text-field'), import('material/elements/css/checkbox'), import('material/elements/css/switch'), import('material/elements/css/radios'), import('material/elements/css/select'), import('material/elements/css/dialog'), import('material/elements/css/menu'), import('material/elements/css/tabs'), import('material/elements/css/list'), import('material/elements/css/chips'), import('material/elements/css/progress'), import('material/elements/css/icon-button'), import('material/elements/css/fab'), import('material/elements/css/slider'), import('material/elements/css/divider')]);
    const m = await import('material/elements');
    for (const fn of ['defineTextField','defineCheckbox','defineSwitch','defineRadios','defineSelect','defineDialog','defineMenu','defineTabs','defineList','defineChips','defineProgress','defineIconButton','defineFab','defineSlider','defineDivider']) m[fn]();
    const html = {
      'text-field': '<m-text-field label="Name"></m-text-field>', checkbox: '<m-checkbox>Agree</m-checkbox>', switch: '<m-switch>Wi-Fi</m-switch>',
      radios: '<m-radios name="choice"><m-radio value="a">A</m-radio><m-radio value="b">B</m-radio></m-radios>',
      select: '<m-select label="Destination"><m-select-option value="paris">Paris</m-select-option><m-select-option value="rome">Rome</m-select-option></m-select>',
      dialog: '<m-dialog title="Confirm">Continue?</m-dialog>', menu: '<m-menu anchor="element-menu-opener"><m-menu-item value="one">One</m-menu-item><m-menu-item value="two">Two</m-menu-item></m-menu>',
      tabs: '<m-tabs><m-tab value="overview">Overview</m-tab><m-tab value="details">Details</m-tab></m-tabs>', list: '<m-list><m-list-item>Item</m-list-item></m-list>',
      chips: '<m-chips><m-chip variant="filter" value="filter">Filter</m-chip></m-chips>', progress: '<m-progress value="50"></m-progress>',
      'icon-button': `<m-icon-button aria-label="Add">${icon}</m-icon-button>`, fab: `<m-fab aria-label="Add">${icon}</m-fab>`, slider: '<m-slider value="50"></m-slider>', divider: '<m-divider></m-divider>' };
    document.querySelector('main').append(element('<button id="element-menu-opener">Menu</button>'));
    for (const [role, markup] of Object.entries(html)) c[role] = attach(role, element(markup));
  }
  finish(c, { disabled: v => { c.button.disabled = v; }, openDialog: () => c.dialog.show(), closeDialog: () => c.dialog.close(), dialogOpen: () => c.dialog.open,
    openMenu: trigger => { c.menu.anchor = trigger; c.menu.show(); }, closeMenu: () => c.menu.hide(), menuOpen: () => c.menu.open,
    setValue: (role, value) => { c[role].value = value; }, getValue: role => c[role].value });
  await new Promise(requestAnimationFrame);
}
