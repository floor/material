// A positioned shadow button contributes no in-flow box. Keep its host out
// of flow too, just as the pre-upgrade host at that corner was.
export const FLOATING_HOST_STYLES = ":host(:is([placement='top-start'],[placement='top-end'],[placement='bottom-start'],[placement='bottom-end'])){position:fixed}";
