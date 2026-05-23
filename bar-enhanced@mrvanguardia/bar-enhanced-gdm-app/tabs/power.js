import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildPowerTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Power') : 'Power',
        icon_name: 'system-suspend-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.power');

    const generalGroup = new Adw.PreferencesGroup({ title: T ? T('General') : 'General' });
    page.add(generalGroup);

    const pwrOptions = ['suspend', 'nothing', 'interactive'];
    const pwrModel = Gtk.StringList.new(pwrOptions);
    const pwrBtnRow = new Adw.ComboRow({
        title: T ? T('Power Button Action') : 'Power Button Action',
        model: pwrModel
    });
    let activePwr = settings.get_string('power-button-action') || 'suspend';
    let pwrIdx = pwrOptions.indexOf(activePwr);
    if (pwrIdx !== -1) pwrBtnRow.selected = pwrIdx;
    pwrBtnRow.connect('notify::selected', () => {
        settings.set_string('power-button-action', pwrOptions[pwrBtnRow.selected]);
    });
    generalGroup.add(pwrBtnRow);

    const autoSaverRow = new Adw.SwitchRow({ title: T ? T('Auto Power Saver on Low Battery') : 'Auto Power Saver on Low Battery' });
    settings.bind('auto-power-saver', autoSaverRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(autoSaverRow);

    const dimRow = new Adw.SwitchRow({ title: T ? T('Dim Screen on Idle') : 'Dim Screen on Idle' });
    settings.bind('dim-screen', dimRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(dimRow);

    const blankRow = new Adw.SwitchRow({ title: T ? T('Blank Screen') : 'Blank Screen' });
    settings.bind('blank-screen', blankRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    generalGroup.add(blankRow);

    const idleBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 1, upper: 60, step_increment: 1, page_increment: 5 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const idleRow = new Adw.ActionRow({
        title: T ? T('Idle Delay (minutes)') : 'Idle Delay (minutes)',
        activatable_widget: idleBtn
    });
    idleRow.add_suffix(idleBtn);
    settings.bind('idle-delay', idleBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    blankRow.bind_property('active', idleRow, 'sensitive', 0);
    generalGroup.add(idleRow);

    const suspendGroup = new Adw.PreferencesGroup({ title: T ? T('Automatic Suspend') : 'Automatic Suspend' });
    page.add(suspendGroup);

    const suspendAcRow = new Adw.SwitchRow({ title: T ? T('Suspend on AC') : 'Suspend on AC' });
    settings.bind('suspend-on-ac', suspendAcRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    suspendGroup.add(suspendAcRow);

    const suspendAcDelayBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 1, upper: 120, step_increment: 1, page_increment: 10 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const suspendAcDelayRow = new Adw.ActionRow({
        title: T ? T('Suspend Delay (minutes)') : 'Suspend Delay (minutes)',
        activatable_widget: suspendAcDelayBtn
    });
    suspendAcDelayRow.add_suffix(suspendAcDelayBtn);
    settings.bind('suspend-on-ac-delay', suspendAcDelayBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    suspendAcRow.bind_property('active', suspendAcDelayRow, 'sensitive', 0);
    suspendGroup.add(suspendAcDelayRow);

    const suspendBatRow = new Adw.SwitchRow({ title: T ? T('Suspend on Battery') : 'Suspend on Battery' });
    settings.bind('suspend-on-battery', suspendBatRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    suspendGroup.add(suspendBatRow);

    const suspendBatDelayBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 1, upper: 120, step_increment: 1, page_increment: 10 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const suspendBatDelayRow = new Adw.ActionRow({
        title: T ? T('Suspend Delay (minutes)') : 'Suspend Delay (minutes)',
        activatable_widget: suspendBatDelayBtn
    });
    suspendBatDelayRow.add_suffix(suspendBatDelayBtn);
    settings.bind('suspend-on-battery-delay', suspendBatDelayBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    suspendBatRow.bind_property('active', suspendBatDelayRow, 'sensitive', 0);
    suspendGroup.add(suspendBatDelayRow);

    return page;
}
