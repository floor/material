// Test-only baseline: this unchanged private helper is not a public entry.
import { createOnDemandMenu } from './baseline-helper.js';
const menu = createOnDemandMenu({ opener: document.querySelector('#opener') }, [{ id: 'one', text: 'One' }]);
window.lab = { menu, events: [], errors: [] };
document.body.dataset.ready = 'true';
