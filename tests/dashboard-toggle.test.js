// Verify the actual visibility method without needing a graphical Shell session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../bar-enhanced@mrvanguardia/extension.js'), 'utf8');
const start = source.indexOf('    _updateDashboardVisibility() {');
const end = source.indexOf('\n    }\n\n}', start);
assert(start >= 0 && end > start, 'dashboard visibility method is present');

let created = 0;
let destroyed = 0;
let added = 0;
class Dashboard {
    constructor(extension) {
        assert(extension);
        created++;
    }
    destroy() { destroyed++; }
}
const Main = { panel: { addToStatusArea: (name, actor, priority, side) => {
    assert.equal(name, 'bar-enhanced-dashboard');
    assert(actor instanceof Dashboard);
    assert.equal(priority, 0);
    assert.equal(side, 'right');
    added++;
} } };
const Core = new Function('Main', 'BarEnhancedDashboard',
    `return class Core { ${source.slice(start, end + '\n    }'.length)} }`)(Main, Dashboard);
let visible = true;
const core = new Core();
core._settings = { get_boolean: key => {
    assert.equal(key, 'show-dashboard');
    return visible;
} };
core.dashboardBtn = null;

core._updateDashboardVisibility();
core._updateDashboardVisibility();
assert.equal(created, 1, 'repeated enable must not duplicate the button');
assert.equal(added, 1);
visible = false;
core._updateDashboardVisibility();
core._updateDashboardVisibility();
assert.equal(destroyed, 1, 'turning off must destroy the existing button once');
assert.equal(core.dashboardBtn, null);
visible = true;
core._updateDashboardVisibility();
assert.equal(created, 2, 'turning back on must recreate the button');
assert.equal(added, 2);

console.log('Dashboard toggle tests passed: create, hide, idempotency, recreate.');
