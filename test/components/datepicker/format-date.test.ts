import { describe, expect, test } from "bun:test";
import { formatDate } from "../../../src/components/datepicker/utils";

describe("date picker format tokens", () => {
  test("keeps all eight numeric and localized month tokens in one format", () => {
    const date = new Date(2026, 1, 9);
    for (const locale of ["en-US", "fr-FR", "de-DE", "ja-JP", "ar-EG", "th-TH", "fa-IR"]) {
      const month = (width: "long" | "short") => new Intl.DateTimeFormat(locale, { month: width, calendar: "gregory", numberingSystem: "latn" }).format(date);
      expect(formatDate(date, "YYYY YY MMMM MMM MM M DD D", locale)).toBe(`2026 26 ${month("long")} ${month("short")} 02 2 09 9`);
    }
  });

  test("keeps the default numeric format and invalid-date result", () => {
    expect(formatDate(new Date(2026, 1, 9))).toBe("02/09/2026");
    expect(formatDate(null)).toBe("");
    expect(formatDate(new Date(NaN))).toBe("");
  });
});


// Eager and deferred field formatting must preserve the same ISO year width.
import * as eager from "../../../src/components/datepicker/utils";
import * as deferred from "../../../src/components/datepicker/field-format";
for (const [entry, helpers] of [["eager", eager], ["deferred", deferred]] as const) {
  describe(`${entry} early-year formatting`, () => {
    test("pads YYYY and YY and round-trips strict four-digit input", () => {
      for (const year of ["0001", "0009", "0099", "0100", "0999", "2026"]) {
        const text = `${year}-01-02`;
        const date = helpers.parseDate(text)!;
        expect(helpers.formatDate(date, "YYYY-MM-DD")).toBe(text);
        expect(helpers.formatDate(date, "YY")).toBe(year.slice(-2));
        expect(helpers.parseInputDate(helpers.formatDate(date, "YYYY-MM-DD"), "YYYY-MM-DD")!.getFullYear()).toBe(Number(year));
        expect(helpers.toIsoValue(date)).toBe(text);
        expect(helpers.toIsoValue([date, date])).toBe(`${text}/${text}`);
      }
    });
    test("year zero remains outside the date picker's accepted range", () => {
      expect(helpers.parseDate("0000-01-02")).toBeNull();
    });
  });
}
