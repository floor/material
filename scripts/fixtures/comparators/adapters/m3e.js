import '@m3e/web/theme';
import '@m3e/web/button';
import { attach, element, finish, icon, settle } from '../shared.js';
export async function mount(scenario) {
  const theme = element('<m3e-theme scheme="light"><main></main></m3e-theme>'); document.body.replaceChildren(theme);
  const c = { button: attach('button', element('<m3e-button variant="filled" shape="rounded" size="small">Save</m3e-button>')) };
  if (scenario === 'app') {
    await Promise.all([import('@m3e/web/form-field'), import('@m3e/web/checkbox'), import('@m3e/web/switch'), import('@m3e/web/radio-group'),
      import('@m3e/web/select'), import('@m3e/web/option'), import('@m3e/web/dialog'), import('@m3e/web/menu'), import('@m3e/web/tabs'),
      import('@m3e/web/list'), import('@m3e/web/chips'), import('@m3e/web/progress-indicator'), import('@m3e/web/icon-button'), import('@m3e/web/fab'), import('@m3e/web/slider'), import('@m3e/web/divider')]);
    c['text-field'] = attach('text-field', element('<m3e-form-field variant="filled"><label slot="label" for="name">Name</label><input id="name"></m3e-form-field>'));
    c.checkbox = attach('checkbox', element('<m3e-checkbox aria-label="Agree"></m3e-checkbox>'));
    c.switch = attach('switch', element('<m3e-switch aria-label="Wi-Fi"></m3e-switch>'));
    c.radios = attach('radios', element('<m3e-radio-group aria-label="Choice"><m3e-radio value="a">A</m3e-radio><m3e-radio value="b">B</m3e-radio></m3e-radio-group>'));
    c.select = attach('select', element('<m3e-form-field variant="filled"><label slot="label" for="destination">Destination</label><m3e-select id="destination"><m3e-option value="paris">Paris</m3e-option><m3e-option value="rome">Rome</m3e-option></m3e-select></m3e-form-field>'));
    c.dialog = attach('dialog', element('<m3e-dialog dismissible aria-label="Confirm"><span slot="header">Confirm</span>Continue?<m3e-button slot="actions">Close</m3e-button></m3e-dialog>'));
    c.menu = attach('menu', element('<m3e-menu><m3e-menu-item>One</m3e-menu-item><m3e-menu-item>Two</m3e-menu-item></m3e-menu>'));
    c.tabs = attach('tabs', element('<m3e-tabs><m3e-tab selected for="overview">Overview</m3e-tab><m3e-tab for="details">Details</m3e-tab><m3e-tab-panel id="overview">Overview content</m3e-tab-panel><m3e-tab-panel id="details">Details content</m3e-tab-panel></m3e-tabs>'));
    c.list = attach('list', element('<m3e-list><m3e-list-item>Item</m3e-list-item></m3e-list>'));
    c.chips = attach('chips', element('<m3e-filter-chip>Filter</m3e-filter-chip>'));
    c.progress = attach('progress', element('<m3e-linear-progress-indicator value="0.5" max="1" aria-label="Progress"></m3e-linear-progress-indicator>'));
    c['icon-button'] = attach('icon-button', element(`<m3e-icon-button aria-label="Add">${icon}</m3e-icon-button>`));
    c.fab = attach('fab', element(`<m3e-fab aria-label="Add">${icon}</m3e-fab>`));
    c.slider = attach('slider', element('<m3e-slider value="50" min="0" max="100" aria-label="Level"></m3e-slider>'));
    c.divider = attach('divider', element('<m3e-divider></m3e-divider>'));
  }
  finish(c, {
    disabled: value => { c.button.disabled = value; },
    openDialog: () => c.dialog.show(), closeDialog: () => c.dialog.hide(), dialogOpen: () => c.dialog.open,
    openMenu: trigger => c.menu.show(trigger), closeMenu: () => c.menu.hide(), menuOpen: () => c.menu.isOpen,
    setValue: (role, value) => { const node = role === 'select' ? c.select.querySelector('m3e-select') : role === 'text-field' ? c[role].querySelector('input') : c[role]; node.value = value; },
    getValue: role => (role === 'select' ? c.select.querySelector('m3e-select') : role === 'text-field' ? c[role].querySelector('input') : c[role]).value,
  });
  await settle();
}
