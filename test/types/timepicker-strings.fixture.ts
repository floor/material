// test/types/timepicker-strings.fixture.ts
//
// Format, type and orientation were TypeScript enums only, so
// `format: '24h'` was a type error, unlike every other component's string
// options. They take the enum or its string value now; the getters still
// return the enum.
import createTimePicker, { TIME_FORMAT, TIME_PICKER_ORIENTATION, TIME_PICKER_TYPE } from "../../src/components/timepicker";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const picker = createTimePicker({ format: "24h", type: "input", orientation: "horizontal" });
createTimePicker({ format: TIME_FORMAT.AMPM, type: TIME_PICKER_TYPE.DIAL, orientation: TIME_PICKER_ORIENTATION.VERTICAL });
picker.setFormat("12h").setType("dial").setOrientation("vertical");
picker.setFormat(TIME_FORMAT.MILITARY);
export const format: Equals<ReturnType<typeof picker.getFormat>, TIME_FORMAT> = true;
export const type: Equals<ReturnType<typeof picker.getType>, TIME_PICKER_TYPE> = true;
// @ts-expect-error only the format's own values
createTimePicker({ format: "24" });
// @ts-expect-error only the orientation's own values
picker.setOrientation("diagonal");
