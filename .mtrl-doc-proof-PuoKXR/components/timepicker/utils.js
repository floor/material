import { TIME_PERIOD } from "./types.js";
export const padZero = (num) => {
    return num.toString().padStart(2, "0");
};
export const parseTime = (timeString, _format) => {
    try {
        const parts = timeString.split(":");
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
        if (isNaN(hours) ||
            hours < 0 ||
            hours > 23 ||
            isNaN(minutes) ||
            minutes < 0 ||
            minutes > 59 ||
            isNaN(seconds) ||
            seconds < 0 ||
            seconds > 59) {
            throw new Error("Invalid time format");
        }
        const period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
        return { hours, minutes, seconds, period };
    }
    catch (error) {
        console.error("Error parsing time:", error);
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
        return { hours, minutes, seconds, period };
    }
};
export const convertTo12Hour = (hours24) => {
    const period = hours24 >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
    let hours12 = hours24 % 12;
    if (hours12 === 0) {
        hours12 = 12;
    }
    return { hours: hours12, period };
};
const LAST_SECOND = 24 * 3600 - 1;
const secondsOf = (time) => {
    if (!time)
        return undefined;
    const [h, m, sec = 0] = time.split(":").map(part => parseInt(part, 10));
    if ([h, m, sec].some(Number.isNaN) || h < 0 || h > 23 || m < 0 || m > 59 || sec < 0 || sec > 59)
        return undefined;
    return h * 3600 + m * 60 + sec;
};
export const limitsOf = (minTime, maxTime) => ({
    min: secondsOf(minTime) ?? 0,
    max: secondsOf(maxTime) ?? LAST_SECOND,
});
export const reachable = (limits, from, to = from) => from <= limits.max && to >= limits.min;
export const secondsOfTime = (time) => time.hours * 3600 + time.minutes * 60 + (time.seconds ?? 0);
export const constrainTime = (time, limits, minuteStep = 1, secondStep = 1) => {
    const lastSecond = 59 - (59 % secondStep);
    const split = (total) => [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
    const down = (total) => {
        const [h, m, sec] = split(total);
        return m % minuteStep ? h * 3600 + (m - (m % minuteStep)) * 60 + lastSecond : h * 3600 + m * 60 + sec - (sec % secondStep);
    };
    const up = (total) => {
        const [h, m, sec] = split(total);
        if (m % minuteStep)
            return Math.min(LAST_SECOND, h * 3600 + (m + minuteStep - (m % minuteStep)) * 60);
        const next = sec % secondStep ? sec + secondStep - (sec % secondStep) : sec;
        return next < 60 ? h * 3600 + m * 60 + next : Math.min(LAST_SECOND, h * 3600 + (m + minuteStep) * 60);
    };
    let total = secondsOfTime(time);
    if (total < limits.min)
        total = Math.min(up(limits.min), limits.max);
    else if (total > limits.max)
        total = Math.max(down(limits.max), limits.min);
    else
        return time;
    const [hours, minutes, seconds] = split(total);
    return { hours, minutes, seconds, period: hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM };
};
export const formatFormValue = (timeValue, showSeconds) => {
    const base = `${padZero(timeValue.hours)}:${padZero(timeValue.minutes)}`;
    return showSeconds ? `${base}:${padZero(timeValue.seconds ?? 0)}` : base;
};
