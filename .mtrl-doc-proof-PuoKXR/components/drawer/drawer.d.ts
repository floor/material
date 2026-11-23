import { DrawerConfig, DrawerComponent } from "./types.js";
/**
 * Creates a new Drawer component with the specified configuration.
 * @param config
 * @deprecated use {@link createNavigationDrawer}. Material Design 3 names the
 * component the navigation drawer; this name stays for 3.x.
 */
export default function createDrawer(config?: DrawerConfig): DrawerComponent;
export declare const createShadowDrawer: (config: DrawerConfig) => DrawerComponent;
/** Creates a navigation drawer: the same factory as {@link createDrawer}, under the name Material Design 3 gives the component. */
export declare const createNavigationDrawer: typeof createDrawer;
