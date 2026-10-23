// Exercise the production focus-glow methods with small Shell actor stubs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../bar-enhanced@mrvanguardia/extension.js'), 'utf8');
const start = source.indexOf('    _onFocusWindowChanged() {');
const end = source.indexOf('    _syncWithPywal() {', start);
assert(start >= 0 && end > start, 'focus glow methods are present');

function actor(initial = '') {
    let style = initial;
    return { get_style: () => style, set_style: value => { style = value; } };
}

const panel = actor('background-color: red;');
const left = actor('padding: 3px;');
const center = actor();
const right = actor();
panel._leftBox = { get_children: () => [left] };
panel._centerBox = { get_children: () => [center] };
panel._rightBox = { get_children: () => [right] };
const Main = { panel };
const display = { focus_window: { get_wm_class: () => 'firefox' } };
const shellGlobal = { display };
const FocusGlow = new Function('Main', 'global', `return class FocusGlow { ${source.slice(start, end)} }`)(Main, shellGlobal);
const state = {
    'focus-glow': true, neon: false, bartype: 'Floating', height: 30,
    vpad: 2, bradius: 20, gradient: false, balpha: 0.8,
    'neon-intensity': 0.42,
};
const subject = new FocusGlow();
subject._focusGlowStyles = new Map();
subject._settings = {
    get_boolean: key => state[key],
    get_string: key => state[key],
    get_int: key => state[key],
    get_double: key => state[key],
};

subject._onFocusWindowChanged();
assert.match(panel.get_style(), /rgba\(255, 122, 0, 0\.42\)/, 'Firefox glows with Neon disabled');
assert.match(panel.get_style(), /background-color: red;/, 'existing inline style survives');
assert.equal(left.get_style(), 'padding: 3px;', 'Floating does not style island buttons');

display.focus_window = { get_wm_class: () => 'UnknownExampleApp' };
subject._onFocusWindowChanged();
assert.match(panel.get_style(), /box-shadow:/, 'unknown apps still get a focus glow');
assert.doesNotMatch(panel.get_style(), /255, 122, 0/, 'focus color changes with app');
assert.equal((panel.get_style().match(/box-shadow:/g) || []).length, 1, 'focus changes do not stack styles');

display.focus_window = null;
subject._onFocusWindowChanged();
assert.equal(panel.get_style(), 'background-color: red;', 'focus loss restores original style');

state.bartype = 'Islands';
display.focus_window = { get_wm_class: () => 'firefox' };
subject._onFocusWindowChanged();
assert.match(left.get_style(), /box-shadow:/, 'Islands styles panel buttons');
assert.equal(panel.get_style(), 'background-color: red;', 'Islands leaves panel style alone');
state['focus-glow'] = false;
subject._onFocusWindowChanged();
assert.equal(left.get_style(), 'padding: 3px;', 'disabling restores button style');
assert.equal(center.get_style(), '');

state['focus-glow'] = true;
subject._onFocusWindowChanged();
left.set_style('color: green;');
subject._resetFocusGlow();
assert.equal(left.get_style(), 'color: green;', 'later style from another extension is preserved');

console.log('Focus glow tests passed: independent toggle, known/unknown apps, style restoration, layouts.');
