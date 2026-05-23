import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildNightLightTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Night Light') : 'Night Light',
        icon_name: 'display-brightness-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.night-light');

    const group = new Adw.PreferencesGroup({ title: T ? T('Night Light Preferences') : 'Night Light Preferences' });
    page.add(group);

    // Enable Night Light
    const enableRow = new Adw.SwitchRow({ title: T ? T('Enable Night Light') : 'Enable Night Light' });
    settings.bind('enabled', enableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    group.add(enableRow);

    // Temperature (K)
    const tempScale = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: new Gtk.Adjustment({ lower: 1000, upper: 10000, step_increment: 100, page_increment: 500 }),
        valign: Gtk.Align.CENTER,
        hexpand: true,
        draw_value: true
    });
    tempScale.set_size_request(150, -1);
    const tempRow = new Adw.ActionRow({
        title: T ? T('Color Temperature (K)') : 'Color Temperature (K)',
        activatable_widget: tempScale
    });
    tempRow.add_suffix(tempScale);
    settings.bind('temperature', tempScale.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);
    enableRow.bind_property('active', tempRow, 'sensitive', 0);
    group.add(tempRow);

    // Schedule Automatic
    const autoScheduleRow = new Adw.SwitchRow({ title: T ? T('Schedule Automatic') : 'Schedule Automatic' });
    settings.bind('schedule-automatic', autoScheduleRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    enableRow.bind_property('active', autoScheduleRow, 'sensitive', 0);
    group.add(autoScheduleRow);

    // Start Hour
    const startHourBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 23, step_increment: 1, page_increment: 4 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const startHourRow = new Adw.ActionRow({
        title: T ? T('Start Hour (0-23)') : 'Start Hour (0-23)',
        activatable_widget: startHourBtn
    });
    startHourRow.add_suffix(startHourBtn);
    settings.bind('start-hour', startHourBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    
    // End Hour
    const endHourBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 23, step_increment: 1, page_increment: 4 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const endHourRow = new Adw.ActionRow({
        title: T ? T('End Hour (0-23)') : 'End Hour (0-23)',
        activatable_widget: endHourBtn
    });
    endHourRow.add_suffix(endHourBtn);
    settings.bind('end-hour', endHourBtn, 'value', Gio.SettingsBindFlags.DEFAULT);

    const updateScheduleVisibilities = () => {
        let isEnabled = enableRow.active;
        let isAuto = autoScheduleRow.active;
        startHourRow.visible = (isEnabled && !isAuto);
        endHourRow.visible = (isEnabled && !isAuto);
    };

    enableRow.connect('notify::active', updateScheduleVisibilities);
    autoScheduleRow.connect('notify::active', updateScheduleVisibilities);
    updateScheduleVisibilities();

    group.add(startHourRow);
    group.add(endHourRow);

    return page;
}
