import '@material/web/button/filled-button.js';
import { attach, element, finish, icon, settle } from '../shared.js';
export async function mount(scenario) {
  document.body.innerHTML = '<main></main>';
  const c = { button: attach('button', element('<md-filled-button>Save</md-filled-button>')) };
  if (scenario === 'app') {
    await Promise.all([import('@material/web/textfield/filled-text-field.js'), import('@material/web/checkbox/checkbox.js'), import('@material/web/switch/switch.js'), import('@material/web/radio/radio.js'),
      import('@material/web/select/filled-select.js'), import('@material/web/select/select-option.js'), import('@material/web/dialog/dialog.js'), import('@material/web/menu/menu.js'), import('@material/web/menu/menu-item.js'),
      import('@material/web/tabs/tabs.js'), import('@material/web/tabs/primary-tab.js'), import('@material/web/list/list.js'), import('@material/web/list/list-item.js'), import('@material/web/chips/chip-set.js'), import('@material/web/chips/filter-chip.js'),
      import('@material/web/progress/linear-progress.js'), import('@material/web/iconbutton/icon-button.js'), import('@material/web/fab/fab.js'), import('@material/web/slider/slider.js'), import('@material/web/divider/divider.js')]);
    c['text-field'] = attach('text-field', element('<md-filled-text-field label="Name"></md-filled-text-field>'));
    c.checkbox = attach('checkbox', element('<md-checkbox aria-label="Agree"></md-checkbox>'));
    c.switch = attach('switch', element('<md-switch aria-label="Wi-Fi"></md-switch>'));
    c.radios = attach('radios', element('<div role="radiogroup" aria-label="Choice"><md-radio name="choice" value="a" aria-label="A"></md-radio><md-radio name="choice" value="b" aria-label="B"></md-radio></div>'));
    c.select = attach('select', element('<md-filled-select label="Destination"><md-select-option value="paris"><div slot="headline">Paris</div></md-select-option><md-select-option value="rome"><div slot="headline">Rome</div></md-select-option></md-filled-select>'));
    c.dialog = attach('dialog', element('<md-dialog aria-label="Confirm"><div slot="headline">Confirm</div><div slot="content">Continue?</div><md-filled-button slot="actions">Close</md-filled-button></md-dialog>'));
    c.menu = attach('menu', element('<md-menu><md-menu-item><div slot="headline">One</div></md-menu-item><md-menu-item><div slot="headline">Two</div></md-menu-item></md-menu>'));
    c.tabs = attach('tabs', element('<md-tabs><md-primary-tab>Overview</md-primary-tab><md-primary-tab>Details</md-primary-tab></md-tabs>'));
    c.list = attach('list', element('<md-list><md-list-item>Item</md-list-item></md-list>'));
    c.chips = attach('chips', element('<md-chip-set><md-filter-chip label="Filter"></md-filter-chip></md-chip-set>'));
    c.progress = attach('progress', element('<md-linear-progress value="0.5" aria-label="Progress"></md-linear-progress>'));
    c['icon-button'] = attach('icon-button', element(`<md-icon-button aria-label="Add">${icon}</md-icon-button>`));
    c.fab = attach('fab', element(`<md-fab aria-label="Add"><span slot="icon">${icon}</span></md-fab>`));
    c.slider = attach('slider', element('<md-slider min="0" max="100" value="50" aria-label="Level"></md-slider>'));
    c.divider = attach('divider', element('<md-divider></md-divider>'));
  }
  finish(c, { disabled: v => { c.button.disabled = v; }, openDialog: () => c.dialog.show(), closeDialog: () => c.dialog.close(), dialogOpen: () => c.dialog.open,
    openMenu: trigger => { trigger.id = 'menu-anchor'; c.menu.anchor = trigger.id; c.menu.open = true; }, closeMenu: () => { c.menu.open = false; }, menuOpen: () => c.menu.open,
    setValue: (role, value) => { c[role].value = value; }, getValue: role => c[role].value });
  await settle();
}
