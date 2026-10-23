import Gio from 'gi://Gio';
import * as AutoThemes from '../bar-enhanced@mrvanguardia/autothemes.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const settings = new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.bar-enhanced' });
const autoThemeUiKeys = [
    'autotheme-refresh', 'focus-glow', 'pywal-sync', 'system-accent-sync',
    'show-dashboard', 'auto-bgalpha', 'autofg-bar', 'autofg-menu',
    'smbgoverride', 'accent-override', 'autotheme-active-tile-color',
    'accent-color', 'autotheme-dark', 'autotheme-light', 'bgpalette',
    'trigger-autotheme',
];
for (const key of autoThemeUiKeys)
    assert(settings.settings_schema.has_key(key), `Automatic Themes control lacks schema key ${key}`);
let currentMode = 'prefer-dark';
const obar = {
    _settings: settings,
    _intSettings: { get_string: () => currentMode },
};

const colors = [
    [192, 55, 52], [42, 123, 211], [220, 171, 47], [37, 163, 112],
    [151, 72, 185], [40, 86, 149], [231, 116, 64], [67, 172, 184],
    [164, 184, 51], [117, 71, 123], [210, 112, 141], [63, 113, 75],
];
for (let i = 1; i <= 12; i++) {
    settings.set_int(`count${i}`, 120 - i * 4);
    for (const mode of ['dark', 'light'])
        settings.set_strv(`${mode}-palette${i}`, colors[i - 1].map(String));
}

for (const mode of ['dark', 'light']) {
    currentMode = mode === 'dark' ? 'prefer-dark' : 'default';
    for (const theme of ['Color', 'Pastel', 'Dark', 'Light']) {
        settings.set_string(`autotheme-${mode}`, theme);
        settings.set_boolean('pause-reload', false);
        AutoThemes.autoApplyBGPalette(obar, mode);
        assert(!settings.get_boolean('pause-reload'), `${mode}/${theme} left stylesheet reload paused`);
        assert(settings.get_boolean('autotheme-font'), `${mode}/${theme} did not apply`);
        for (const key of ['bgcolor', 'mbgcolor', 'bcolor', 'mscolor']) {
            const rgb = settings.get_strv(`${mode}-${key}`).map(Number);
            assert(rgb.length === 3 && rgb.every(v => Number.isFinite(v) && v >= 0 && v <= 1),
                `${mode}/${theme} produced invalid ${key}: ${rgb}`);
        }
        assert(settings.get_strv('bgcolor').join(',') === settings.get_strv(`${mode}-bgcolor`).join(','),
            `${mode}/${theme} did not update the active bar color`);
    }
}

// These two options are currently full configuration presets rather than
// wallpaper-derived themes. Exercise their own contract separately.
for (const [mode, theme] of [['dark', 'vanguard_gold'], ['light', 'vanguard_silver']]) {
    currentMode = mode === 'dark' ? 'prefer-dark' : 'default';
    settings.set_string(`autotheme-${mode}`, theme);
    AutoThemes.autoApplyBGPalette(obar, mode);
    assert(!settings.get_boolean('pause-reload'), `${theme} left stylesheet reload paused`);
    assert(settings.get_strv('bgcolor').length === 3, `${theme} did not set a bar color`);
}

settings.set_string('autotheme-dark', 'Select Theme');
settings.set_boolean('pause-reload', false);
AutoThemes.autoApplyBGPalette(obar, 'dark');
assert(!settings.get_boolean('pause-reload'), 'Unselected theme left reload paused');

settings.set_string('autotheme-dark', 'Color');
settings.set_boolean('autotheme-active-tile-color', false);
settings.set_strv('mscolor', ['0.1', '0.2', '0.3']);
settings.set_strv('dark-mscolor', ['0.1', '0.2', '0.3']);
currentMode = 'prefer-dark';
AutoThemes.autoApplyBGPalette(obar, 'dark');
assert(settings.get_strv('mscolor').join(',') === '0.1,0.2,0.3',
    'Automatic palette overwrote a manually selected active tile color');

settings.set_boolean('auto-bgalpha', false);
settings.set_double('bgalpha', 0.37);
AutoThemes.applyAutomaticOpacity(obar);
assert(settings.get_double('bgalpha') === 0.37,
    'Disabled automatic opacity changed a manual value');
AutoThemes.autoApplyBGPalette(obar, 'dark');
assert(settings.get_double('bgalpha') === 0.37,
    'Dynamic opacity disabled but automatic theme overwrote opacity');
settings.set_string('bartype', 'Floating');
settings.set_boolean('auto-bgalpha', true);
AutoThemes.applyAutomaticOpacity(obar);
assert(settings.get_double('bgalpha') === 0.95,
    'Enabling automatic opacity did not immediately update the floating bar');
AutoThemes.autoApplyBGPalette(obar, 'dark');
assert(settings.get_double('bgalpha') === 0.95,
    'Dynamic opacity enabled but floating bar opacity was not recalculated');
settings.set_string('bartype', 'Islands');
AutoThemes.applyAutomaticOpacity(obar);
assert(settings.get_double('bgalpha') === 0 && settings.get_double('isalpha') === 0.95,
    'Automatic opacity did not adapt to Islands');

settings.set_boolean('accent-override', true);
settings.set_strv('accent-color', ['0.9', '0.1', '0.2']);
AutoThemes.autoApplyBGPalette(obar, 'dark');
assert(!settings.get_boolean('pause-reload'), 'Manual accent override left reload paused');
assert(settings.get_strv('dark-mscolor').join(',') === '0.1,0.2,0.3',
    'Manual active tile was lost when accent override was enabled');

settings.set_boolean('autotheme-active-tile-color', true);
AutoThemes.autoApplyBGPalette(obar, 'dark');
const appliedAccent = settings.get_strv('mscolor').map(Number);
assert(appliedAccent[0] > 0.8 && appliedAccent[1] < 0.25 && appliedAccent[2] < 0.3,
    `Manual accent override did not influence the active tile: ${appliedAccent}`);

currentMode = 'default';
AutoThemes.onModeChange(obar);
assert(settings.get_strv('bgcolor').join(',') === settings.get_strv('light-bgcolor').join(','),
    'Light mode did not restore its own bar color');
assert(!settings.get_boolean('pause-reload'), 'Mode switch left reload paused');

print('Automatic theme engine tests passed: 8 derived combinations, 2 full presets, opacity, accent, active tile, and mode switch.');
