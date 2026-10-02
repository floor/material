// test/types/timepicker-open-option.fixture.ts
//
// FLO-548: the time picker's option is `open`; `isOpen` is the method only.
import createTimePicker from "../../src/components/timepicker";

const picker = createTimePicker({ open: true });
const state: boolean = picker.isOpen();
void state;

// @ts-expect-error the option is `open`; `isOpen` is not a config key
createTimePicker({ isOpen: true });
