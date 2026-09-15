import * as Utils from '../bar-enhanced@mrvanguardia/utils.js';
import { quantize } from '../bar-enhanced@mrvanguardia/quantize.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function assertClose(actual, expected, tolerance, message) {
    assert(Math.abs(actual - expected) <= tolerance,
        `${message}: expected ${expected}, got ${actual}`);
}

const color = [37, 159, 214];
assert(Utils.rgbToHex(12.6, 17.4, 255.9) === '#0d11ff',
    'RGB-to-hex must round interpolated channels deterministically');
assert(Utils.rgbToHex(-1, 300, Number.NaN) === '#00ff00',
    'RGB-to-hex must clamp invalid channels instead of wrapping them');
const roundTrip = Utils.hslToRgb(Utils.rgbToHsl(color));
color.forEach((component, index) =>
    assertClose(roundTrip[index], component, 0.001, 'HSL round-trip must preserve RGB'));

assertClose(Utils.colorDistance2000(color, color), 0, 0.000001,
    'DeltaE2000 of the same color must be zero');
const redBlueDistance = Utils.colorDistance2000([255, 0, 0], [0, 0, 255]);
assert(redBlueDistance > 40,
    'Distinct primary colors must have a meaningful DeltaE2000 distance');
assertClose(redBlueDistance, Utils.colorDistance2000([0, 0, 255], [255, 0, 0]), 0.000001,
    'DeltaE2000 must be symmetric');

const map = quantize([
    [255, 0, 0], [250, 0, 0], [245, 5, 5],
    [0, 0, 255], [5, 5, 245], [0, 10, 250],
], 2);
assert(map && map.palette().length === 2, 'Quantization must produce the requested palette size');

print('Color utility tests passed.');
