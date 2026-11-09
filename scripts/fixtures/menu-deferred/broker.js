// Reference application code, included in the measured lazy element fixture.
// Registration waits for both code and shadow CSS. Imports alone define nothing.
export function menuLoader(prefix) {
  let registration;
  return () => registration ??= Promise.all([
    import('material/elements/menu'),
    import('material/elements/css/menu'),
  ]).then(([{ defineMenu }]) => defineMenu({ prefix })).catch(error => {
    registration = undefined;
    throw error;
  });
}

export function brokerMenu(anchor, host, load, report) {
  if (customElements.get(host.localName)) return () => {};
  let desired = false;
  let originalEvent;
  let pending;
  let watching = false;
  let previousBusy;
  const usable = () => anchor.isConnected && host.isConnected &&
    !anchor.matches(':disabled, [disabled], [aria-disabled="true"]') &&
    !anchor.closest('[inert], [hidden], dialog:not([open])');
  const clearBusy = () => {
    if (anchor.getAttribute('aria-busy') === 'true') {
      if (previousBusy === null) anchor.removeAttribute('aria-busy');
      else anchor.setAttribute('aria-busy', previousBusy);
    }
  };
  const stopWatching = () => {
    if (!watching) return;
    watching = false;
    document.removeEventListener('click', outside);
    document.removeEventListener('keydown', dismissKey);
    anchor.removeEventListener('blur', cancel);
    observer.disconnect();
    clearBusy();
  };
  const cancel = () => { desired = false; stopWatching(); };
  const outside = event => {
    if (event !== originalEvent && !event.composedPath().includes(anchor)) cancel();
  };
  const dismissKey = event => {
    if (event !== originalEvent && ['Escape', 'Tab'].includes(event.key)) {
      if (event.key === 'Escape') event.preventDefault();
      cancel();
    }
  };
  const observer = new MutationObserver(() => { if (!usable()) cancel(); });
  const startWatching = () => {
    if (watching) return;
    watching = true;
    previousBusy = anchor.getAttribute('aria-busy');
    anchor.setAttribute('aria-busy', 'true');
    document.addEventListener('click', outside);
    document.addEventListener('keydown', dismissKey);
    anchor.addEventListener('blur', cancel);
    observer.observe(document, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'open', 'hidden', 'inert'] });
  };
  const detach = () => {
    anchor.removeEventListener('click', click);
    anchor.removeEventListener('keydown', key);
    stopWatching();
  };
  const request = event => {
    originalEvent = event;
    if (desired) startWatching(); else stopWatching();
    pending ??= load().then(() => {
      detach();
      if (desired && usable() && !host.open) host.toggle(originalEvent);
    }).catch(error => {
      desired = false; stopWatching(); pending = undefined; report(error);
    });
  };
  const click = event => {
    if (!usable()) return;
    event.preventDefault(); event.stopPropagation();
    desired = !desired; request(event);
  };
  const key = event => {
    if (!usable() || !['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    desired = event.key.startsWith('Arrow') || !desired;
    request(event);
  };
  // Explicit preload may register outside a gesture request too. Remove the
  // broker before the next warm input, so only the ordinary anchor runs.
  void customElements.whenDefined(host.localName).then(detach);
  anchor.addEventListener('click', click);
  anchor.addEventListener('keydown', key);
  // Initially open content is the eager path; no savings claimed for it.
  if (host.hasAttribute('open') || host.open) request(undefined);
  return detach;
}
