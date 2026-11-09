// Existing eager barrel: the control for pre-upgrade own properties.
import { defineMenu } from 'material/elements';
import 'material/elements/css/menu';
const anchor = document.querySelector('#opener');
const host = document.createElement('m-menu');
host.setAttribute('anchor', 'opener');
host.anchor = anchor;
host.setAttribute('aria-label', 'Actions');
host.innerHTML = '<m-menu-item value="one">One</m-menu-item><m-menu-item value="last">Last</m-menu-item>';
document.body.append(host);
const events = [];
const errors = [];
host.addEventListener('open', () => events.push('open'));
host.addEventListener('close', () => events.push('close'));
host.open = true;
defineMenu();
window.lab = { host, events, errors };
document.body.dataset.ready = 'true';
