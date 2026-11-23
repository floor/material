let openMenu = null;
export const menuOpened = (menu, event) => {
    const previous = openMenu;
    openMenu = menu;
    if (previous && previous !== menu) {
        previous.close(event);
    }
};
export const menuClosed = (menu) => {
    if (openMenu === menu)
        openMenu = null;
};
export const currentlyOpenMenu = () => openMenu;
