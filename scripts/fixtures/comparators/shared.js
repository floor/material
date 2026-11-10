export const icon = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
export function element(markup) { const template = document.createElement('template'); template.innerHTML = markup; return template.content.firstElementChild; }
export function attach(role, node) {
  const section = document.createElement('section'); section.dataset.fixture = role;
  const label = document.createElement('h2'); label.textContent = role;
  section.append(label, node); document.querySelector('main').append(section); return node;
}
export function finish(controls, api = {}) {
  const button = controls.button;
  const state = { clicks: 0 };
  button.addEventListener('click', () => state.clicks++);
  const triggers = {};
  for (const kind of ['Dialog', 'Menu']) {
    const role = kind.toLowerCase(); if (!controls[role]) continue;
    const trigger = document.createElement('button'); trigger.id = `fixture-${role}-trigger`; trigger.textContent = `Open ${kind}`;
    trigger.addEventListener('click', () => api[`open${kind}`](trigger));
    document.querySelector(`[data-fixture="${role}"]`).append(trigger); triggers[role] = trigger;
  }
  window.fixture = { controls, api, state, triggers };
}
export async function settle() {
  // Await public component update promises, including dependencies created in shadow roots.
  for (let pass = 0; pass < 4; pass++) {
    const nodes = [];
    const walk = root => { for (const node of root.querySelectorAll('*')) { nodes.push(node); if (node.shadowRoot) walk(node.shadowRoot); } };
    walk(document);
    await Promise.all(nodes.map(node => node.updateComplete).filter(Boolean));
    await new Promise(requestAnimationFrame);
  }
}
