import {Values} from '../bar-enhanced@mrvanguardia/vitals/values.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

// Capture the formatter arguments so this tests the unit conversion directly,
// independent of the Shell's String.format initialization.
String.prototype.format = function (value, unit) {
    return `${value}|${unit}`;
};

const settings = {
    get_boolean: () => false,
    get_int: key => key === 'memory-measurement' ? 1 : 0,
};
const values = new Values(settings, {});
const decimal = values._legible(1024, 'memory');
assert(decimal === '1.048576|MB',
    `1024 KiB must be 1.048576 MB in decimal mode, got ${decimal}`);

settings.get_int = () => 0;
const binary = values._legible(1024, 'memory');
assert(binary === '1|MiB',
    `1024 KiB must be exactly 1 MiB in binary mode, got ${binary}`);

print('Vitals value conversion tests passed.');
