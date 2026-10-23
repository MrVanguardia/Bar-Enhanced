import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

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
            const outputDir = GLib.build_filenamev([GLib.get_user_runtime_dir(), 'bar-enhanced-default-theme']);
            const script = 'mkdir -p "$1" && gresource extract '
                + '/usr/share/gnome-shell/gnome-shell-theme.gresource '
                + '/org/gnome/shell/theme/gnome-shell.css "$1/gnome-shell.css"';
            let proc = Gio.Subprocess.new(
                ['bash', '-c', script, 'bar-enhanced-gdm-extract', outputDir],
                Gio.SubprocessFlags.NONE
            );
            
            let toast = new Adw.Toast({ title: T ? T('Extracting default theme...') : 'Extracting default theme...' });
            if (page.get_root() && page.get_root().add_toast) {
                page.get_root().add_toast(toast);
            }
            
            proc.wait_async(null, (p, res) => {
                try {
                    p.wait_finish(res);
                    if (!p.get_successful())
                        throw new Error('gresource extraction failed');
                    let successToast = new Adw.Toast({ title: T ? T('Theme extracted successfully.') : 'Theme extracted successfully.' });
                    if (page.get_root() && page.get_root().add_toast) page.get_root().add_toast(successToast);
                } catch(e) {
                    let errToast = new Adw.Toast({ title: T ? T('Extraction failed.') : 'Extraction failed.' });
                    if (page.get_root() && page.get_root().add_toast) page.get_root().add_toast(errToast);
                }
            });
        } catch(e) {
            console.error('BarEnhanced: GDM tool action failed:', e.message);
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
