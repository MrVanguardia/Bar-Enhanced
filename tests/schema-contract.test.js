import Gio from 'gi://Gio';

// Check every Preferences page's literal bindings, not just a small hand-picked
// list. Dynamic keys (such as candy colors) still have dedicated schema tests.
const prefsFile = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent()
    .get_child('bar-enhanced@mrvanguardia').get_child('prefs.js');
const [prefsLoaded, prefsBytes] = prefsFile.load_contents(null);
if (!prefsLoaded)
    throw new Error('Could not read prefs.js for settings contract validation');
const prefsSource = new TextDecoder().decode(prefsBytes);
if (prefsSource.includes("T('Quick Settings: Individual Controls')"))
    throw new Error('Removed individual Quick Settings editor reappeared in Preferences');
if (prefsSource.includes("createSwitchRow('traffic-light'"))
    throw new Error('Removed GTK traffic-light CSS must not be advertised as a working System option');
const pageMarkers = [...prefsSource.matchAll(/new Adw\.PreferencesPage\(\{ title: T\('([^']+)'\)/g)];
const expectedPages = ['Top Bar', 'Efficiency', 'Aesthetics', 'Highlights', 'Borders',
    'Menus', 'Dash & Dock', 'System', 'Apps', 'Admin'];
const coreSchema = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.bar-enhanced'}).settings_schema;
const dockSchema = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.bar-enhanced.dash-to-dock'}).settings_schema;
const notificationSchema = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.notification-icons'}).settings_schema;
for (const pageName of expectedPages) {
    const pageIndex = pageMarkers.findIndex(match => match[1] === pageName);
    if (pageIndex < 0)
        throw new Error(`Preferences page missing: ${pageName}`);
    const start = pageMarkers[pageIndex].index;
    const end = pageMarkers[pageIndex + 1]?.index ?? prefsSource.length;
    const pageSource = prefsSource.slice(start, end);
    const coreKeys = [
        ...[...pageSource.matchAll(/(?:createSwitchRow|createScaleRow|createComboRow|createColorButton|createSwitch)\(\s*'([^']+)'/g)].map(match => match[1]),
        ...[...pageSource.matchAll(/createToggleButton\(\s*'[^']+'\s*,\s*'([^']+)'/g)].map(match => match[1]),
        ...[...pageSource.matchAll(/this\._settings\.bind\(\s*'([^']+)'/g)].map(match => match[1]),
    ];
    for (const key of coreKeys) {
        if (!coreSchema.has_key(key))
            throw new Error(`${pageName}: missing core setting ${key}`);
    }
    if (pageName === 'Dash & Dock') {
        const dockKeys = [
            ...[...pageSource.matchAll(/(?:dockSwitch|dockScale|dockColor|dockEnum)\(\s*'([^']+)'/g)].map(match => match[1]),
            ...[...pageSource.matchAll(/dockSettings\.(?:bind|get_enum|set_enum)\(\s*'([^']+)'/g)].map(match => match[1]),
        ];
        for (const key of dockKeys) {
            if (!dockSchema.has_key(key))
                throw new Error(`${pageName}: missing dock setting ${key}`);
        }
    }
    if (pageName === 'System') {
        for (const match of pageSource.matchAll(/niSettings\.(?:bind|get_int|set_int)\(\s*'([^']+)'/g)) {
            if (!notificationSchema.has_key(match[1]))
                throw new Error(`${pageName}: missing notification setting ${match[1]}`);
        }
    }
}

const requiredSchemas = {
    'org.gnome.shell.extensions.bar-enhanced': [
        'dash-to-dock-enabled', 'music-pill-enabled', 'vitals-enabled',
        'bluetooth-battery-enabled', 'hydro-wallpaper-enabled', 'theme-app-grid',
        'autotheme-active-tile-color', 'slider-handle-color-override',
        'slider-handle-color', 'dock-badge-color',
        'hydro-wallpaper-uri', 'hydro-wallpaper-type', 'reloadstyle',
    ],
    'org.gnome.shell.extensions.bar-enhanced.dash-to-dock': [
        'dock-position', 'dash-max-icon-size', 'intellihide', 'hide-animation',
    ],
    'org.gnome.shell.extensions.dynamic-music-pill': [
        'enable-lyrics', 'player-filter-list', 'playback-history',
    ],
    'org.gnome.shell.extensions.notification-icons': [
        'right-side', 'notification-count', 'icon-size',
    ],
    'org.gnome.shell.extensions.vitals': [
        'hot-sensors', 'update-time', 'position-in-panel',
    ],
    'org.gnome.shell.extensions.bar-enhanced.gdm.appearance': [
        'background-type', 'background-image', 'light-mode',
    ],
    'org.gnome.shell.extensions.bar-enhanced.gdm.misc': [
        'enable-logo', 'logo', 'welcome-message',
    ],
};

for (const [schemaId, keys] of Object.entries(requiredSchemas)) {
    const settings = new Gio.Settings({schema_id: schemaId});
    for (const key of keys) {
        if (!settings.settings_schema.has_key(key))
            throw new Error(`${schemaId} is missing required key ${key}`);
    }
}

const vitalsDefaults = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.vitals'});
if (vitalsDefaults.get_boolean('include-public-ip'))
    throw new Error('Vitals public IP lookup must be opt-in by default');

print('GSettings schema contract tests passed.');
