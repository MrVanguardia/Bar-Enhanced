import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {saveFlatpakOverrides} from '../bar-enhanced@mrvanguardia/stylesheets.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const overrideDir = Gio.File.new_for_path(`${GLib.get_user_data_dir()}/flatpak/overrides`);
assert(!overrideDir.query_exists(null), 'test must start with an empty data directory');

const state = {enabled: false};
const obar = {_settings: {get_boolean: () => state.enabled}};
await saveFlatpakOverrides(obar, 'disable');
assert(!overrideDir.query_exists(null), 'disabled module must not create a global override');

overrideDir.make_directory_with_parents(null);
const globalFile = overrideDir.get_child('global');
globalFile.replace_contents('[Context]\nfilesystems=home;\n[Other]\nvalue=keep\n',
    null, false, Gio.FileCreateFlags.NONE, null);

state.enabled = true;
await saveFlatpakOverrides(obar, 'enable');
await saveFlatpakOverrides(obar, 'enable');

let [, bytes] = globalFile.load_contents(null);
let data = new TextDecoder().decode(bytes);
let keyfile = new GLib.KeyFile();
keyfile.load_from_data(data, data.length, GLib.KeyFileFlags.NONE);
let entries = keyfile.get_string('Context', 'filesystems').split(';').filter(Boolean);
assert(entries.join(';') === 'home;xdg-config/gtk-3.0:ro;xdg-config/gtk-4.0:ro',
    'enable must add each GTK permission once while preserving existing permissions');
assert(keyfile.get_string('Other', 'value') === 'keep',
    'enable must preserve unrelated override groups');

// Simulate another program changing the same key while this extension is enabled.
keyfile.set_string('Context', 'filesystems', `${entries.join(';')};xdg-documents;`);
globalFile.replace_contents(keyfile.to_data()[0], null, false,
    Gio.FileCreateFlags.NONE, null);

state.enabled = false;
await saveFlatpakOverrides(obar, 'disable');
[, bytes] = globalFile.load_contents(null);
data = new TextDecoder().decode(bytes);
keyfile = new GLib.KeyFile();
keyfile.load_from_data(data, data.length, GLib.KeyFileFlags.NONE);
entries = keyfile.get_string('Context', 'filesystems').split(';').filter(Boolean);
assert(entries.join(';') === 'home;xdg-documents',
    'disable must remove only permissions added by this extension');
assert(keyfile.get_string('Other', 'value') === 'keep',
    'disable must preserve unrelated override groups');

// Permissions already present before a later enable belong to the user.
keyfile.set_string('Context', 'filesystems',
    'home;xdg-config/gtk-3.0:ro;xdg-documents;');
globalFile.replace_contents(keyfile.to_data()[0], null, false,
    Gio.FileCreateFlags.NONE, null);
const laterInstance = {_settings: {get_boolean: () => true}};
await saveFlatpakOverrides(laterInstance, 'enable');
await saveFlatpakOverrides(laterInstance, 'disable');
[, bytes] = globalFile.load_contents(null);
data = new TextDecoder().decode(bytes);
keyfile = new GLib.KeyFile();
keyfile.load_from_data(data, data.length, GLib.KeyFileFlags.NONE);
entries = keyfile.get_string('Context', 'filesystems').split(';').filter(Boolean);
assert(entries.join(';') === 'home;xdg-config/gtk-3.0:ro;xdg-documents',
    'disable must keep a GTK permission that predated this instance');

print('Flatpak override tests passed.');
