export const DEFAULT_LOCALE = 'en-US';
export const dtf = (locale, opts) => new Intl.DateTimeFormat(locale, { calendar: 'gregory', numberingSystem: 'latn', ...opts });
export const resolveLocale = (locale) => {
    try {
        return (locale && Intl.DateTimeFormat.supportedLocalesOf(locale)[0]) || DEFAULT_LOCALE;
    }
    catch {
        return DEFAULT_LOCALE;
    }
};
export const getFirstDayOfWeek = (locale = DEFAULT_LOCALE) => {
    const loc = new Intl.Locale(locale);
    const first = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay, r = loc.maximize().region ?? '';
    return first ? first % 7 : /^(EG|IR|AF|SY)$/.test(r) ? 6 : /^(US|CA|MX|JP|KR|TW|HK|BR|PT|IL|SA|TH|PH|IN|ZA)$/.test(r) ? 0 : 1;
};
export const getLocaleDateFormat = (locale = DEFAULT_LOCALE) => dtf(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(3333, 10, 22))
    .replace('3333', 'YYYY')
    .replace('11', 'MM')
    .replace('22', 'DD')
    .replace(/[\u200e\u200f]|[^MDY]+$/g, '');
export const getMonthNames = (locale = DEFAULT_LOCALE, month = 'long') => {
    const f = dtf(locale, { month });
    return Array.from({ length: 12 }, (_, m) => f.format(new Date(2026, m, 1)));
};
export const getWeekdayNames = (locale = DEFAULT_LOCALE) => {
    const n = dtf(locale, { weekday: 'narrow' }), l = dtf(locale, { weekday: 'long' }), first = getFirstDayOfWeek(locale);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2026, 0, 4 + ((first + i) % 7));
        return { narrow: n.format(d), long: l.format(d) };
    });
};
export const parseDate = (date) => {
    if (!date)
        return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
        return parseInputDate(date, 'YYYY-MM-DD');
    const result = new Date(date);
    if (isNaN(result.getTime()))
        return null;
    result.setHours(0, 0, 0, 0);
    return result;
};
const TOKEN_RE = /(YYYY|MMMM|MMM|YY|MM|DD|M|D)/g;
export const parseInputDate = (text, format, locale = DEFAULT_LOCALE) => {
    const tokens = [];
    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const months = (s) => getMonthNames(locale, s);
    const pattern = format.split(TOKEN_RE).map((part, i) => {
        if (!(i & 1))
            return escape(part);
        tokens.push(part);
        if (part === 'MMMM' || part === 'MMM')
            return '(' + months(part === 'MMMM' ? 'long' : 'short').map(escape).join('|') + ')';
        return part === 'YYYY' ? '(\\d{4})' : part === 'YY' ? '(\\d{2})' : '(\\d{1,2})';
    }).join('');
    const match = new RegExp('^' + pattern + '$', 'i').exec(text.trim());
    if (!match)
        return null;
    let year = 0, month = 0, day = 0;
    tokens.forEach((token, index) => {
        const value = match[index + 1];
        if (token === 'YYYY')
            year = Number(value);
        else if (token === 'YY')
            year = 2000 + Number(value);
        else if (token === 'MMMM' || token === 'MMM')
            month = months(token === 'MMMM' ? 'long' : 'short').findIndex(name => name.toLowerCase() === value.toLowerCase()) + 1;
        else if (token.startsWith('M'))
            month = Number(value);
        else
            day = Number(value);
    });
    const result = new Date(0);
    result.setFullYear(year, month - 1, day);
    result.setHours(0, 0, 0, 0);
    return year >= 1 && result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
};
export const formatDate = (date, format = 'MM/DD/YYYY', locale = DEFAULT_LOCALE) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime()))
        return '';
    const m = date.getMonth() + 1, d = date.getDate(), y = date.getFullYear(), pad = (n, width = 2) => String(n).padStart(width, '0');
    return format.replace(TOKEN_RE, token => token.startsWith('MMM') ? dtf(locale, { month: token.length === 4 ? 'long' : 'short' }).format(date) :
        token.startsWith('M') ? pad(m, token.length) :
            token === 'YYYY' ? pad(y, 4) :
                token === 'YY' ? pad(y).slice(-2) :
                    pad(d, token.length));
};
export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
export const isSameDay = (date1, date2) => date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
export const isDateInRange = (date, startDate, endDate) => date >= startDate && date <= endDate;
export const generateCalendarDates = (year, month, selectedDate = null, rangeEndDate = null, minDate = null, maxDate = null, firstDayOfWeek = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = (new Date(year, month, 1).getDay() - firstDayOfWeek + 7) % 7;
    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(year, month, 1 - firstDay + i);
        const isCurrentMonth = date.getMonth() === month;
        const calendarDate = {
            date,
            day: date.getDate(),
            isCurrentMonth,
            isToday: isSameDay(date, today),
            isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
            isDisabled: Boolean((minDate && date < minDate) || (maxDate && date > maxDate)),
        };
        if (selectedDate && rangeEndDate) {
            calendarDate.isRangeStart = isSameDay(date, selectedDate);
            calendarDate.isRangeEnd = isSameDay(date, rangeEndDate);
            calendarDate.isRangeMiddle = date >= selectedDate && date <= rangeEndDate && !calendarDate.isRangeStart && !calendarDate.isRangeEnd;
        }
        return calendarDate;
    });
};
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
export const addMonths = (date, months) => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    result.setDate(Math.min(day, getDaysInMonth(result.getFullYear(), result.getMonth())));
    return result;
};
export const addYears = (date, years) => {
    return addMonths(date, years * 12);
};
const isoDate = (date) => (date ? formatDate(date, "YYYY-MM-DD") : "");
export const toIsoValue = (value, end) => Array.isArray(value) ? `${isoDate(value[0])}/${isoDate(value[1])}` : value && end ? `${isoDate(value)}/${isoDate(end)}` : isoDate(value);
