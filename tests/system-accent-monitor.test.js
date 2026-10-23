// The system-accent listener must exist only while its feature is enabled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../bar-enhanced@mrvanguardia/extension.js'), 'utf8');
const start = source.indexOf('    _updateSystemAccentMonitor() {');
const end = source.indexOf('    _syncWithSystemAccent() {', start);
assert(start >= 0 && end > start, 'system-accent monitor method is present');
const Core = new Function(`return class Core { ${source.slice(start, end)} }`)();

let enabled = false;
let connects = 0;
let disconnects = 0;
let reloads = 0;
const core = new Core();
core._settings = { get_boolean: key => {
    assert.equal(key, 'system-accent-sync');
    return enabled;
} };
core._interfaceSettingsId = 0;
core._interfaceSettings = {
    settings_schema: { has_key: key => key === 'accent-color' },
    connect: (signal, callback) => {
        assert.equal(signal, 'changed::accent-color');
        core._onAccentChanged = callback;
        connects++;
        return connects;
    },
    disconnect: id => {
        assert.equal(id, connects);
        disconnects++;
        core._onAccentChanged = null;
    },
};
core._syncWithSystemAccent = () => { reloads++; };

core._updateSystemAccentMonitor();
assert.equal(connects, 0, 'disabled feature must not watch GNOME accent changes');
enabled = true;
core._updateSystemAccentMonitor();
core._updateSystemAccentMonitor();
assert.equal(connects, 1, 'enabled feature must install one listener');
core._onAccentChanged();
assert.equal(reloads, 4, 'GNOME accent change must refresh active feature');
enabled = false;
core._updateSystemAccentMonitor();
assert.equal(disconnects, 1, 'turning feature off must remove listener');
assert.equal(core._interfaceSettingsId, 0);
assert.equal(core._onAccentChanged, null);

console.log('System accent monitor tests passed: opt-in listener, live change, cleanup.');
