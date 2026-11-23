export function mountRailRipple(root, className) {
    const waveClass = className('__ripple');
    const press = (event) => {
        const target = event.target.closest(`.${className('__item')}, .${className('__toggle')}`);
        if (!target || !root.contains(target) || target.hasAttribute('aria-disabled'))
            return;
        if (event instanceof KeyboardEvent && (event.repeat || !['Enter', ' '].includes(event.key)))
            return;
        if (event.type === 'pointerdown' && event.button !== 0)
            return;
        if (root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            return;
        const host = target.querySelector(`.${className('__indicator')}`) || target;
        const bounds = host.getBoundingClientRect();
        const wave = document.createElement('span');
        wave.className = waveClass;
        wave.setAttribute('aria-hidden', 'true');
        const size = Math.max(bounds.width, bounds.height) * 2;
        const pointer = event instanceof MouseEvent;
        wave.style.width = wave.style.height = `${size}px`;
        wave.style.left = `${(pointer ? event.clientX - bounds.left : bounds.width / 2) - size / 2}px`;
        wave.style.top = `${(pointer ? event.clientY - bounds.top : bounds.height / 2) - size / 2}px`;
        host.append(wave);
    };
    const finish = (event) => {
        const target = event.target;
        if (target.classList.contains(waveClass))
            target.remove();
    };
    root.addEventListener('pointerdown', press);
    root.addEventListener('keydown', press);
    root.addEventListener('animationend', finish);
    root.addEventListener('animationcancel', finish);
    return () => {
        root.removeEventListener('pointerdown', press);
        root.removeEventListener('keydown', press);
        root.removeEventListener('animationend', finish);
        root.removeEventListener('animationcancel', finish);
        root.querySelectorAll(`.${waveClass}`).forEach(wave => wave.remove());
    };
}
