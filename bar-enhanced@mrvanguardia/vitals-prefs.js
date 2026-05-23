import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';
import gettext from 'gettext';

// Automated translations for Spanish fallback
const ES_MAP = {
    'Vitals': 'Vitales del Sistema',
    'System hardware monitors': 'Monitores de hardware del sistema',
    'General': 'General',
    'Sensors': 'Sensores',
    'Seconds between updates': 'Segundos entre actualizaciones',
    'Position in panel': 'Posición en el panel',
    'Use higher precision': 'Usar mayor precisión',
    'Alphabetize sensors': 'Alfabetizar sensores',
    'Hide zero values': 'Ocultar valores cero',
    'Use fixed widths in top bar': 'Usar anchos fijos en la barra',
    'Hide icons in top bar': 'Ocultar iconos en la barra',
    'Make the menu centered': 'Centrar menú en el panel',
    'Icon style': 'Estilo de los iconos',
    'Monitor temperature': 'Monitorear temperatura',
    'Temperature unit': 'Unidad de temperatura',
    'Monitor voltage': 'Monitorear voltaje',
    'Monitor fan': 'Monitorear ventilador',
    'Monitor memory': 'Monitorear memoria',
    'Memory measurement': 'Medición de memoria',
    'Monitor processor': 'Monitorear procesador',
    'Include processor static information': 'Incluir información estática de procesador',
    'Monitor system': 'Monitorear sistema',
    'System Monitor command': 'Comando del monitor de sistema',
    'Monitor network': 'Monitorear red',
    'Include public IP address': 'Incluir dirección IP pública',
    'Public IP refresh interval in minutes': 'Intervalo de IP pública (minutos)',
    'Show country flag for public IP': 'Mostrar bandera para IP pública',
    'Network speed format': 'Formato de velocidad de red',
    'Monitor storage': 'Monitorear almacenamiento',
    'Storage path': 'Ruta de almacenamiento',
    'Storage measurement': 'Medición de almacenamiento',
    'Monitor battery': 'Monitorear batería',
    'Battery slot to monitor': 'Puerto de batería a monitorear',
    'Monitor GPU': 'Monitorear GPU',
    'Include GPU static information': 'Incluir información estática de GPU',
    'Original': 'Original',
    'Updated': 'GNOME (Actualizado)',
    'Left': 'Izquierda',
    'Center': 'Centro',
    'Right': 'Derecha',
    'Far Left': 'Extremo Izquierdo',
    'Far Right': 'Extremo Derecho',
    'Bytes': 'Bytes',
    'Bits': 'Bits',
    'Celsius': 'Celsius',
    'Fahrenheit': 'Fahrenheit',
    'Kelvin': 'Kelvin',
    'Decimal (GB/MB)': 'Decimal (GB/MB, base 10)',
    'Binary (GiB/MiB)': 'Binario (GiB/MiB, base 2)',
    '✕  Cerrar': '✕  Cerrar',
    'Motherboard & Sensors Auto-Setup': 'Configuración Automática de Sensores',
    'Installs driver dependencies automatically to enable all hardware readings (fans, voltages, etc.)': 'Instala controladores automáticamente para habilitar todas las lecturas de hardware (ventiladores, voltajes, etc.)',
    'Detect and configure motherboard sensors': 'Detectar y configurar sensores de la placa base',
    'This requires administrative privileges to install packages and load kernel modules.': 'Requiere privilegios de administrador para instalar paquetes y cargar módulos del kernel.',
    'Start Configuration': 'Iniciar Configuración',
    'Configuring...': 'Configurando...',
    'Configuration Completed': 'Configuración Completada',
    'Motherboard sensors configured! Please restart the extension (disable & enable) to start seeing the new readings.': '¡Sensores de la placa base configurados! Por favor deshabilita y vuelve a habilitar la extensión para empezar a ver las lecturas.',
    'Configuration Failed': 'Configuración Fallida',
    'Administrative privileges are required, or the installation script encountered an error.': 'Se requieren privilegios de administrador, o el script de instalación encontró un error.'
};

const locale = GLib.get_language_names()[0];
const T = (text) => {
    if (locale.startsWith('es')) {
        return ES_MAP[text] || GLib.dgettext('vitals', text);
    }
    return GLib.dgettext('vitals', text);
};

// Helper to create an Adw.ComboRow bound to an integer key
function createComboRowInt(settings, key, title, options) {
    const row = new Adw.ComboRow({ title });
    const model = new Gtk.StringList();
    options.forEach(opt => model.append(opt[1]));
    row.set_model(model);
    
    // Set initial selection
    const currentVal = settings.get_int(key);
    const currentIndex = options.findIndex(opt => opt[0] === currentVal);
    if (currentIndex !== -1) {
        row.set_selected(currentIndex);
    }
    
    row.connect('notify::selected', () => {
        const selectedOpt = options[row.get_selected()];
        settings.set_int(key, selectedOpt[0]);
    });
    
    return row;
}

// Helper to create a standard SwitchRow bound to a boolean key
function createSwitchRow(settings, key, title, subtitle = '') {
    const row = new Adw.SwitchRow({ title, subtitle });
    settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
    return row;
}

// Helper to create an ActionRow with a Gtk.SpinButton bound to an integer key
function createSpinRow(settings, key, title, lower, upper, step = 1) {
    const row = new Adw.ActionRow({ title });
    const spin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower, upper, step_increment: step }),
        valign: Gtk.Align.CENTER,
        numeric: true
    });
    settings.bind(key, spin, 'value', Gio.SettingsBindFlags.DEFAULT);
    row.add_suffix(spin);
    return row;
}

// Helper to create an EntryRow bound to a string key
function createEntryRow(settings, key, title) {
    const row = new Adw.EntryRow({ title });
    row.set_text(settings.get_string(key));
    row.connect('changed', () => {
        settings.set_string(key, row.get_text());
    });
    return row;
}

// Helper to create an ExpanderRow with a main switch in its header
function createExpanderRow(settings, key, title, subtitle = '') {
    const row = new Adw.ExpanderRow({ title, subtitle });
    
    const sw = new Gtk.Switch({
        valign: Gtk.Align.CENTER
    });
    settings.bind(key, sw, 'active', Gio.SettingsBindFlags.DEFAULT);
    
    row.add_suffix(sw);
    row.set_enable_expansion(sw.active);
    
    sw.connect('notify::active', () => {
        row.set_enable_expansion(sw.active);
        if (!sw.active) {
            row.set_expanded(false);
        }
    });
    
    return { row, sw };
}

export function fillVitalsPreferences(parentWindow, realExtension) {
    gettext.bindtextdomain('vitals', realExtension.path + '/vitals/locale');
    if (typeof gettext.bind_textdomain_codeset === 'function') {
        gettext.bind_textdomain_codeset('vitals', 'UTF-8');
    }

    const settings = realExtension.getSettings('org.gnome.shell.extensions.vitals');

    const dialog = new Adw.Window({
        title: T('Vitals') + ' - ' + T('Preferences'),
        transient_for: parentWindow,
        modal: true,
        default_width: 680,
        default_height: 580,
        hide_on_close: true
    });

    // Inject custom colors contextually (to match dark preferences window)
    const cssProvider = new Gtk.CssProvider();
    cssProvider.load_from_string(`
        window {
            background-color: @window_bg_color;
        }
        headerbar {
            background-color: @headerbar_bg_color;
            border-bottom: 1px solid @card_border_color;
        }
    `);
    dialog.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

    // Native Adw Headerbar with close button
    const headerBar = new Adw.HeaderBar();
    const closeBtn = new Gtk.Button({
        label: T('✕  Cerrar'),
        css_classes: ['destructive-action', 'pill']
    });
    closeBtn.connect('clicked', () => dialog.destroy());
    headerBar.pack_end(closeBtn);

    const toolbarView = new Adw.ToolbarView();
    toolbarView.add_top_bar(headerBar);

    // Setup pages and groups
    const page = new Adw.PreferencesPage();
    
    // GENERAL GROUP
    const generalGroup = new Adw.PreferencesGroup({
        title: T('General'),
        description: T('System hardware monitors')
    });
    
    generalGroup.add(createSpinRow(settings, 'update-time', T('Seconds between updates'), 1, 60, 1));
    
    generalGroup.add(createComboRowInt(settings, 'position-in-panel', T('Position in panel'), [
        [0, T('Left')],
        [1, T('Center')],
        [2, T('Right')],
        [3, T('Far Left')],
        [4, T('Far Right')]
    ]));
    
    generalGroup.add(createComboRowInt(settings, 'icon-style', T('Icon style'), [
        [0, T('Original')],
        [1, T('Updated')]
    ]));

    generalGroup.add(createSwitchRow(settings, 'use-higher-precision', T('Use higher precision')));
    generalGroup.add(createSwitchRow(settings, 'alphabetize', T('Alphabetize sensors')));
    generalGroup.add(createSwitchRow(settings, 'hide-zeros', T('Hide zero values')));
    generalGroup.add(createSwitchRow(settings, 'fixed-widths', T('Use fixed widths in top bar')));
    generalGroup.add(createSwitchRow(settings, 'hide-icons', T('Hide icons in top bar')));
    generalGroup.add(createSwitchRow(settings, 'menu-centered', T('Make the menu centered')));

    page.add(generalGroup);

    // HARDWARE AUTOCONFIG GROUP
    const autoConfigGroup = new Adw.PreferencesGroup({
        title: T('Motherboard & Sensors Auto-Setup'),
        description: T('Installs driver dependencies automatically to enable all hardware readings (fans, voltages, etc.)')
    });

    const setupActionRow = new Adw.ActionRow({
        title: T('Detect and configure motherboard sensors'),
        subtitle: T('This requires administrative privileges to install packages and load kernel modules.')
    });

    const startBtn = new Gtk.Button({
        label: T('Start Configuration'),
        valign: Gtk.Align.CENTER,
        css_classes: ['suggested-action', 'pill']
    });

    setupActionRow.add_suffix(startBtn);
    autoConfigGroup.add(setupActionRow);
    page.add(autoConfigGroup);

    startBtn.connect('clicked', () => {
        startBtn.set_sensitive(false);
        startBtn.set_label(T('Configuring...'));

        let scriptPath = realExtension.path + '/vitals-setup-sensors.sh';
        
        // Ensure script has execution permissions
        try {
            GLib.chmod(scriptPath, 0o755);
        } catch (e) {
            console.error('BarEnhanced Vitals: Error setting executable permissions on setup script: ' + e);
        }

        try {
            let proc = new Gio.Subprocess({
                argv: ['pkexec', scriptPath],
                flags: Gio.SubprocessFlags.NONE
            });
            proc.init(null);
            proc.wait_async(null, (obj, res) => {
                startBtn.set_sensitive(true);
                startBtn.set_label(T('Start Configuration'));
                try {
                    let success = obj.wait_finish(res);
                    if (success) {
                        let infoDialog = new Gtk.MessageDialog({
                            transient_for: dialog,
                            modal: true,
                            message_type: Gtk.MessageType.INFO,
                            buttons: Gtk.ButtonsType.OK,
                            text: T('Configuration Completed'),
                            secondary_text: T('Motherboard sensors configured! Please restart the extension (disable & enable) to start seeing the new readings.')
                        });
                        infoDialog.connect('response', () => infoDialog.destroy());
                        infoDialog.present();
                    } else {
                        let errorDialog = new Gtk.MessageDialog({
                            transient_for: dialog,
                            modal: true,
                            message_type: Gtk.MessageType.ERROR,
                            buttons: Gtk.ButtonsType.OK,
                            text: T('Configuration Failed'),
                            secondary_text: T('Administrative privileges are required, or the installation script encountered an error.')
                        });
                        errorDialog.connect('response', () => errorDialog.destroy());
                        errorDialog.present();
                    }
                } catch (err) {
                    let errorDialog = new Gtk.MessageDialog({
                        transient_for: dialog,
                        modal: true,
                        message_type: Gtk.MessageType.ERROR,
                        buttons: Gtk.ButtonsType.OK,
                        text: T('Configuration Failed'),
                        secondary_text: err.message
                    });
                    errorDialog.connect('response', () => errorDialog.destroy());
                    errorDialog.present();
                }
            });
        } catch (e) {
            startBtn.set_sensitive(true);
            startBtn.set_label(T('Start Configuration'));
            let errorDialog = new Gtk.MessageDialog({
                transient_for: dialog,
                modal: true,
                message_type: Gtk.MessageType.ERROR,
                buttons: Gtk.ButtonsType.OK,
                text: T('Configuration Failed'),
                secondary_text: e.message
            });
            errorDialog.connect('response', () => errorDialog.destroy());
            errorDialog.present();
        }
    });

    // SENSORS GROUP
    const sensorsGroup = new Adw.PreferencesGroup({
        title: T('Sensors'),
        description: T('Configure individual system sensors')
    });

    // 1. Temperature (Expander)
    const tempExp = createExpanderRow(settings, 'show-temperature', T('Monitor temperature'));
    tempExp.row.add_row(createComboRowInt(settings, 'unit', T('Temperature unit'), [
        [0, T('Celsius')],
        [1, T('Fahrenheit')],
        [2, T('Kelvin')]
    ]));
    sensorsGroup.add(tempExp.row);

    // 2. Voltage (Simple Switch)
    sensorsGroup.add(createSwitchRow(settings, 'show-voltage', T('Monitor voltage')));

    // 3. Fan (Simple Switch)
    sensorsGroup.add(createSwitchRow(settings, 'show-fan', T('Monitor fan')));

    // 4. Memory (Expander)
    const memExp = createExpanderRow(settings, 'show-memory', T('Monitor memory'));
    memExp.row.add_row(createComboRowInt(settings, 'memory-measurement', T('Memory measurement'), [
        [0, T('Decimal (GB/MB)')],
        [1, T('Binary (GiB/MiB)')]
    ]));
    sensorsGroup.add(memExp.row);

    // 5. Processor (Expander)
    const procExp = createExpanderRow(settings, 'show-processor', T('Monitor processor'));
    procExp.row.add_row(createSwitchRow(settings, 'include-static-info', T('Include processor static information')));
    sensorsGroup.add(procExp.row);

    // 6. System (Expander)
    const sysExp = createExpanderRow(settings, 'show-system', T('Monitor system'));
    sysExp.row.add_row(createEntryRow(settings, 'monitor-cmd', T('System Monitor command')));
    sensorsGroup.add(sysExp.row);

    // 7. Network (Expander)
    const netExp = createExpanderRow(settings, 'show-network', T('Monitor network'));
    netExp.row.add_row(createSwitchRow(settings, 'include-public-ip', T('Include public IP address')));
    netExp.row.add_row(createSwitchRow(settings, 'network-public-ip-show-flag', T('Show country flag for public IP')));
    netExp.row.add_row(createSpinRow(settings, 'network-public-ip-interval', T('Public IP refresh interval in minutes'), 15, 1440, 5));
    netExp.row.add_row(createComboRowInt(settings, 'network-speed-format', T('Network speed format'), [
        [0, T('Bytes')],
        [1, T('Bits')]
    ]));
    sensorsGroup.add(netExp.row);

    // 8. Storage (Expander)
    const storeExp = createExpanderRow(settings, 'show-storage', T('Monitor storage'));
    storeExp.row.add_row(createEntryRow(settings, 'storage-path', T('Storage path')));
    storeExp.row.add_row(createComboRowInt(settings, 'storage-measurement', T('Storage measurement'), [
        [0, T('Decimal (GB/MB)')],
        [1, T('Binary (GiB/MiB)')]
    ]));
    sensorsGroup.add(storeExp.row);

    // 9. Battery (Expander)
    const batExp = createExpanderRow(settings, 'show-battery', T('Monitor battery'));
    batExp.row.add_row(createComboRowInt(settings, 'battery-slot', T('Battery slot to monitor'), [
        [0, 'Slot 0'],
        [1, 'Slot 1'],
        [2, 'Slot 2'],
        [3, 'Slot 3'],
        [4, 'Slot 4'],
        [5, 'Slot 5']
    ]));
    sensorsGroup.add(batExp.row);

    // 10. GPU (Expander)
    const gpuExp = createExpanderRow(settings, 'show-gpu', T('Monitor GPU'));
    gpuExp.row.add_row(createSwitchRow(settings, 'include-static-gpu-info', T('Include GPU static information')));
    sensorsGroup.add(gpuExp.row);

    page.add(sensorsGroup);

    toolbarView.set_content(page);
    dialog.set_content(toolbarView);
    dialog.present();
}
