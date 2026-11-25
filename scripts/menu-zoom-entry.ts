// scripts/menu-zoom-entry.ts
// The browser entry check-menu-zoom.ts bundles: the factory creators a page
// needs to mount an opener, a menu and a select.
import { createButton } from "../src/components/button/index";
import { createMenu } from "../src/components/menu/index";
import { createSelect } from "../src/components/select/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creators off the window. */
const w = window as any;
w.mtrl = { createButton, createMenu, createSelect };
w.ready = true;
