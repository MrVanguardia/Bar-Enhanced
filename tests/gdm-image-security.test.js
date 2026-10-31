import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {generateDconfScript} from '../bar-enhanced@mrvanguardia/bar-enhanced-gdm-app/apply.js';

const extensionDir = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent()
    .get_child('bar-enhanced@mrvanguardia');
const extension = {
    path: extensionDir.get_path(),
    getSettings: schema_id => new Gio.Settings({schema_id}),
};
const appearance = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.appearance');
appearance.set_string('background-type', 'image');
appearance.set_string('background-image', '/etc/shadow');

const script = generateDconfScript(extension);
if (script.includes('/etc/shadow') || !script.includes('os.O_NOFOLLOW') ||
    !script.includes('os.setuid(uid)') || script.includes('install -Dm644 "$BG_IMG"'))
    throw new Error('GDM script may copy a private file as root');

const process = Gio.Subprocess.new(['bash', '-n'], Gio.SubprocessFlags.STDIN_PIPE);
const [success] = process.communicate_utf8(script, null);
if (!success || !process.get_successful())
    throw new Error('Generated GDM script has invalid shell syntax');

print('GDM image security tests passed.');
