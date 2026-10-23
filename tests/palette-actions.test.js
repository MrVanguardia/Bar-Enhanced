const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../bar-enhanced@mrvanguardia/prefs.js'), 'utf8');
const start = source.indexOf('    applyExtractedPalette(window, btn) {');
const end = source.indexOf('    async openGdmCustomizerDialog(', start);
assert(start >= 0 && end > start, 'palette preference actions are present');

const scheduled = [];
const GLib = {
    PRIORITY_DEFAULT: 0,
    SOURCE_REMOVE: false,
    timeout_add: (_priority, _delay, callback) => { scheduled.push(callback); return scheduled.length; },
};
const errors = [];
const Prefs = new Function('GLib', 'T', 'console',
    `return class Prefs { ${source.slice(start, end)} }`)(GLib, text => text, {error: (...args) => errors.push(args)});

const values = new Map([
    ['palette1', ['12', '34', '56']],
    ['palette3', ['78', '90', '123']],
    ['mbgcolor', ['0.400', '0.500', '0.600']],
    ['apply-gtk', true],
    ['pause-reload', false],
    ['trigger-reload', false],
]);
const written = [];
const settings = {
    get_strv: key => [...(values.get(key) ?? [])],
    get_boolean: key => values.get(key) ?? false,
    set_strv: (key, value) => { written.push(key); values.set(key, value); },
    set_boolean: (key, value) => { written.push(key); values.set(key, value); },
    reset: key => { written.push(key); values.delete(key); },
};
const button = {
    label: 'Apply',
    get_label() { return this.label; },
    set_label(value) { this.label = value; },
    add_css_class() {},
    remove_css_class() {},
};
const prefs = new Prefs();
prefs._settings = settings;

prefs.applyExtractedPalette(null, button);
assert.deepEqual(values.get('bgcolor'), ['0.047', '0.133', '0.220']);
assert.deepEqual(values.get('bcolor'), ['0.306', '0.353', '0.482']);
assert.equal(values.get('pause-reload'), false);
assert.equal(values.get('trigger-reload'), true);
assert.equal(values.get('apply-gtk'), true, 'bar palette must not alter GTK');
assert.deepEqual(values.get('mbgcolor'), ['0.400', '0.500', '0.600'], 'bar palette must not alter menus');
assert.equal(written.filter(key => !['pause-reload', 'trigger-reload'].includes(key)).length, 12);
assert(written.every(key => !key.startsWith('candy') && !key.includes('accent')));

written.length = 0;
button.label = 'Restore';
prefs.resetBarColorDefaults(null, button);
assert.equal(written.filter(key => !['pause-reload', 'trigger-reload'].includes(key)).length, 12);
assert.equal(values.get('mbgcolor')[0], '0.400');
assert.equal(values.get('apply-gtk'), true);

written.length = 0;
values.set('palette1', ['invalid', '34', '56']);
prefs.applyExtractedPalette(null, button);
assert.deepEqual(written, [], 'invalid palette must not partially apply');
assert.equal(errors.length, 1, 'invalid palette should be reported');

for (const callback of scheduled)
    callback();
console.log('Palette actions tests passed: bar-only apply/reset, GTK/menu isolation, invalid input.');
