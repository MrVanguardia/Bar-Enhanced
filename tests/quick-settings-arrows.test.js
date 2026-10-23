const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../bar-enhanced@mrvanguardia');
const source = fs.readFileSync(path.join(root, 'extension.js'), 'utf8');
assert.match(source, /'open-state-changed', \(_menu, isOpen\) => \{/, 'menu open signal uses the GNOME callback arguments');
const start = source.indexOf('    _discoverQuickSettingsArrows() {');
const end = source.indexOf('    // Find the monitor', start);
assert(start >= 0 && end > start, 'Quick Settings arrow discovery is present');

class Label {
    constructor(text) { this.text = text; }
    get_children() { return []; }
}

function actor(classes = [], children = []) {
    const names = new Set(classes);
    const node = {
        has_style_class_name: name => names.has(name),
        add_style_class_name: name => names.add(name),
        remove_style_class_name: name => names.delete(name),
        get_children: () => children,
        get_parent: () => node.parent ?? null,
    };
    for (const child of children) child.parent = node;
    return node;
}

const side = actor(['quick-settings-tile-side-button']);
const legacy = actor(['quick-toggle-arrow']);
const tile = actor(['quick-settings-tile'], [new Label('Wi-Fi'), side]);
const oldTile = actor(['quick-menu-toggle'], [new Label('Bluetooth'), legacy]);
const menu = {box: actor([], [tile, oldTile])};
const registry = {};
const writes = [];
const Main = {panel: {statusArea: {quickSettings: {menu}}}};
const GLib = {Variant: class { constructor(_type, value) { this.value = value; } }};
const Discovery = new Function('Main', 'GLib', 'St',
    `return class Discovery { ${source.slice(start, end)} }`)(Main, GLib, {Label});
const subject = new Discovery();
subject._settings = {
    get_value: () => ({deep_unpack: () => ({...registry})}),
    set_value: (_key, value) => {
        Object.assign(registry, value.value);
        writes.push(value.value);
    },
};

subject._discoverQuickSettingsArrows();
assert.deepEqual(Object.values(registry).sort(), ['Bluetooth', 'Wi-Fi']);
assert.equal(writes.length, 1, 'discovery persists tile names once');
for (const button of [side, legacy]) {
    assert([...subject._quickArrowActors.keys()].includes(button));
    assert.match(subject._quickArrowActors.get(button), /^be-arrow-tile-[a-f0-9]+$/);
}
subject._discoverQuickSettingsArrows();
assert.equal(writes.length, 1, 'unchanged tiles do not rewrite settings');

const prefs = fs.readFileSync(path.join(root, 'prefs.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'stylesheets.js'), 'utf8');
assert(prefs.includes('No arrow buttons detected yet'), 'empty registry explains missing color controls');
assert(prefs.includes("changed::quick-settings-arrow-registry"), 'preferences update when tiles are discovered');
assert(styles.includes('.quick-settings-tile-side-button.be-arrow-${id}'), 'individual CSS targets GNOME 50 side buttons');

console.log('Quick Settings arrow tests passed: GNOME 50 and legacy discovery, persistent registry, preferences and CSS wiring.');
