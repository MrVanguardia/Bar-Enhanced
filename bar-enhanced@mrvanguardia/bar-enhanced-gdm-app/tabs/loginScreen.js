import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildLoginScreenTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Login Screen') : 'Login Screen',
        icon_name: 'system-users-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.misc');

    const group = new Adw.PreferencesGroup({
        title: T ? T('Authentication & Welcome') : 'Authentication & Welcome'
    });
    page.add(group);

    // Disable User List
    const disableUserListRow = new Adw.SwitchRow({
        title: T ? T('Disable User List') : 'Disable User List',
        subtitle: T ? T('Require typing username manually') : 'Require typing username manually',
    });
    settings.bind('disable-user-list', disableUserListRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(disableUserListRow);

    // Disable Restart Buttons
    const disableButtonsRow = new Adw.SwitchRow({
        title: T ? T('Disable Power/Restart Buttons') : 'Disable Power/Restart Buttons',
    });
    settings.bind('disable-restart-buttons', disableButtonsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(disableButtonsRow);

    // Welcome Message Enable
    const welcomeEnableRow = new Adw.SwitchRow({
        title: T ? T('Show Welcome Message') : 'Show Welcome Message',
    });
    settings.bind('enable-welcome-message', welcomeEnableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(welcomeEnableRow);

    // Welcome Message Text
    const welcomeTextRow = new Adw.EntryRow({
        title: T ? T('Message Text') : 'Message Text',
    });
    settings.bind('welcome-message', welcomeTextRow, 'text', Gio.SettingsBindFlags.DEFAULT);
    // Bind sensitivity
    welcomeEnableRow.bind_property('active', welcomeTextRow, 'sensitive', 0);
    group.add(welcomeTextRow);

    // Enlarge Welcome Message
    const enlargeWelcomeRow = new Adw.SwitchRow({
        title: T ? T('Enlarge Welcome Message') : 'Enlarge Welcome Message',
    });
    settings.bind('enlarge-welcome-message', enlargeWelcomeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    welcomeEnableRow.bind_property('active', enlargeWelcomeRow, 'sensitive', 0);
    group.add(enlargeWelcomeRow);

    // Enable Fingerprint Authentication
    const fingerprintRow = new Adw.SwitchRow({
        title: T ? T('Enable Fingerprint Authentication') : 'Enable Fingerprint Authentication',
    });
    settings.bind('enable-fingerprint-authentication', fingerprintRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(fingerprintRow);

    // Logo Group
    const logoGroup = new Adw.PreferencesGroup({
        title: T ? T('Logo') : 'Logo'
    });
    page.add(logoGroup);

    // Enable Logo
    const enableLogoRow = new Adw.SwitchRow({
        title: T ? T('Enable Logo') : 'Enable Logo',
    });
    settings.bind('enable-logo', enableLogoRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    logoGroup.add(enableLogoRow);

    // Logo Image Path
    const logoPathRow = new Adw.EntryRow({
        title: T ? T('Logo Image Path') : 'Logo Image Path',
    });
    settings.bind('logo', logoPathRow, 'text', Gio.SettingsBindFlags.DEFAULT);
    enableLogoRow.bind_property('active', logoPathRow, 'sensitive', 0);
    
    const selectLogoBtn = new Gtk.Button({
        label: T ? T('Select Image...') : 'Select Image...',
        valign: Gtk.Align.CENTER,
        css_classes: ['flat']
    });
    selectLogoBtn.connect('clicked', () => {
        const dialog = new Gtk.FileDialog({
            title: T ? T('Select GDM Logo Image') : 'Select GDM Logo Image',
            modal: true
        });
        const filters = new Gio.ListStore({ item_type: Gtk.FileFilter });
        const imgFilter = new Gtk.FileFilter();
        imgFilter.set_name(T ? T('Images') : 'Images');
        imgFilter.add_mime_type('image/*');
        filters.append(imgFilter);
        dialog.set_filters(filters);

        dialog.open(null, null, (d, res) => {
            try {
                let file = d.open_finish(res);
                if (file) {
                    logoPathRow.set_text(file.get_path());
                }
            } catch(e) {}
        });
    });
    logoPathRow.add_suffix(selectLogoBtn);
    enableLogoRow.bind_property('active', selectLogoBtn, 'sensitive', 0);
    
    logoGroup.add(logoPathRow);

    return page;
}
