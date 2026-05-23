import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildToolsTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Tools') : 'Tools',
        icon_name: 'build-alt-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.tools');

    const group = new Adw.PreferencesGroup({ title: T ? T('Default Shell Theme') : 'Default Shell Theme' });
    page.add(group);

    const tweaksRow = new Adw.SwitchRow({ title: T ? T('Include Top Bar Tweaks') : 'Include Top Bar Tweaks' });
    settings.bind('top-bar-tweaks', tweaksRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(tweaksRow);

    const extractRow = new Adw.ActionRow({ title: T ? T('Extract default shell theme') : 'Extract default shell theme' });
    const extractBtn = new Gtk.Button({
        label: T ? T('Extract') : 'Extract',
        valign: Gtk.Align.CENTER
    });
    extractRow.add_suffix(extractBtn);
    extractRow.activatable_widget = extractBtn;
    group.add(extractRow);

    // Wire extract button
    extractBtn.connect('clicked', () => {
        try {
            let script = `#!/bin/bash
# Extracts default shell theme resource
DIR="/tmp/default-theme"
mkdir -p "$DIR"
gresource extract /usr/share/gnome-shell/gnome-shell-theme.gresource /org/gnome/shell/theme/gnome-shell.css "$DIR/gnome-shell.css" &>/dev/null
echo "Theme extracted successfully to $DIR"
`;
            let file = Gio.File.new_for_path('/tmp/gdm-extract.sh');
            try { file.delete(null); } catch(e) {}
            let outStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
            let dataStream = new Gio.DataOutputStream({ base_stream: outStream });
            dataStream.put_string(script, null);
            dataStream.close(null);
            
            file.set_attribute_uint32('unix::mode', 0o755, Gio.FileQueryInfoFlags.NONE, null);
            
            let proc = Gio.Subprocess.new(
                ['bash', '/tmp/gdm-extract.sh'],
                Gio.SubprocessFlags.NONE
            );
            
            let toast = new Adw.Toast({ title: T ? T('Extracting default theme...') : 'Extracting default theme...' });
            if (page.get_root() && page.get_root().add_toast) {
                page.get_root().add_toast(toast);
            }
            
            proc.wait_async(null, (p, res) => {
                try {
                    p.wait_finish(res);
                    let successToast = new Adw.Toast({ title: T ? T('Theme extracted to /tmp/default-theme!') : 'Theme extracted to /tmp/default-theme!' });
                    if (page.get_root() && page.get_root().add_toast) page.get_root().add_toast(successToast);
                } catch(e) {
                    let errToast = new Adw.Toast({ title: T ? T('Extraction failed.') : 'Extraction failed.' });
                    if (page.get_root() && page.get_root().add_toast) page.get_root().add_toast(errToast);
                }
            });
        } catch(e) {
            console.error(e);
        }
    });

    // System Maintenance
    const maintenanceGroup = new Adw.PreferencesGroup({ title: T ? T('System Maintenance') : 'System Maintenance' });
    page.add(maintenanceGroup);

    const restoreRow = new Adw.ActionRow({
        title: T ? T('Restore GDM to Default') : 'Restore GDM to Default',
        subtitle: T ? T('Revert all customized GDM settings and styles back to the system default.') : 'Revert all customized GDM settings and styles back to the system default.'
    });
    const restoreBtn = new Gtk.Button({
        label: T ? T('Restore') : 'Restore',
        valign: Gtk.Align.CENTER,
        css_classes: ['destructive-action']
    });
    restoreRow.add_suffix(restoreBtn);
    restoreRow.activatable_widget = restoreBtn;
    maintenanceGroup.add(restoreRow);

    page._restoreBtn = restoreBtn;

    return page;
}
