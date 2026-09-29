// src/components/timepicker/utils.ts

import { TimeValue, TIME_PERIOD, TIME_FORMAT } from "./types";

/**
 * Pads a number with leading zeros to ensure two-digit format
 * @param {number} num - Number to pad
 * @returns {string} Padded number string
 */
export const padZero = (num: number): string => {
  return num.toString().padStart(2, "0");
};

/**
 * Converts a time string to a TimeValue object
 * @param {string} timeString - Time string in 24-hour format (HH:MM or HH:MM:SS)
 * @param {TIME_FORMAT} format - Time format (12h or 24h)
 * @returns {TimeValue} Parsed time value
 */
export const parseTime = (
  timeString: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _format: TIME_FORMAT
): TimeValue => {
  // Note: format parameter is kept for API compatibility but not used in parsing
  try {
    const parts = timeString.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;

    // Validate time components
    if (
      isNaN(hours) ||
      hours < 0 ||
      hours > 23 ||
      isNaN(minutes) ||
      minutes < 0 ||
      minutes > 59 ||
      isNaN(seconds) ||
      seconds < 0 ||
      seconds > 59
    ) {
      throw new Error("Invalid time format");
    }

    // Determine period based on hours (format is kept for API compatibility)
    const period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

    // Note: format parameter is kept for API compatibility but not used in parsing
    // as we always parse the standard 24-hour format string

    return { hours, minutes, seconds, period };
  } catch (error) {
    console.error("Error parsing time:", error);

    // Return current time as fallback
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

    return { hours, minutes, seconds, period };
  }
};

/**
 * Converts 24-hour format to 12-hour format
 * @param {number} hours24 - Hours in 24-hour format (0-23)
 * @returns {object} Object with hours in 12-hour format and period
 */
export const convertTo12Hour = (
  hours24: number
): { hours: number; period: TIME_PERIOD } => {
  const period = hours24 >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
  let hours12 = hours24 % 12;
  if (hours12 === 0) {
    hours12 = 12;
  }

  return { hours: hours12, period };
};

/** The earliest and latest selectable times, in seconds since midnight. */
export interface TimeLimits {
  min: number;
  max: number;
}

const LAST_SECOND = 24 * 3600 - 1;

/** Seconds since midnight of an `HH:MM` or `HH:MM:SS` bound; undefined if absent or invalid. */
const secondsOf = (time: string | undefined): number | undefined => {
  if (!time) return undefined;
  const [h, m, sec = 0] = time.split(":").map(part => parseInt(part, 10));
  if ([h, m, sec].some(Number.isNaN) || h < 0 || h > 23 || m < 0 || m > 59 || sec < 0 || sec > 59) return undefined;
  return h * 3600 + m * 60 + sec;
};

/**
 * The limits `minTime` and `maxTime` set (FLO-281). Missing or invalid bounds
 * leave the day open at that end.
 */
export const limitsOf = (minTime?: string, maxTime?: string): TimeLimits => ({
  min: secondsOf(minTime) ?? 0,
  max: secondsOf(maxTime) ?? LAST_SECOND,
});

/** Whether any moment from `from` to `to` (seconds, inclusive) is within the limits. */
export const reachable = (limits: TimeLimits, from: number, to: number = from): boolean =>
  from <= limits.max && to >= limits.min;

/** Seconds since midnight of a time value. */
export const secondsOfTime = (time: TimeValue): number =>
  time.hours * 3600 + time.minutes * 60 + (time.seconds ?? 0);

/**
 * The nearest selectable time: inside the limits and on the minute and second
 * steps. A time before the earliest moves up to the first step at or after it,
 * one after the latest down to the last step at or before it (FLO-281).
 */
export const constrainTime = (
  time: TimeValue,
  limits: TimeLimits,
  minuteStep = 1,
  secondStep = 1
): TimeValue => {
  const lastSecond = 59 - (59 % secondStep);
  const split = (total: number) => [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  // The last step at or before `total`.
  const down = (total: number): number => {
    const [h, m, sec] = split(total);
    return m % minuteStep ? h * 3600 + (m - (m % minuteStep)) * 60 + lastSecond : h * 3600 + m * 60 + sec - (sec % secondStep);
  };
  // The first step at or after `total`.
  const up = (total: number): number => {
    const [h, m, sec] = split(total);
    if (m % minuteStep) return Math.min(LAST_SECOND, h * 3600 + (m + minuteStep - (m % minuteStep)) * 60);
    const next = sec % secondStep ? sec + secondStep - (sec % secondStep) : sec;
    return next < 60 ? h * 3600 + m * 60 + next : Math.min(LAST_SECOND, h * 3600 + (m + minuteStep) * 60);
  };
  let total = secondsOfTime(time);
  if (total < limits.min) total = Math.min(up(limits.min), limits.max);
  else if (total > limits.max) total = Math.max(down(limits.max), limits.min);
  else return time;
  const [hours, minutes, seconds] = split(total);
  return { hours, minutes, seconds, period: hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM };
};

/**
 * Formats a time for submission in a form: 24-hour `HH:mm`, or `HH:mm:ss`
 * when the picker shows seconds.
 *
 * What a form submits does not change with the picker's 12-hour display, and
 * carries seconds only when the picker shows them (it stores 0 otherwise).
 *
 * @param timeValue - Current time value, whose hours are 24-hour
 * @param showSeconds - Whether the picker shows seconds
 * @returns The value to submit
 */
export const formatFormValue = (
  timeValue: TimeValue,
  showSeconds: boolean
): string => {
  const base = `${padZero(timeValue.hours)}:${padZero(timeValue.minutes)}`;
  return showSeconds ? `${base}:${padZero(timeValue.seconds ?? 0)}` : base;
};
