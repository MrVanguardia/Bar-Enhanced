import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GnomeBluetooth from 'gi://GnomeBluetooth?version=3.0';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export var BluetoothBatteryButton = GObject.registerClass({
    GTypeName: 'BarEnhancedBluetoothBatteryButton',
}, class BluetoothBatteryButton extends PanelMenu.Button {
    _init(extensionObject) {
        super._init(0.5, 'Bluetooth Battery');

        this._extensionObject = extensionObject;
        this._settings = extensionObject.getSettings();

        // Container for panel button to stack icon and battery bar vertically
        this.panelBox = new St.BoxLayout({
            vertical: true,
            style_class: 'bar-enhanced-bt-panel-box',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.panelBox);

        // Icon for the panel
        this.icon = new St.Icon({
            icon_name: 'bluetooth-active-symbolic',
            style_class: 'system-status-icon bar-enhanced-bt-icon',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        this.panelBox.add_child(this.icon);

        // Custom battery bar for panel
        this.panelBatteryBarBg = new St.BoxLayout({
            style_class: 'bar-enhanced-bt-panel-bar-bg',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            visible: false
        });
        this.panelBatteryBarFill = new St.BoxLayout({
            style_class: 'bar-enhanced-bt-panel-bar-fill'
        });
        this.panelBatteryBarBg.add_child(this.panelBatteryBarFill);
        this.panelBox.add_child(this.panelBatteryBarBg);

        this.menu.box.add_style_class_name('bar-enhanced-bt-menu');

        // Main container
        this.mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'bar-enhanced-bt-container'
        });
        this.menu.box.add_child(this.mainBox);

        // Header
        let headerBox = new St.BoxLayout({ vertical: false, style_class: 'bar-enhanced-bt-header' });
        let headerLabel = new St.Label({
            text: _('Bluetooth Devices'),
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'bar-enhanced-bt-header-label'
        });
        headerBox.add_child(headerLabel);
        this.mainBox.add_child(headerBox);

        // Devices container
        this.devicesBox = new St.BoxLayout({
            vertical: true,
            style_class: 'bar-enhanced-bt-devices'
        });
        this.mainBox.add_child(this.devicesBox);

        this._deviceSignals = [];

        try {
            this._client = new GnomeBluetooth.Client();
            this._devicesModel = this._client.get_devices();
            if (this._devicesModel) {
                this._itemsChangedId = this._devicesModel.connect('items-changed', () => {
                    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        this._updateDevices();
                        return GLib.SOURCE_REMOVE;
                    });
                });
            }
        } catch (e) {
            console.log('BarEnhanced: Error instantiating GnomeBluetooth Client - ' + e);
        }

        // Backup timer to ensure updates are periodically checked (10 seconds)
        this._backupTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
            this._updateDevices();
            return GLib.SOURCE_CONTINUE;
        });

        // Defer initial device update to avoid clutter mapping/allocation pass issues
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._updateDevices();
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateDevices() {
        // Disconnect previous signals to avoid memory leaks
        if (this._deviceSignals) {
            for (let sig of this._deviceSignals) {
                sig.obj.disconnect(sig.id);
            }
        }
        this._deviceSignals = [];

        if (!this._devicesModel) {
            console.log('BarEnhanced Bluetooth: _devicesModel is not initialized.');
            return;
        }

        let connectedDevices = [];
        let nItems = this._devicesModel.get_n_items();

        for (let i = 0; i < nItems; i++) {
            let dev = this._devicesModel.get_item(i);
            if (!dev) continue;

            // Watch connected, battery-percentage, battery-level and alias properties
            let watchedProps = ['connected', 'battery-percentage', 'battery-level', 'alias'];
            for (let prop of watchedProps) {
                let id = dev.connect('notify::' + prop, () => {
                    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        this._updateDevices();
                        return GLib.SOURCE_REMOVE;
                    });
                });
                this._deviceSignals.push({ obj: dev, id: id });
            }

            if (dev.connected) {
                connectedDevices.push(dev);
            }
        }

        let lowestBattery = null;
        for (let dev of connectedDevices) {
            let battery = dev.battery_percentage !== undefined ? dev.battery_percentage : dev['battery-percentage'];
            if (battery !== undefined && battery !== null && battery >= 0) {
                if (lowestBattery === null || battery < lowestBattery) {
                    lowestBattery = battery;
                }
            }
        }

        if (lowestBattery !== null && lowestBattery >= 0) {
            this.panelBatteryBarBg.visible = true;
            let fillWidth = Math.max(1, Math.round((lowestBattery / 100) * 16));
            this.panelBatteryBarFill.set_style(`width: ${fillWidth}px;`);

            this.panelBatteryBarFill.remove_style_class_name('bar-enhanced-bt-panel-bar-fill-green');
            this.panelBatteryBarFill.remove_style_class_name('bar-enhanced-bt-panel-bar-fill-orange');
            this.panelBatteryBarFill.remove_style_class_name('bar-enhanced-bt-panel-bar-fill-red');

            if (lowestBattery > 50) {
                this.panelBatteryBarFill.add_style_class_name('bar-enhanced-bt-panel-bar-fill-green');
            } else if (lowestBattery > 20) {
                this.panelBatteryBarFill.add_style_class_name('bar-enhanced-bt-panel-bar-fill-orange');
            } else {
                this.panelBatteryBarFill.add_style_class_name('bar-enhanced-bt-panel-bar-fill-red');
            }
        } else {
            this.panelBatteryBarBg.visible = false;
        }

        console.log(`Bar Enhanced Bluetooth: Found ${connectedDevices.length} connected devices.`);

        this.devicesBox.destroy_all_children();

        if (connectedDevices.length === 0) {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this.hide();
                return GLib.SOURCE_REMOVE;
            });
            let noDev = new St.Label({ text: _('No connected devices'), style_class: 'bar-enhanced-bt-empty' });
            this.devicesBox.add_child(noDev);
            return;
        } else {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                this.show();
                return GLib.SOURCE_REMOVE;
            });
        }

        for (let dev of connectedDevices) {
            let name = dev.alias || dev.name || _('Unknown Device');
            let iconName = dev.icon || 'bluetooth-active-symbolic';
            let battery = dev.battery_percentage !== undefined ? dev.battery_percentage : dev['battery-percentage'];
            console.log(`Bar Enhanced Bluetooth Device: ${name}, connected: ${dev.connected}, battery: ${battery}`);

            let itemBox = new St.BoxLayout({
                vertical: false,
                style_class: 'bar-enhanced-bt-device-item'
            });

            // Icon
            let icon = new St.Icon({
                icon_name: iconName,
                style_class: 'bar-enhanced-bt-device-icon'
            });
            itemBox.add_child(icon);

            // Label
            let label = new St.Label({
                text: name,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'bar-enhanced-bt-device-label'
            });
            itemBox.add_child(label);

            // Battery
            if (battery > 0) {
                let batteryBox = new St.BoxLayout({
                    vertical: false,
                    style_class: 'bar-enhanced-bt-battery-box'
                });

                // Custom Progress Bar
                let progressBarContainer = new St.BoxLayout({
                    style_class: 'bar-enhanced-bt-progress-bg',
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: false
                });

                let progressBarFill = new St.BoxLayout({
                    style_class: 'bar-enhanced-bt-progress-fill'
                });
                progressBarFill.set_style(`width: ${Math.max(1, (battery / 100) * 60)}px;`);
                
                progressBarContainer.add_child(progressBarFill);
                batteryBox.add_child(progressBarContainer);

                // Text
                let batteryLabel = new St.Label({
                    text: `${battery}%`,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'bar-enhanced-bt-battery-text'
                });
                batteryBox.add_child(batteryLabel);

                itemBox.add_child(batteryBox);
            }

            this.devicesBox.add_child(itemBox);
        }
    }

    destroy() {
        if (this._backupTimeoutId) {
            GLib.Source.remove(this._backupTimeoutId);
            this._backupTimeoutId = null;
        }
        if (this._deviceSignals) {
            for (let sig of this._deviceSignals) {
                sig.obj.disconnect(sig.id);
            }
            this._deviceSignals = [];
        }
        if (this._devicesModel && this._itemsChangedId) {
            this._devicesModel.disconnect(this._itemsChangedId);
            this._itemsChangedId = null;
        }
        super.destroy();
    }
});
