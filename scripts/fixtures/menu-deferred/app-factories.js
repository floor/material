import {
  createButton, createTextField, createCheckbox, createSwitch, createRadios, createSelect,
  createDialog, createTabs, createList, createChips, createProgress, createIconButton,
  createFab, createSlider, createDivider,
} from 'material';
export function mount() {
  const controls = [createButton({ text: 'Save' }), createTextField({ label: 'Name' }),
    createCheckbox({ label: 'Agree' }), createSwitch({ label: 'Wi-Fi' }),
    createRadios({ name: 'choice', options: [{ value: 'a', label: 'A' }] }),
    createSelect({ label: 'Destination', options: [{ id: 'paris', text: 'Paris' }] }),
    createDialog({ title: 'Confirm', content: 'Continue?' }),
    createTabs({ tabs: [{ text: 'Overview', value: 'overview' }] }),
    createList({ items: [{ id: 'a', headline: 'Item' }] }),
    createChips({ chips: [{ label: 'Filter', value: 'filter' }] }),
    createProgress({ value: 50 }), createIconButton({ ariaLabel: 'Add' }),
    createFab({ ariaLabel: 'Add' }), createSlider({ value: 50 }), createDivider({})];
  for (const control of controls) document.body.append(control.element);
  return controls[0].element;
}
