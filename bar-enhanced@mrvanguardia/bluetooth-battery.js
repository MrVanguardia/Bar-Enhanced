import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GnomeBluetooth from 'gi://GnomeBluetooth?version=3.0';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

function batteryPercentage(device) {
    const value = device.battery_percentage ?? device['battery-percentage'];
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export var BluetoothBatteryButton = GObject.registerClass({
    GTypeName: 'BarEnhancedBluetoothBatteryButton',
}, class BluetoothBatteryButton extends PanelMenu.Button {
    _init(extensionObject) {
        super._init(0.5, 'Bluetooth Battery');

        this._extensionObject = extensionObject;
        this._settings = extensionObject.getSettings();

        // Container for panel button to stack icon and battery bar vertically
        this.panelBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
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
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'bar-enhanced-bt-container'
        });
        this.menu.box.add_child(this.mainBox);

        // Header
        let headerBox = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, style_class: 'bar-enhanced-bt-header' });
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
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'bar-enhanced-bt-devices'
        });
        this.mainBox.add_child(this.devicesBox);

        this._deviceSignals = [];
        this._destroyed = false;
        this._updateIdleId = null;
        this._visibilityIdleId = null;

        try {
            this._client = new GnomeBluetooth.Client();
            this._devicesModel = this._client.get_devices();
            if (this._devicesModel) {
                this._itemsChangedId = this._devicesModel.connect('items-changed', () => {
                    this._queueDeviceUpdate();
                });
            }
        } catch (e) {
            console.error(`BarEnhanced: unable to initialize the Bluetooth client: ${e.message}`);
        }

        // Defer initial device update to avoid clutter mapping/allocation pass issues
        this._queueDeviceUpdate();
    }

    _queueDeviceUpdate() {
        if (this._destroyed || this._updateIdleId)
            return;
        this._updateIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._updateIdleId = null;
            if (!this._destroyed)
                this._updateDevices();
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateDevices() {
        if (this._destroyed)
            return;
        // Disconnect previous signals to avoid memory leaks
        if (this._deviceSignals) {
            for (let sig of this._deviceSignals) {
                try {
                    sig.obj.disconnect(sig.id);
                } catch (e) {
                    // The device can disappear while an items-changed update is queued.
                }
            }
        }
        this._deviceSignals = [];

        if (!this._devicesModel) {
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
                    this._queueDeviceUpdate();
                });
                this._deviceSignals.push({ obj: dev, id: id });
            }

            if (dev.connected) {
                connectedDevices.push(dev);
            }
        }

        let lowestBattery = null;
        for (let dev of connectedDevices) {
            let battery = batteryPercentage(dev);
            if (battery !== null) {
                if (lowestBattery === null || battery < lowestBattery) {
                    lowestBattery = battery;
                }
            }
        }

        if (lowestBattery !== null && lowestBattery >= 0) {
            this.panelBatteryBarBg.visible = true;
            let fillWidth = Math.round((lowestBattery / 100) * 16);
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

        this.devicesBox.destroy_all_children();

        if (connectedDevices.length === 0) {
            this._queueVisibility(false);
            let noDev = new St.Label({ text: _('No connected devices'), style_class: 'bar-enhanced-bt-empty' });
            this.devicesBox.add_child(noDev);
            return;
        } else {
            this._queueVisibility(true);
        }

        for (let dev of connectedDevices) {
            let name = dev.alias || dev.name || _('Unknown Device');
            let iconName = dev.icon || 'bluetooth-active-symbolic';
            let battery = batteryPercentage(dev);
            let itemBox = new St.BoxLayout({
                orientation: Clutter.Orientation.HORIZONTAL,
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
            if (battery !== null) {
                let batteryBox = new St.BoxLayout({
                    orientation: Clutter.Orientation.HORIZONTAL,
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
                progressBarFill.set_style(`width: ${Math.round((battery / 100) * 60)}px;`);
                
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

    _queueVisibility(visible) {
        if (this._destroyed)
            return;
        if (this._visibilityIdleId) {
            GLib.Source.remove(this._visibilityIdleId);
            this._visibilityIdleId = null;
        }
        this._visibilityIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._visibilityIdleId = null;
            if (!this._destroyed) {
                if (visible)
                    this.show();
                else
                    this.hide();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    destroy() {
        this._destroyed = true;
        if (this._updateIdleId) {
            GLib.Source.remove(this._updateIdleId);
            this._updateIdleId = null;
        }
        if (this._visibilityIdleId) {
            GLib.Source.remove(this._visibilityIdleId);
            this._visibilityIdleId = null;
        }
        if (this._deviceSignals) {
            for (let sig of this._deviceSignals) {
                try {
                    sig.obj.disconnect(sig.id);
                } catch (e) {
                    // A removed Bluetooth device may already have disposed its signals.
                }
            }
            this._deviceSignals = [];
        }
        if (this._devicesModel && this._itemsChangedId) {
            this._devicesModel.disconnect(this._itemsChangedId);
            this._itemsChangedId = null;
        }
        this._devicesModel = null;
        this._client = null;
        this._settings = null;
        this._extensionObject = null;
        super.destroy();
    }
});
