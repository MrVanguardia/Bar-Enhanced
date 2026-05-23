import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

export function buildSoundTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Sound') : 'Sound',
        icon_name: 'audio-volume-high-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.sound');

    const group = new Adw.PreferencesGroup({ title: T ? T('Sound Preferences') : 'Sound Preferences' });
    page.add(group);

    // Dynamically list system sound themes
    let soundThemes = ['freedesktop', 'default'];
    try {
        let dir = Gio.File.new_for_path('/usr/share/sounds');
        let enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                let name = info.get_name();
                if (!soundThemes.includes(name)) {
                    soundThemes.push(name);
                }
            }
        }
    } catch (e) {
        log("BarEnhanced: Error reading sound themes:", e);
    }

    const themeModel = Gtk.StringList.new(soundThemes);
    const themeRow = new Adw.ComboRow({
        title: T ? T('Sound Theme') : 'Sound Theme',
        model: themeModel
    });
    let activeTheme = settings.get_string('theme') || 'freedesktop';
    let themeIdx = soundThemes.indexOf(activeTheme);
    if (themeIdx !== -1) themeRow.selected = themeIdx;
    themeRow.connect('notify::selected', () => {
        settings.set_string('theme', soundThemes[themeRow.selected]);
    });
    group.add(themeRow);

    const overAmpRow = new Adw.SwitchRow({ title: T ? T('Over-amplification') : 'Over-amplification' });
    settings.bind('over-amplification', overAmpRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(overAmpRow);

    const eventRow = new Adw.SwitchRow({ title: T ? T('Event Sounds') : 'Event Sounds' });
    settings.bind('event-sounds', eventRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(eventRow);

    const feedbackRow = new Adw.SwitchRow({ title: T ? T('Feedback Sounds') : 'Feedback Sounds' });
    settings.bind('feedback-sounds', feedbackRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(feedbackRow);

    return page;
}
