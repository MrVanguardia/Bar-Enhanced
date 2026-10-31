import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {saveFlatpakOverrides} from '../bar-enhanced@mrvanguardia/stylesheets.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function readEntries(file) {
    const [, bytes] = file.load_contents(null);
    const keyfile = new GLib.KeyFile();
    const data = new TextDecoder().decode(bytes);
    keyfile.load_from_data(data, new TextEncoder().encode(data).length, GLib.KeyFileFlags.NONE);
    return [keyfile, keyfile.get_string('Context', 'filesystems').split(';').filter(Boolean)];
}

const overrideDir = Gio.File.new_for_path(`${GLib.get_user_data_dir()}/flatpak/overrides`);
assert(!overrideDir.query_exists(null), 'test must start with an empty data directory');

// GTK CSS injection was removed, so the extension must never grant Flatpak
// apps access to the GTK config directories any more, even with the legacy
// 'apply-flatpak' setting still true from an older version.
const obar = {_settings: {get_boolean: () => true}};
await saveFlatpakOverrides(obar, 'enable');
assert(!overrideDir.query_exists(null), 'enable must not create a global override');

overrideDir.make_directory_with_parents(null);
const globalFile = overrideDir.get_child('global');
// Non-ASCII content must be parsed completely (load_from_data length is bytes).
globalFile.replace_contents('[Context]\nfilesystems=home;xdg-config/gtk-3.0:ro;\n[Other]\nvalue=café\n',
    null, false, Gio.FileCreateFlags.NONE, null);

await saveFlatpakOverrides(obar, 'enable');
await saveFlatpakOverrides(obar, 'disable');
const [keyfile, entries] = readEntries(globalFile);
assert(entries.join(';') === 'home;xdg-config/gtk-3.0:ro',
    'enable/disable must leave existing user permissions untouched');
assert(keyfile.get_string('Other', 'value') === 'café',
    'unrelated override groups must be preserved');

print('Flatpak override tests passed.');
