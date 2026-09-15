import Gio from 'gi://Gio';

const requiredSchemas = {
    'org.gnome.shell.extensions.bar-enhanced': [
        'dash-to-dock-enabled', 'music-pill-enabled', 'vitals-enabled',
        'bluetooth-battery-enabled', 'hydro-wallpaper-enabled',
        'hydro-wallpaper-uri', 'hydro-wallpaper-type', 'reloadstyle',
    ],
    'org.gnome.shell.extensions.dash-to-dock': [
        'dock-position', 'dash-max-icon-size', 'intellihide',
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

print('GSettings schema contract tests passed.');
