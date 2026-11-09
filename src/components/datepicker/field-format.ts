// src/components/datepicker/field-format.ts
//
// The deferred entry's synchronous field path: the locale, the locale-derived
// format, the displayed value and the strict parse of what is typed. The
// shell's first load carries this module instead of ./utils — a module shared
// between the first load and the deferred calendar chunk is hoisted whole, so
// importing even one helper from ./utils statically would ship the calendar's
// whole date-math module before the picker is opened. These helpers are the
// default entry's, repeated for the same reason ./config is: the default's
// bytes do not move. The calendar-side helpers (the week start, the month
// math, the calendar grid) stay in ./utils and arrive with the calendar.
export const DEFAULT_LOCALE = 'en-US';
export const dtf = (locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { calendar: 'gregory', numberingSystem: 'latn', ...opts });
export const resolveLocale = (locale?: string): string => {
  try {
    return (locale && Intl.DateTimeFormat.supportedLocalesOf(locale)[0]) || DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};
export const getLocaleDateFormat = (locale = DEFAULT_LOCALE): string =>
  dtf(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(3333, 10, 22))
    .replace('3333', 'YYYY')
    .replace('11', 'MM')
    .replace('22', 'DD')
    .replace(/[‎‏]|[^MDY]+$/g, '');
export const getMonthNames = (locale = DEFAULT_LOCALE, month: 'long' | 'short' = 'long'): string[] => {
  const f = dtf(locale, { month });
  return Array.from({ length: 12 }, (_, m) => f.format(new Date(2026, m, 1)));
};
const TOKEN_RE = /(YYYY|MMMM|MMM|YY|MM|DD|M|D)/g;
export const parseDate = (date: Date | string | null): Date | null => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return parseInputDate(date, 'YYYY-MM-DD');
  const result = new Date(date);
  if (isNaN(result.getTime())) return null;
  result.setHours(0, 0, 0, 0);
  return result;
};
/** Strict inverse of formatDate: never let Date roll February 30 into March. */
export const parseInputDate = (text: string, format: string, locale = DEFAULT_LOCALE): Date | null => {
  const tokens: string[] = [];
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const months = (s: 'long' | 'short') => getMonthNames(locale, s);
  const pattern = format.split(TOKEN_RE).map((part, i) => {
    if (!(i & 1)) return escape(part);
    tokens.push(part);
    if (part === 'MMMM' || part === 'MMM') return '(' + months(part === 'MMMM' ? 'long' : 'short').map(escape).join('|') + ')';
    return part === 'YYYY' ? '(\\d{4})' : part === 'YY' ? '(\\d{2})' : '(\\d{1,2})';
  }).join('');
  const match = new RegExp('^' + pattern + '$', 'i').exec(text.trim());
  if (!match) return null;
  let year = 0, month = 0, day = 0;
  tokens.forEach((token, index) => {
    const value = match[index + 1];
    if (token === 'YYYY') year = Number(value);
    else if (token === 'YY') year = 2000 + Number(value);
    else if (token === 'MMMM' || token === 'MMM') month = months(token === 'MMMM' ? 'long' : 'short').findIndex(name => name.toLowerCase() === value.toLowerCase()) + 1;
    else if (token.startsWith('M')) month = Number(value);
    else day = Number(value);
  });
  const result = new Date(0); result.setFullYear(year, month - 1, day); result.setHours(0, 0, 0, 0);
  return year >= 1 && result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
};
export const formatDate = (date: Date | null, format: string = 'MM/DD/YYYY', locale = DEFAULT_LOCALE): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const m = date.getMonth() + 1, d = date.getDate(), y = date.getFullYear(), pad = (n: number) => String(n).padStart(2, '0');
  return format.replace(TOKEN_RE, token =>
    token.startsWith('MMM') ? dtf(locale, { month: token.length === 4 ? 'long' : 'short' }).format(date) :
    token === 'MM' ? pad(m) :
    token === 'M' ? String(m) :
    token === 'YYYY' ? String(y) :
    token === 'YY' ? String(y).slice(-2) :
    token === 'DD' ? pad(d) :
    String(d)
  );
};
export const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getDate() === date2.getDate() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getFullYear() === date2.getFullYear();
const isoDate = (date: Date | null | undefined): string => (date ? formatDate(date, "YYYY-MM-DD") : "");
/**
 * A value as ISO 8601 text, the `<m-datepicker>` element's value: a date
 * (`2026-09-10`), a `start/end` interval, or "".
 */
export const toIsoValue = (value: Date | [Date, Date] | null, end?: Date | null): string =>
  Array.isArray(value) ? `${isoDate(value[0])}/${isoDate(value[1])}` : value && end ? `${isoDate(value)}/${isoDate(end)}` : isoDate(value);
