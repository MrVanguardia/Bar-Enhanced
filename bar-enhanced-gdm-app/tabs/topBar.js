import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';

export function buildTopBarTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Top Bar') : 'Top Bar',
        icon_name: 'view-more-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.top-bar');

    // Panel visuals
    const visualsGroup = new Adw.PreferencesGroup({ title: T ? T('Panel Visuals') : 'Panel Visuals' });
    page.add(visualsGroup);

    const disableArrowsRow = new Adw.SwitchRow({ title: T ? T('Disable Arrows') : 'Disable Arrows' });
    settings.bind('disable-arrows', disableArrowsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    visualsGroup.add(disableArrowsRow);

    const disableCornersRow = new Adw.SwitchRow({ title: T ? T('Disable Rounded Corners') : 'Disable Rounded Corners' });
    settings.bind('disable-rounded-corners', disableCornersRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    visualsGroup.add(disableCornersRow);

    const changeTextRow = new Adw.SwitchRow({ title: T ? T('Change Text Color') : 'Change Text Color' });
    settings.bind('change-text-color', changeTextRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    visualsGroup.add(changeTextRow);

    const textColorBtn = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            title: T ? T('Select Text Color') : 'Select Text Color',
            modal: true
        }),
        valign: Gtk.Align.CENTER
    });
    let initTextColorStr = settings.get_string('text-color');
    let initTextColor = new Gdk.RGBA();
    if (initTextColor.parse(initTextColorStr)) {
        textColorBtn.rgba = initTextColor;
    }
    textColorBtn.connect('notify::rgba', (btn) => {
        settings.set_string('text-color', btn.rgba.to_string());
    });
    settings.connect('changed::text-color', () => {
        let currentVal = settings.get_string('text-color');
        let parsed = new Gdk.RGBA();
        if (parsed.parse(currentVal)) {
            textColorBtn.rgba = parsed;
        }
    });

    const textColorRow = new Adw.ActionRow({
        title: T ? T('Text Color') : 'Text Color',
        activatable_widget: textColorBtn
    });
    textColorRow.add_suffix(textColorBtn);
    changeTextRow.bind_property('active', textColorRow, 'sensitive', 0);
    visualsGroup.add(textColorRow);

    const changeBgRow = new Adw.SwitchRow({ title: T ? T('Change Background Color') : 'Change Background Color' });
    settings.bind('change-background-color', changeBgRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    visualsGroup.add(changeBgRow);

    const bgColorBtn = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            title: T ? T('Select Background Color') : 'Select Background Color',
            modal: true
        }),
        valign: Gtk.Align.CENTER
    });
    let initBgColorStr = settings.get_string('background-color');
    let initBgColor = new Gdk.RGBA();
    if (initBgColor.parse(initBgColorStr)) {
        bgColorBtn.rgba = initBgColor;
    }
    bgColorBtn.connect('notify::rgba', (btn) => {
        settings.set_string('background-color', btn.rgba.to_string());
    });
    settings.connect('changed::background-color', () => {
        let currentVal = settings.get_string('background-color');
        let parsed = new Gdk.RGBA();
        if (parsed.parse(currentVal)) {
            bgColorBtn.rgba = parsed;
        }
    });

    const bgColorRow = new Adw.ActionRow({
        title: T ? T('Background Color') : 'Background Color',
        activatable_widget: bgColorBtn
    });
    bgColorRow.add_suffix(bgColorBtn);
    changeBgRow.bind_property('active', bgColorRow, 'sensitive', 0);
    visualsGroup.add(bgColorRow);

    // Clock and Status
    const statusGroup = new Adw.PreferencesGroup({ title: T ? T('Clock & Status') : 'Clock & Status' });
    page.add(statusGroup);

    const showDateRow = new Adw.SwitchRow({ title: T ? T('Show Date') : 'Show Date' });
    settings.bind('show-date', showDateRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    statusGroup.add(showDateRow);

    const showWeekdayRow = new Adw.SwitchRow({ title: T ? T('Show Weekday') : 'Show Weekday' });
    settings.bind('show-weekday', showWeekdayRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    statusGroup.add(showWeekdayRow);

    const showSecondsRow = new Adw.SwitchRow({ title: T ? T('Show Seconds') : 'Show Seconds' });
    settings.bind('show-seconds', showSecondsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    statusGroup.add(showSecondsRow);

    const formatOptions = ['12h', '24h'];
    const formatModel = Gtk.StringList.new(formatOptions);
    const timeFormatRow = new Adw.ComboRow({
        title: T ? T('Time Format') : 'Time Format',
        model: formatModel
    });
    let activeFormat = settings.get_string('time-format') || '24h';
    let formatIdx = formatOptions.indexOf(activeFormat);
    if (formatIdx !== -1) timeFormatRow.selected = formatIdx;
    timeFormatRow.connect('notify::selected', () => {
        settings.set_string('time-format', formatOptions[timeFormatRow.selected]);
    });
    statusGroup.add(timeFormatRow);

    const showBatteryRow = new Adw.SwitchRow({ title: T ? T('Show Battery Percentage') : 'Show Battery Percentage' });
    settings.bind('show-battery-percentage', showBatteryRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    statusGroup.add(showBatteryRow);

    return page;
}
