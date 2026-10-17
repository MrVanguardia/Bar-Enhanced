import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildFontsTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Fonts') : 'Fonts',
        icon_name: 'preferences-desktop-font-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.fonts');

    const group = new Adw.PreferencesGroup({
        margin_top: 12
    });
    page.add(group);

    // Font Name
    const fontRow = new Adw.EntryRow({
        title: T ? T('Font (e.g. Sans 11)') : 'Font (e.g. Sans 11)',
    });
    settings.bind('font', fontRow, 'text', Gio.SettingsBindFlags.DEFAULT);
    group.add(fontRow);

    // Scaling Factor
    const scalingBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0.5,
            upper: 3.0,
            step_increment: 0.1,
            page_increment: 0.5
        }),
        valign: Gtk.Align.CENTER,
        digits: 2
    });
    const scalingRow = new Adw.ActionRow({
        title: T ? T('Scaling Factor') : 'Scaling Factor',
        activatable_widget: scalingBtn
    });
    scalingRow.add_suffix(scalingBtn);
    settings.bind('scaling-factor', scalingBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    group.add(scalingRow);

    // Antialiasing
    const aaOptions = ['none', 'grayscale', 'rgba'];
    const aaModel = Gtk.StringList.new(aaOptions);
    const aaRow = new Adw.ComboRow({
        title: T ? T('Antialiasing') : 'Antialiasing',
        model: aaModel
    });
    let activeAa = settings.get_string('antialiasing') || 'grayscale';
    let aaIdx = aaOptions.indexOf(activeAa);
    if (aaIdx !== -1) aaRow.selected = aaIdx;
    aaRow.connect('notify::selected', () => {
        settings.set_string('antialiasing', aaOptions[aaRow.selected]);
    });
    group.add(aaRow);

    // Hinting
    const hintingOptions = ['none', 'slight', 'medium', 'full'];
    const hintingModel = Gtk.StringList.new(hintingOptions);
    const hintingRow = new Adw.ComboRow({
        title: T ? T('Hinting') : 'Hinting',
        model: hintingModel
    });
    let activeHinting = settings.get_string('hinting') || 'slight';
    let hintingIdx = hintingOptions.indexOf(activeHinting);
    if (hintingIdx !== -1) hintingRow.selected = hintingIdx;
    hintingRow.connect('notify::selected', () => {
        settings.set_string('hinting', hintingOptions[hintingRow.selected]);
    });
    group.add(hintingRow);

    return page;
}
