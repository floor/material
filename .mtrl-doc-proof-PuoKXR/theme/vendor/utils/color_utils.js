/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import * as mathUtils from "./math_utils.js";
const SRGB_TO_XYZ = [
    [0.41233895, 0.35762064, 0.18051042],
    [0.2126, 0.7152, 0.0722],
    [0.01932141, 0.11916382, 0.95034478],
];
const XYZ_TO_SRGB = [
    [
        3.2413774792388685,
        -1.5376652402851851,
        -0.49885366846268053,
    ],
    [
        -0.9691452513005321,
        1.8758853451067872,
        0.04156585616912061,
    ],
    [
        0.05562093689691305,
        -0.20395524564742123,
        1.0571799111220335,
    ],
];
const WHITE_POINT_D65 = [95.047, 100.0, 108.883];
export function argbFromRgb(red, green, blue) {
    return (255 << 24 | (red & 255) << 16 | (green & 255) << 8 | blue & 255) >>>
        0;
}
export function argbFromLinrgb(linrgb) {
    const r = delinearized(linrgb[0]);
    const g = delinearized(linrgb[1]);
    const b = delinearized(linrgb[2]);
    return argbFromRgb(r, g, b);
}
export function alphaFromArgb(argb) {
    return argb >> 24 & 255;
}
export function redFromArgb(argb) {
    return argb >> 16 & 255;
}
export function greenFromArgb(argb) {
    return argb >> 8 & 255;
}
export function blueFromArgb(argb) {
    return argb & 255;
}
export function isOpaque(argb) {
    return alphaFromArgb(argb) >= 255;
}
export function argbFromXyz(x, y, z) {
    const matrix = XYZ_TO_SRGB;
    const linearR = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z;
    const linearG = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z;
    const linearB = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z;
    const r = delinearized(linearR);
    const g = delinearized(linearG);
    const b = delinearized(linearB);
    return argbFromRgb(r, g, b);
}
export function xyzFromArgb(argb) {
    const r = linearized(redFromArgb(argb));
    const g = linearized(greenFromArgb(argb));
    const b = linearized(blueFromArgb(argb));
    return mathUtils.matrixMultiply([r, g, b], SRGB_TO_XYZ);
}
export function argbFromLab(l, a, b) {
    const whitePoint = WHITE_POINT_D65;
    const fy = (l + 16.0) / 116.0;
    const fx = a / 500.0 + fy;
    const fz = fy - b / 200.0;
    const xNormalized = labInvf(fx);
    const yNormalized = labInvf(fy);
    const zNormalized = labInvf(fz);
    const x = xNormalized * whitePoint[0];
    const y = yNormalized * whitePoint[1];
    const z = zNormalized * whitePoint[2];
    return argbFromXyz(x, y, z);
}
export function labFromArgb(argb) {
    const linearR = linearized(redFromArgb(argb));
    const linearG = linearized(greenFromArgb(argb));
    const linearB = linearized(blueFromArgb(argb));
    const matrix = SRGB_TO_XYZ;
    const x = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
    const y = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
    const z = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;
    const whitePoint = WHITE_POINT_D65;
    const xNormalized = x / whitePoint[0];
    const yNormalized = y / whitePoint[1];
    const zNormalized = z / whitePoint[2];
    const fx = labF(xNormalized);
    const fy = labF(yNormalized);
    const fz = labF(zNormalized);
    const l = 116.0 * fy - 16;
    const a = 500.0 * (fx - fy);
    const b = 200.0 * (fy - fz);
    return [l, a, b];
}
export function argbFromLstar(lstar) {
    const y = yFromLstar(lstar);
    const component = delinearized(y);
    return argbFromRgb(component, component, component);
}
export function lstarFromArgb(argb) {
    const y = xyzFromArgb(argb)[1];
    return 116.0 * labF(y / 100.0) - 16.0;
}
export function yFromLstar(lstar) {
    return 100.0 * labInvf((lstar + 16.0) / 116.0);
}
export function lstarFromY(y) {
    return labF(y / 100.0) * 116.0 - 16.0;
}
export function linearized(rgbComponent) {
    const normalized = rgbComponent / 255.0;
    if (normalized <= 0.040449936) {
        return normalized / 12.92 * 100.0;
    }
    else {
        return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
    }
}
export function delinearized(rgbComponent) {
    const normalized = rgbComponent / 100.0;
    let delinearized = 0.0;
    if (normalized <= 0.0031308) {
        delinearized = normalized * 12.92;
    }
    else {
        delinearized = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
    }
    return mathUtils.clampInt(0, 255, Math.round(delinearized * 255.0));
}
export function whitePointD65() {
    return WHITE_POINT_D65;
}
function labF(t) {
    const e = 216.0 / 24389.0;
    const kappa = 24389.0 / 27.0;
    if (t > e) {
        return Math.pow(t, 1.0 / 3.0);
    }
    else {
        return (kappa * t + 16) / 116;
    }
}
function labInvf(ft) {
    const e = 216.0 / 24389.0;
    const kappa = 24389.0 / 27.0;
    const ft3 = ft * ft * ft;
    if (ft3 > e) {
        return ft3;
    }
    else {
        return (116 * ft - 16) / kappa;
    }
}
