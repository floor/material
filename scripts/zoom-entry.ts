import { createButton } from "../src/components/button/index.ts";
import { createIconButton } from "../src/components/icon-button/index.ts";
import { createFab } from "../src/components/fab/index.ts";
import { createSwitch } from "../src/components/switch/index.ts";
import { createCheckbox } from "../src/components/checkbox/index.ts";
import { createSlider } from "../src/components/slider/index.ts";
import { createTextField } from "../src/components/text-field/index.ts";
import { createSelect } from "../src/components/select/index.ts";
import { createMenu } from "../src/components/menu/index.ts";
import { createTooltip } from "../src/components/tooltip/index.ts";
import { createCarousel } from "../src/components/carousel/index.ts";
import { createDialog } from "../src/components/dialog/index.ts";
/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creators off the window. */
const w = window as any;
w.mtrl = { createButton, createIconButton, createFab, createSwitch, createCheckbox, createSlider, createTextField, createSelect, createMenu, createTooltip, createCarousel, createDialog };
w.ready = true;