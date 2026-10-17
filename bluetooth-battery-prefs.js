import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

export function fillBluetoothBatteryPreferences(parentWindow, settings) {
    const dialog = new Adw.Window({
        title: 'Batería Bluetooth',
        transient_for: parentWindow,
        modal: true,
        default_width: 620,
        default_height: 300,
        hide_on_close: true
    });

    // Inject Bar Enhanced style tokens
    const cssProvider = new Gtk.CssProvider();
    cssProvider.load_from_string(`
        window { background-color: @window_bg_color; }
        headerbar { background-color: @headerbar_bg_color; }
    `);
    dialog.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

    // Native headerbar with close button
    const headerBar = new Adw.HeaderBar();
    const closeBtn = new Gtk.Button({
        label: '✕  Cerrar',
        css_classes: ['destructive-action', 'pill']
    });
    closeBtn.connect('clicked', () => dialog.destroy());
    headerBar.pack_end(closeBtn);

    const toolbarView = new Adw.ToolbarView();
    toolbarView.add_top_bar(headerBar);

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
        title: 'Batería Bluetooth',
        description: 'Gestiona el indicador de batería de dispositivos Bluetooth conectados.'
    });

    const enableSwitch = new Adw.SwitchRow({
        title: 'Activar Medidor de Batería Bluetooth',
        subtitle: 'Muestra el porcentaje de batería de los dispositivos Bluetooth conectados en la barra superior.'
    });
    settings.bind('bluetooth-battery-enabled', enableSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    group.add(enableSwitch);
    page.add(group);

    toolbarView.set_content(page);
    dialog.set_content(toolbarView);
    dialog.present();
}
