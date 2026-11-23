/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
export function signum(num) {
    if (num < 0) {
        return -1;
    }
    else if (num === 0) {
        return 0;
    }
    else {
        return 1;
    }
}
export function lerp(start, stop, amount) {
    return (1.0 - amount) * start + amount * stop;
}
export function clampInt(min, max, input) {
    if (input < min) {
        return min;
    }
    else if (input > max) {
        return max;
    }
    return input;
}
export function clampDouble(min, max, input) {
    if (input < min) {
        return min;
    }
    else if (input > max) {
        return max;
    }
    return input;
}
export function sanitizeDegreesInt(degrees) {
    degrees = degrees % 360;
    if (degrees < 0) {
        degrees = degrees + 360;
    }
    return degrees;
}
export function sanitizeDegreesDouble(degrees) {
    degrees = degrees % 360.0;
    if (degrees < 0) {
        degrees = degrees + 360.0;
    }
    return degrees;
}
export function rotationDirection(from, to) {
    const increasingDifference = sanitizeDegreesDouble(to - from);
    return increasingDifference <= 180.0 ? 1.0 : -1.0;
}
export function differenceDegrees(a, b) {
    return 180.0 - Math.abs(Math.abs(a - b) - 180.0);
}
export function matrixMultiply(row, matrix) {
    const a = row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2];
    const b = row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2];
    const c = row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2];
    return [a, b, c];
}
