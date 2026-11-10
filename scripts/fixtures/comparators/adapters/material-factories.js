import 'material/styles/base';
import 'material/styles/button';
import { createButton } from 'material';
import { attach, element, finish, icon } from '../shared.js';
export async function mount(scenario) {
  document.body.innerHTML = '<main></main>';
  const instances = { button: createButton({ text: 'Save', variant: 'filled', size: 's', shape: 'round' }) };
  const c = { button: attach('button', instances.button.element) };
  if (scenario === 'app') {
    await Promise.all([import('material/styles/text-field'), import('material/styles/checkbox'), import('material/styles/switch'), import('material/styles/radios'), import('material/styles/select'), import('material/styles/dialog'), import('material/styles/menu'), import('material/styles/tabs'), import('material/styles/list'), import('material/styles/chips'), import('material/styles/progress'), import('material/styles/icon-button'), import('material/styles/fab'), import('material/styles/slider'), import('material/styles/divider')]);
    const m = await import('material');
    const opener = element('<button id="factory-menu-opener">Menu</button>'); document.querySelector('main').append(opener);
    Object.assign(instances, {
      'text-field': m.createTextField({ label: 'Name' }), checkbox: m.createCheckbox({ label: 'Agree' }), switch: m.createSwitch({ label: 'Wi-Fi' }),
      radios: m.createRadios({ name: 'choice', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }),
      select: m.createSelect({ label: 'Destination', options: [{ id: 'paris', text: 'Paris' }, { id: 'rome', text: 'Rome' }] }),
      dialog: m.createDialog({ title: 'Confirm', content: 'Continue?' }), menu: m.createMenu({ opener, items: [{ id: 'one', text: 'One' }, { id: 'two', text: 'Two' }] }),
      tabs: m.createTabs({ tabs: [{ text: 'Overview', value: 'overview' }, { text: 'Details', value: 'details' }] }), list: m.createList({ items: [{ id: 'item', headline: 'Item' }] }),
      chips: m.createChips({ chips: [{ label: 'Filter', value: 'filter', variant: 'filter' }] }), progress: m.createProgress({ value: 50 }),
      'icon-button': m.createIconButton({ icon, ariaLabel: 'Add' }), fab: m.createFab({ icon, ariaLabel: 'Add' }), slider: m.createSlider({ value: 50 }), divider: m.createDivider({}),
    });
    for (const [role, instance] of Object.entries(instances)) if (role !== 'button') c[role] = attach(role, instance.element);
  }
  finish(c, { disabled: v => { v ? instances.button.disable() : instances.button.enable(); },
    openDialog: () => instances.dialog.open(), closeDialog: () => instances.dialog.close(), dialogOpen: () => instances.dialog.isOpen(),
    openMenu: () => instances.menu.open(), closeMenu: () => instances.menu.close(), menuOpen: () => instances.menu.isOpen(),
    setValue: (role, value) => instances[role].setValue(value), getValue: role => instances[role].getValue() });
}
