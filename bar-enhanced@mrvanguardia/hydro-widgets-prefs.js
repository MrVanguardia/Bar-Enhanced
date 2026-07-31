import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';

export function fillHydroWidgetsPreferences(window, settings, T) {
    const dialog = new Adw.Window({
        title: T('Hydro-Widgets Configuration'),
        transient_for: window,
        modal: true,
        default_width: 800,
        default_height: 600,
        resizable: true
    });

    const mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
    dialog.set_content(mainBox);

    const header = new Adw.HeaderBar();
    mainBox.append(header);

    // Make body scrollable
    const scrolledWindow = new Gtk.ScrolledWindow({
        vexpand: true,
        hexpand: true,
        propagate_natural_height: true
    });
    mainBox.append(scrolledWindow);

    const clamp = new Adw.Clamp({
        maximum_size: 700,
        tightening_threshold: 500
    });
    scrolledWindow.set_child(clamp);

    const list = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_top: 24,
        margin_bottom: 24,
        margin_start: 16,
        margin_end: 16
    });
    clamp.set_child(list);


    // Widget Options
    const settingsGroup = new Adw.PreferencesGroup({ title: T('Widget Options') });
    list.append(settingsGroup);

    const clockRow = new Adw.SwitchRow({ title: T('Enable Clock Widget') });
    settings.bind('hydro-clock-enabled', clockRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingsGroup.add(clockRow);

    const weatherRow = new Adw.SwitchRow({ title: T('Enable Weather Widget') });
    settings.bind('hydro-weather-enabled', weatherRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingsGroup.add(weatherRow);

    const calendarRow = new Adw.SwitchRow({ title: T('Enable Calendar Widget (At a Glance)') });
    settings.bind('hydro-calendar-enabled', calendarRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingsGroup.add(calendarRow);

    const batteryRow = new Adw.SwitchRow({ title: T('Enable Battery Widget') });
    settings.bind('hydro-battery-enabled', batteryRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingsGroup.add(batteryRow);

    const mediaRow = new Adw.SwitchRow({ title: T('Enable Media Player Widget') });
    settings.bind('hydro-media-enabled', mediaRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    settingsGroup.add(mediaRow);

    // Clock Widget Settings Group
    const clockGroup = new Adw.PreferencesGroup({ title: T('Clock Widget Settings') });
    list.append(clockGroup);

    const clockStyleModel = Gtk.StringList.new([T('Analog (Pixel)'), T('Digital'), T('Text Clock'), T('Stacked Digital'), T('Cyberpunk'), T('Pixel 16')]);
    const clockStyleMap = ['analog', 'digital', 'text', 'stacked', 'cyberpunk', 'pixel16'];
    const clockStyleRow = new Adw.ComboRow({ title: T('Clock Style'), model: clockStyleModel });
    let currentClockStyle = settings.get_string('hydro-clock-style');
    clockStyleRow.selected = Math.max(0, clockStyleMap.indexOf(currentClockStyle));
    clockStyleRow.connect('notify::selected', () => {
        settings.set_string('hydro-clock-style', clockStyleMap[clockStyleRow.selected]);
    });
    clockGroup.add(clockStyleRow);

    const clockSizeRow = new Adw.SpinRow({ 
        title: T('Size'), 
        adjustment: new Gtk.Adjustment({ lower: 100, upper: 500, step_increment: 10, page_increment: 50 }) 
    });
    settings.bind('hydro-clock-size', clockSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    clockGroup.add(clockSizeRow);

    const shapeModel = Gtk.StringList.new([T('Squircle'), T('Pill'), T('Circle'), T('Leaf'), T('Scallop')]);
    const shapeMap = ['squircle', 'pill', 'circle', 'leaf', 'scallop'];
    
    const clockShapeRow = new Adw.ComboRow({ title: T('Shape'), model: shapeModel });
    let currentClockShape = settings.get_string('hydro-clock-shape');
    clockShapeRow.selected = Math.max(0, shapeMap.indexOf(currentClockShape));
    clockShapeRow.connect('notify::selected', () => {
        settings.set_string('hydro-clock-shape', shapeMap[clockShapeRow.selected]);
    });
    clockGroup.add(clockShapeRow);

    // Weather Widget Settings Group
    const weatherGroup = new Adw.PreferencesGroup({ title: T('Weather Widget Settings') });
    list.append(weatherGroup);

    const weatherStyleModel = Gtk.StringList.new([T('Simple (Leaf)'), T('Detailed'), T('Minimal'), T('Pixel 16')]);
    const weatherStyleMap = ['simple', 'detailed', 'minimal', 'pixel16'];
    const weatherStyleRow = new Adw.ComboRow({ title: T('Weather Style'), model: weatherStyleModel });
    let currentWeatherStyle = settings.get_string('hydro-weather-style');
    weatherStyleRow.selected = Math.max(0, weatherStyleMap.indexOf(currentWeatherStyle));
    weatherStyleRow.connect('notify::selected', () => {
        settings.set_string('hydro-weather-style', weatherStyleMap[weatherStyleRow.selected]);
    });
    weatherGroup.add(weatherStyleRow);

    const weatherSizeRow = new Adw.SpinRow({ 
        title: T('Size'), 
        adjustment: new Gtk.Adjustment({ lower: 100, upper: 500, step_increment: 10, page_increment: 50 }) 
    });
    settings.bind('hydro-weather-size', weatherSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    weatherGroup.add(weatherSizeRow);

    const weatherShapeRow = new Adw.ComboRow({ title: T('Shape'), model: shapeModel });
    let currentWeatherShape = settings.get_string('hydro-weather-shape');
    weatherShapeRow.selected = Math.max(0, shapeMap.indexOf(currentWeatherShape));
    weatherShapeRow.connect('notify::selected', () => {
        settings.set_string('hydro-weather-shape', shapeMap[weatherShapeRow.selected]);
    });
    weatherGroup.add(weatherShapeRow);

    // Calendar Widget Settings Group
    const calendarGroup = new Adw.PreferencesGroup({ title: T('Calendar Widget Settings') });
    list.append(calendarGroup);

    const calendarSizeRow = new Adw.SpinRow({ 
        title: T('Size'), 
        adjustment: new Gtk.Adjustment({ lower: 100, upper: 500, step_increment: 10, page_increment: 50 }) 
    });
    settings.bind('hydro-calendar-size', calendarSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    calendarGroup.add(calendarSizeRow);

    // Battery Widget Settings Group
    const batteryGroup = new Adw.PreferencesGroup({ title: T('Battery Widget Settings') });
    list.append(batteryGroup);

    const batterySizeRow = new Adw.SpinRow({ 
        title: T('Size'), 
        adjustment: new Gtk.Adjustment({ lower: 100, upper: 500, step_increment: 10, page_increment: 50 }) 
    });
    settings.bind('hydro-battery-size', batterySizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    batteryGroup.add(batterySizeRow);

    // Media Widget Settings Group
    const mediaGroup = new Adw.PreferencesGroup({ title: T('Media Player Widget Settings') });
    list.append(mediaGroup);

    const mediaStyleModel = Gtk.StringList.new([T('Simple (Squircle)'), T('Immersive Vinyl'), T('Poster (Vertical)'), T('Sleek (Soundbar)')]);
    const mediaStyleMap = ['simple', 'vinyl', 'poster', 'sleek'];
    const mediaStyleRow = new Adw.ComboRow({ title: T('Style'), model: mediaStyleModel });
    let currentMediaStyle = settings.get_string('hydro-media-style');
    mediaStyleRow.selected = Math.max(0, mediaStyleMap.indexOf(currentMediaStyle));
    mediaStyleRow.connect('notify::selected', () => {
        settings.set_string('hydro-media-style', mediaStyleMap[mediaStyleRow.selected]);
    });
    mediaGroup.add(mediaStyleRow);

    const mediaSizeRow = new Adw.SpinRow({ 
        title: T('Size'), 
        adjustment: new Gtk.Adjustment({ lower: 100, upper: 500, step_increment: 10, page_increment: 50 }) 
    });
    settings.bind('hydro-media-size', mediaSizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
    mediaGroup.add(mediaSizeRow);

    // Custom Colors Group
    const colorGroup = new Adw.PreferencesGroup({ title: T('Color Overrides') });
    list.append(colorGroup);

    const useCustomRow = new Adw.SwitchRow({ title: T('Use Custom Colors') });
    settings.bind('hydro-use-custom-colors', useCustomRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    colorGroup.add(useCustomRow);

    // Color Pickers Helper
    const addColorRow = (key, title) => {
        const row = new Adw.ActionRow({ title: title });
        const colorBtn = new Gtk.ColorButton({ valign: Gtk.Align.CENTER });
        
        let hex = settings.get_string(key);
        let rgba = new Gdk.RGBA();
        if (rgba.parse(hex)) colorBtn.set_rgba(rgba);

        colorBtn.connect('color-set', () => {
            let newRgba = colorBtn.get_rgba();
            let newHex = newRgba.to_string(); // rgba(r,g,b,a) or #hex
            settings.set_string(key, newHex);
        });
        row.add_suffix(colorBtn);
        colorGroup.add(row);
    };

    addColorRow('hydro-custom-bg', T('Background Color'));
    addColorRow('hydro-custom-fg1', T('Foreground Color'));
    addColorRow('hydro-custom-fg2', T('Accent Color'));

    dialog.present();
}
