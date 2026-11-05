// src/components/datepicker/utils.ts
import type { CalendarDate } from './types';

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

export const getFirstDayOfWeek = (locale = DEFAULT_LOCALE): number => {
  const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay?: number }; weekInfo?: { firstDay?: number } };
  const first = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay, r = loc.maximize().region ?? '';
  return first ? first % 7 : /^(EG|IR|AF|SY)$/.test(r) ? 6 : /^(US|CA|MX|JP|KR|TW|HK|BR|PT|IL|SA|TH|PH|IN|ZA)$/.test(r) ? 0 : 1;
};

export const getLocaleDateFormat = (locale = DEFAULT_LOCALE): string =>
  dtf(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(3333, 10, 22))
    .replace('3333', 'YYYY')
    .replace('11', 'MM')
    .replace('22', 'DD')
    .replace(/[\u200e\u200f]|[^MDY]+$/g, '');

export const getMonthNames = (locale = DEFAULT_LOCALE, month: 'long' | 'short' = 'long'): string[] => {
  const f = dtf(locale, { month });
  return Array.from({ length: 12 }, (_, m) => f.format(new Date(2026, m, 1)));
};

export const getWeekdayNames = (locale = DEFAULT_LOCALE): { narrow: string; long: string }[] => {
  const n = dtf(locale, { weekday: 'narrow' }), l = dtf(locale, { weekday: 'long' }), first = getFirstDayOfWeek(locale);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 0, 4 + ((first + i) % 7));
    return { narrow: n.format(d), long: l.format(d) };
  });
};

export const parseDate = (date: Date | string | null): Date | null => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return parseInputDate(date, 'YYYY-MM-DD');
  const result = new Date(date);
  if (isNaN(result.getTime())) return null;
  result.setHours(0, 0, 0, 0);
  return result;
};

const TOKEN_RE = /(YYYY|MMMM|MMM|YY|MM|DD|M|D)/g;

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
    token === 'MMMM' ? dtf(locale, { month: 'long' }).format(date) :
    token === 'MMM' ? dtf(locale, { month: 'short' }).format(date) :
    token === 'MM' ? pad(m) :
    token === 'M' ? String(m) :
    token === 'YYYY' ? String(y) :
    token === 'YY' ? String(y).slice(-2) :
    token === 'DD' ? pad(d) :
    String(d)
  );
};

export const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year: number, month: number): number => new Date(year, month, 1).getDay();

export const isSameDay = (date1: Date, date2: Date): boolean =>
  date1.getDate() === date2.getDate() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getFullYear() === date2.getFullYear();

export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean =>
  date >= startDate && date <= endDate;

export const generateCalendarDates = (
  year: number,
  month: number,
  selectedDate: Date | null = null,
  rangeEndDate: Date | null = null,
  minDate: Date | null = null,
  maxDate: Date | null = null,
  firstDayOfWeek: number = 0
): CalendarDate[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = (getFirstDayOfMonth(year, month) - firstDayOfWeek + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, 1 - firstDay + i);
    const isCurrentMonth = date.getMonth() === month;
    const calendarDate: CalendarDate = {
      date,
      day: date.getDate(),
      isCurrentMonth,
      isToday: isSameDay(date, today),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      isDisabled: Boolean((minDate && date < minDate) || (maxDate && date > maxDate)),
    };
    if (isCurrentMonth && selectedDate && rangeEndDate) {
      calendarDate.isRangeStart = isSameDay(date, selectedDate);
      calendarDate.isRangeEnd = isSameDay(date, rangeEndDate);
      calendarDate.isRangeMiddle = isDateInRange(date, selectedDate, rangeEndDate) && !calendarDate.isRangeStart && !calendarDate.isRangeEnd;
    }
    return calendarDate;
  });
};

/**
 * Adds days to a date
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Adds months to a date
 * @param date - Base date
 * @param months - Number of months to add
 * @returns New date with months added
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  result.setDate(Math.min(day, getDaysInMonth(result.getFullYear(), result.getMonth())));
  return result;
};

/**
 * Adds years to a date
 * @param date - Base date
 * @param years - Number of years to add
 * @returns New date with years added
 */
export const addYears = (date: Date, years: number): Date => {
  return addMonths(date, years * 12);
};
const isoDate = (date: Date | null | undefined): string => (date ? formatDate(date, "YYYY-MM-DD") : "");

/**
 * A value as ISO 8601 text, the `<m-datepicker>` element's value: a date
 * (`2026-09-10`), a `start/end` interval, or "".
 */
export const toIsoValue = (value: Date | [Date, Date] | null, end?: Date | null): string =>
  Array.isArray(value) ? `${isoDate(value[0])}/${isoDate(value[1])}` : value && end ? `${isoDate(value)}/${isoDate(end)}` : isoDate(value);
