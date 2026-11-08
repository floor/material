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
