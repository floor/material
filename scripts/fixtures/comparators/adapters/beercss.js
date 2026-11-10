import ui from 'beercss';
import { attach, element, finish, icon } from '../shared.js';
export async function mount(scenario) {
  document.body.className = 'light'; document.body.innerHTML = '<main></main>';
  const c = { button: attach('button', element('<button>Save</button>')) };
  if (__COMPARATOR_APP__) {
    const html = {
      'text-field': '<div class="field label fill"><input id="name"><label for="name">Name</label></div>', checkbox: '<label class="checkbox"><input type="checkbox"><span>Agree</span></label>',
      switch: '<label class="switch"><input type="checkbox"><span>Wi-Fi</span></label>', radios: '<fieldset><legend>Choice</legend><label class="radio"><input type="radio" name="choice" value="a"><span>A</span></label><label class="radio"><input type="radio" name="choice" value="b"><span>B</span></label></fieldset>',
      select: '<div class="field label fill"><select id="destination"><option value="paris">Paris</option><option value="rome">Rome</option></select><label for="destination">Destination</label></div>',
      dialog: '<dialog id="beer-dialog"><h3>Confirm</h3><p>Continue?</p><button data-ui="#beer-dialog">Close</button></dialog>',
      menu: '<menu id="beer-menu"><li tabindex="0">One</li><li tabindex="0">Two</li></menu>',
      tabs: '<div><div class="tabs"><a data-ui="#overview" class="active" tabindex="0">Overview</a><a data-ui="#details" tabindex="0">Details</a></div><div class="page active" id="overview">Overview content</div><div class="page" id="details">Details content</div></div>',
      list: '<ul class="list"><li>Item</li></ul>', chips: '<label class="chip"><input type="checkbox"><span>Filter</span></label>', progress: '<progress value="50" max="100" aria-label="Progress"></progress>',
      'icon-button': `<button class="transparent circle" aria-label="Add">${icon}</button>`, fab: `<button class="circle extra" aria-label="Add">${icon}</button>`, slider: '<label class="slider"><input type="range" min="0" max="100" value="50" aria-label="Level"><span></span></label>', divider: '<div class="divider"></div>' };
    for (const [role, markup] of Object.entries(html)) c[role] = attach(role, element(markup));
  }
  const menuTrigger = __COMPARATOR_APP__ ? element('<button data-ui="#beer-menu">Open menu</button>') : null;
  if (menuTrigger) c.menu.before(menuTrigger);
  finish(c, { disabled: v => { c.button.disabled = v; }, openDialog: () => ui('#beer-dialog'), closeDialog: () => { if (c.dialog.open) ui('#beer-dialog'); }, dialogOpen: () => c.dialog.classList.contains('active'),
    openMenu: () => { if (!c.menu.classList.contains('active')) menuTrigger.click(); }, closeMenu: () => { if (c.menu.classList.contains('active')) menuTrigger.click(); }, menuOpen: () => c.menu.classList.contains('active'),
    setValue: (role, value) => { const node = c[role].matches('input,select,progress') ? c[role] : c[role].querySelector('input,select'); node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); },
    getValue: role => (c[role].matches('input,select,progress') ? c[role] : c[role].querySelector('input,select')).value });
  await new Promise(requestAnimationFrame);
}
