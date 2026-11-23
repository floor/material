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
export const getLocaleDateFormat = (locale = DEFAULT_LOCALE) => dtf(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(3333, 10, 22))
    .replace('3333', 'YYYY')
    .replace('11', 'MM')
    .replace('22', 'DD')
    .replace(/[‎‏]|[^MDY]+$/g, '');
export const getMonthNames = (locale = DEFAULT_LOCALE, month = 'long') => {
    const f = dtf(locale, { month });
    return Array.from({ length: 12 }, (_, m) => f.format(new Date(2026, m, 1)));
};
const TOKEN_RE = /(YYYY|MMMM|MMM|YY|MM|DD|M|D)/g;
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
export const isSameDay = (date1, date2) => date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
const isoDate = (date) => (date ? formatDate(date, "YYYY-MM-DD") : "");
export const toIsoValue = (value, end) => Array.isArray(value) ? `${isoDate(value[0])}/${isoDate(value[1])}` : value && end ? `${isoDate(value)}/${isoDate(end)}` : isoDate(value);
