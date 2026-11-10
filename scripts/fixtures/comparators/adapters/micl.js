import 'material-inspired-component-library/dist/base.css';
import 'material-inspired-component-library/dist/button.css';
import 'material-inspired-component-library/dist/button.js';
import { attach, element, finish, icon } from '../shared.js';
export async function mount(scenario) {
  document.body.innerHTML = '<main></main>';
  const c = { button: attach('button', element('<button type="button" class="micl-button-filled-s">Save</button>')) };
  if (scenario === 'app') {
    await Promise.all([import('material-inspired-component-library/dist/micl.css'), import('material-inspired-component-library')]);
    const html = {
      'text-field': '<div class="micl-textfield-filled"><label for="name">Name</label><input id="name"></div>',
      checkbox: '<label class="micl-checkbox"><input type="checkbox"><span>Agree</span></label>', switch: '<label class="micl-switch"><input type="checkbox"><span>Wi-Fi</span></label>',
      radios: '<fieldset><legend>Choice</legend><label class="micl-radio"><input type="radio" name="choice" value="a">A</label><label class="micl-radio"><input type="radio" name="choice" value="b">B</label></fieldset>',
      select: '<div class="micl-textfield-filled"><label for="destination">Destination</label><select id="destination"><option class="micl-list-item-one" value="paris">Paris</option><option class="micl-list-item-one" value="rome">Rome</option></select></div>',
      dialog: '<dialog class="micl-dialog" aria-label="Confirm"><h3>Confirm</h3><p>Continue?</p><button>Close</button></dialog>',
      menu: '<nav id="micl-menu" class="micl-menu" popover><ul class="micl-list"><li class="micl-list-item-one" tabindex="0"><span class="micl-list-item__text">One</span></li><li class="micl-list-item-one"><span class="micl-list-item__text">Two</span></li></ul></nav>',
      list: '<ul class="micl-list"><li class="micl-list-item-one"><span class="micl-list-item__text">Item</span></li></ul>',
      chips: `<fieldset class="micl-chips"><label class="micl-chip-filter"><span class="micl-button__icon">${icon}</span><input type="checkbox"><span>Filter</span></label></fieldset>`,
      progress: '<progress class="micl-linear-progress" value="0.5" max="1" aria-label="Progress"></progress>',
      'icon-button': `<button type="button" class="micl-iconbutton-standard-s" aria-label="Add">${icon}</button>`,
      slider: '<input type="range" class="micl-slider" min="0" max="100" value="50" aria-label="Level">', divider: '<hr class="micl-divider">' };
    for (const [role, markup] of Object.entries(html)) c[role] = attach(role, element(markup));
  }
  finish(c, { disabled: v => { c.button.disabled = v; }, openDialog: () => c.dialog.showModal(), closeDialog: () => c.dialog.close(), dialogOpen: () => c.dialog.open,
    openMenu: () => c.menu.showPopover(), closeMenu: () => c.menu.hidePopover(), menuOpen: () => c.menu.matches(':popover-open'),
    setValue: (role, value) => { const node = c[role].matches('input,select,progress') ? c[role] : c[role].querySelector('input,select'); node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); },
    getValue: role => (c[role].matches('input,select,progress') ? c[role] : c[role].querySelector('input,select')).value });
  await new Promise(requestAnimationFrame);
}
