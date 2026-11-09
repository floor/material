import createMenu from 'material/components/menu';
const menu = createMenu({ opener: document.querySelector('#opener'), ariaLabel: 'Actions', items: [
  { id: 'one', text: 'One' }, { id: 'disabled', text: 'Disabled', disabled: true }, { id: 'last', text: 'Last' },
] });
window.lab = { menu };
document.body.dataset.ready = 'true';
