// scripts/timepicker-seconds-entry.ts
// The browser entry check-timepicker-seconds-width.ts bundles: the factory on
// the window, so a page can mount a picker without the element's registry.
import createTimePicker from "../src/components/timepicker/index";

/* eslint-disable @typescript-eslint/no-explicit-any -- the page reads the creator off the window. */
(window as any).createTimePicker = createTimePicker;
(window as any).ready = true;
