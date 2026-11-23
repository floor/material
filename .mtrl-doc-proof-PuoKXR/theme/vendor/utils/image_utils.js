/*! @license Copyright 2021 Google LLC | Apache-2.0 (see NOTICE) */
import { QuantizerCelebi } from "../quantize/quantizer_celebi.js";
import { Score } from "../score/score.js";
import { argbFromRgb } from "./color_utils.js";
export async function sourceColorFromImage(image) {
    const imageBytes = await new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            reject(new Error('Could not get canvas context'));
            return;
        }
        const loadCallback = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            context.drawImage(image, 0, 0);
            let rect = [0, 0, image.width, image.height];
            const area = image.dataset['area'];
            if (area && /^\d+(\s*,\s*\d+){3}$/.test(area)) {
                rect = area.split(/\s*,\s*/).map(s => {
                    return parseInt(s, 10);
                });
            }
            const [sx, sy, sw, sh] = rect;
            resolve(context.getImageData(sx, sy, sw, sh).data);
        };
        const errorCallback = () => {
            reject(new Error('Image load failed'));
        };
        if (image.complete) {
            loadCallback();
        }
        else {
            image.onload = loadCallback;
            image.onerror = errorCallback;
        }
    });
    return sourceColorFromImageBytes(imageBytes);
}
export function sourceColorFromImageBytes(imageBytes) {
    const pixels = [];
    for (let i = 0; i < imageBytes.length; i += 4) {
        const r = imageBytes[i];
        const g = imageBytes[i + 1];
        const b = imageBytes[i + 2];
        const a = imageBytes[i + 3];
        if (a < 255) {
            continue;
        }
        const argb = argbFromRgb(r, g, b);
        pixels.push(argb);
    }
    const result = QuantizerCelebi.quantize(pixels, 128);
    const ranked = Score.score(result);
    const top = ranked[0];
    return top;
}
