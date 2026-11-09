import createDeferredMenu from 'material/components/menu/deferred';
const opener = document.querySelector('#opener');
const events = [];
const errors = [];
window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
const menu = createDeferredMenu({ opener, ariaLabel: 'Actions', items: [
  { id: 'one', text: 'One', data: { answer: 42 } },
  { id: 'disabled', text: 'Disabled', disabled: true },
  { id: 'last', text: 'Last' },
], on: {
  open: event => events.push(['open', event.menu === menu]),
  close: event => events.push(['close', event.menu === menu]),
  loaderror: event => events.push(['loaderror', event.menu === menu, String(event.error)]),
} });
Object.assign(window, { lab: { menu, events, errors, createDeferredMenu,
  createEagerMenu: async config => (await import('material/components/menu')).createMenu(config),
} });
document.body.dataset.ready = 'true';
