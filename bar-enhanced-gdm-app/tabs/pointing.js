import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildPointingTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Pointing & Touchpad') : 'Pointing & Touchpad',
        icon_name: 'input-mouse-symbolic'
    });

    const mouseSettings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.mouse');
    const touchSettings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.touchpad');
    const pointingSettings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.pointing');

    // Mouse
    const mouseGroup = new Adw.PreferencesGroup({ title: T ? T('Mouse') : 'Mouse' });
    page.add(mouseGroup);

    const accelOptions = ['default', 'flat', 'adaptive'];
    const accelModel = Gtk.StringList.new(accelOptions);
    const accelRow = new Adw.ComboRow({
        title: T ? T('Pointer Acceleration') : 'Pointer Acceleration',
        model: accelModel
    });
    let activeAccel = mouseSettings.get_string('pointer-acceleration') || 'default';
    let accelIdx = accelOptions.indexOf(activeAccel);
    if (accelIdx !== -1) accelRow.selected = accelIdx;
    accelRow.connect('notify::selected', () => {
        mouseSettings.set_string('pointer-acceleration', accelOptions[accelRow.selected]);
    });
    mouseGroup.add(accelRow);

    const mouseSpeedBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: -1.0, upper: 1.0, step_increment: 0.1, page_increment: 0.2 }),
        valign: Gtk.Align.CENTER,
        digits: 2
    });
    const mouseSpeedRow = new Adw.ActionRow({
        title: T ? T('Pointer Speed') : 'Pointer Speed',
        activatable_widget: mouseSpeedBtn
    });
    mouseSpeedRow.add_suffix(mouseSpeedBtn);
    mouseSettings.bind('speed', mouseSpeedBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    mouseGroup.add(mouseSpeedRow);

    const mouseNaturalRow = new Adw.SwitchRow({ title: T ? T('Natural Scrolling') : 'Natural Scrolling' });
    mouseSettings.bind('natural-scrolling', mouseNaturalRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    mouseGroup.add(mouseNaturalRow);

    // Touchpad
    const touchGroup = new Adw.PreferencesGroup({ title: T ? T('Touchpad') : 'Touchpad' });
    page.add(touchGroup);

    const touchEnableRow = new Adw.SwitchRow({ title: T ? T('Enable Touchpad') : 'Enable Touchpad' });
    touchSettings.bind('enable', touchEnableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(touchEnableRow);

    const touchDisableMouseRow = new Adw.SwitchRow({ title: T ? T('Disable While Mouse Attached') : 'Disable While Mouse Attached' });
    touchSettings.bind('disable-on-external-mouse', touchDisableMouseRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(touchDisableMouseRow);

    const touchDisableTypingRow = new Adw.SwitchRow({ title: T ? T('Disable While Typing') : 'Disable While Typing' });
    touchSettings.bind('disable-while-typing', touchDisableTypingRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(touchDisableTypingRow);

    const tapClickRow = new Adw.SwitchRow({ title: T ? T('Tap to Click') : 'Tap to Click' });
    touchSettings.bind('tap-to-click', tapClickRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(tapClickRow);

    const touchNaturalRow = new Adw.SwitchRow({ title: T ? T('Natural Scrolling') : 'Natural Scrolling' });
    touchSettings.bind('natural-scrolling', touchNaturalRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(touchNaturalRow);

    const twoFingerRow = new Adw.SwitchRow({ title: T ? T('Two-finger Scrolling') : 'Two-finger Scrolling' });
    touchSettings.bind('two-finger-scrolling', twoFingerRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(twoFingerRow);

    const touchSpeedBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: -1.0, upper: 1.0, step_increment: 0.1, page_increment: 0.2 }),
        valign: Gtk.Align.CENTER,
        digits: 2
    });
    const touchSpeedRow = new Adw.ActionRow({
        title: T ? T('Pointer Speed') : 'Pointer Speed',
        activatable_widget: touchSpeedBtn
    });
    touchSpeedRow.add_suffix(touchSpeedBtn);
    touchSettings.bind('speed', touchSpeedBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    touchGroup.add(touchSpeedRow);

    // General Pointing
    const generalGroup = new Adw.PreferencesGroup({ title: T ? T('General') : 'General' });
    page.add(generalGroup);

    const cursorSizeBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 16, upper: 128, step_increment: 1, page_increment: 8 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const cursorSizeRow = new Adw.ActionRow({
        title: T ? T('Cursor Size') : 'Cursor Size',
        activatable_widget: cursorSizeBtn
    });
    cursorSizeRow.add_suffix(cursorSizeBtn);
    pointingSettings.bind('cursor-size', cursorSizeBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(cursorSizeRow);

    return page;
}
