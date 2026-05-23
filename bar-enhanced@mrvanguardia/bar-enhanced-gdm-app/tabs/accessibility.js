import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildAccessibilityTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Accessibility') : 'Accessibility',
        icon_name: 'preferences-desktop-accessibility-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.accessibility');

    const group = new Adw.PreferencesGroup();
    page.add(group);

    const menuRow = new Adw.SwitchRow({ title: T ? T('Always Show Accessibility Menu') : 'Always Show Accessibility Menu' });
    settings.bind('always-show-accessibility-menu', menuRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(menuRow);

    return page;
}


