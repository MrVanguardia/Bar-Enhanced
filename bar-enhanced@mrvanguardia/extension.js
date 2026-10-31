/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Author: MrVanguardia
 * Based on Open Bar by neuromorph
 */

/* exported BarEnhanced */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Meta from 'gi://Meta';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Calendar from 'resource:///org/gnome/shell/ui/calendar.js';
import * as LayoutManager from 'resource:///org/gnome/shell/ui/layout.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Quantize from './quantize.js';
import * as Utils from './utils.js';
import * as AutoThemes from './autothemes.js';
import * as StyleSheets from './stylesheets.js';
import { DockManager } from './dash-to-dock/docking.js';
import { MusicController } from './dynamic-music-pill/controller.js';
import { VitalsMenuButton } from './vitals/extension.js';
import { BluetoothBatteryButton } from './bluetooth-battery.js';
import { HydroWidgetsManager } from './hydro-widgets.js';
import { WallpaperManager } from './wallpaper-manager.js';

const ES_MAP = {
    'Bar Enhanced': 'Bar Enhanced',
    'Premium Customize Center': 'Centro de Control Premium',
    'Top Bar Layouts': 'Diseños de Barra',
    'Engine Controls': 'Controles de Motor',
    'Focus Glow: ON': 'Brillo de Foco: SI',
    'Focus Glow: OFF': 'Brillo de Foco: NO',
    'Pywal Sync: ON': 'Pywal Sinc: SI',
    'Pywal Sync: OFF': 'Pywal Sinc: NO',
    'Immersive Music': 'Modo Inmersivo',
    'Immersive Music: ON': 'Modo Inmersivo: SI',
    'Immersive Music: OFF': 'Modo Inmersivo: NO',
    'Floating': 'Flotante',
    'Islands': 'Islas',
    'Mainland': 'Continental',
    'Trilands': 'Trilands',
    'Bluetooth Devices': 'Dispositivos Bluetooth',
    'No connected devices': 'No hay dispositivos conectados',
    'Unknown Device': 'Dispositivo Desconocido',
    'Enable Bluetooth Battery Meter': 'Activar Medidor de Batería Bluetooth',
    'Show battery percentage of connected devices in the top bar.': 'Muestra el porcentaje de batería de los dispositivos conectados en la barra superior.',
    'Bluetooth Battery Settings': 'Ajustes de Batería Bluetooth',
    'Manage native Bluetooth battery indicator.': 'Administra el indicador nativo de batería Bluetooth.'
};

const T = (text) => {
    try {
        const locale = GLib.get_language_names()[0];
        if (locale && locale.startsWith('es')) {
            return ES_MAP[text] || _(text);
        }
    } catch (e) {
        // fallback
    }
    return _(text);
};

Gio._promisify(Gio.File.prototype, "copy_async", "copy_finish");
Gio._promisify(Gio.File.prototype, 'make_directory_async', 'make_directory_finish');
Gio._promisify(Gio.File.prototype, 'enumerate_children_async', 'enumerate_children_finish');
Gio._promisify(Gio.FileEnumerator.prototype, 'next_files_async', 'next_files_finish');
Gio._promisify(Gio.FileEnumerator.prototype, 'close_async', 'close_finish');

/**
 * Recursively create a directory without using the synchronous Gio helper.
 * Gio.File has no asynchronous recursive-directory API on GNOME 50.
 */
async function ensureDirectoryAsync(directory, cancellable) {
    const parent = directory.get_parent();
    if (parent)
        await ensureDirectoryAsync(parent, cancellable);

    try {
        await directory.make_directory_async(GLib.PRIORITY_LOW, cancellable);
    } catch (e) {
        if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
            throw e;
    }
}

// ConnectManager class to manage connections for events to trigger BarEnhanced style updates
// This class is modified from Floating Panel extension (Thanks Aylur!)
class ConnectManager {
    constructor(list = []) {
        this.connections = [];

        list.forEach(c => {
            let [obj, signal, callback, callback_param] = c;
            this.connect(obj, signal, callback, callback_param);
        });
    }

    connect(obj, signal, callback, callback_param) {
        this.connections.push({
            id: obj.connect(signal, (object, signal_param) => { callback(object, signal, signal_param, callback_param) }),
            obj: obj,
            sig: signal
        });
        // Remove obj on destroy except following that don't have destroy signal
        if (!(obj instanceof Gio.Settings || obj instanceof LayoutManager.LayoutManager || obj instanceof Meta.WorkspaceManager || obj instanceof Meta.Display)) {
            let destroyId = obj.connect('destroy', () => {
                this.removeObject(obj);
            });
            this.connections[this.connections.length - 1].destroyId = destroyId;
        }
    }

    // remove an object WITHOUT disconnecting it, use only when you know the object is destroyed
    removeObject(object) {
        this.connections = this.connections.filter(c => {
            if (c.obj === object) {
                // We don't disconnect c.id here because we only call this when it's destroyed,
                // but we should clear it just in case.
                return false;
            }
            return true;
        });
    }

    disconnect(object, signal) {
        let disconnections = this.connections.filter(c => c.obj == object && c.sig == signal);
        disconnections.forEach(c => {
            if (c.obj && c.id > 0) c.obj.disconnect(c.id);
            if (c.obj && c.destroyId > 0) c.obj.disconnect(c.destroyId);
        });
        this.connections = this.connections.filter(c => c.obj != object || c.sig != signal);
    }

    disconnectAll() {
        this.connections.forEach(c => {
            if (c.obj && c.id > 0) c.obj.disconnect(c.id);
            if (c.obj && c.destroyId > 0) {
                try { c.obj.disconnect(c.destroyId); } catch(e) {}
            }
        });
        this.connections = [];
    }
}


const BarEnhancedDashboard = GObject.registerClass(
    class BarEnhancedDashboard extends PanelMenu.Button {
        _init(obar) {
            super._init(0.5, 'Bar Enhanced Dashboard');
            this.obar = obar;
            this._settingsSignals = [];

            // Custom Symbolic paint-palette/color icon representing aesthetics
            let icon = new St.Icon({
                icon_name: 'preferences-color-symbolic',
                style_class: 'system-status-icon'
            });
            this.add_child(icon);

            // Build Glassmorphic container
            let widgetBox = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                style_class: 'bar-enhanced-dashboard-menu'
            });

            // 1. Header
            let titleLabel = new St.Label({
                text: T('Bar Enhanced'),
                style_class: 'bar-enhanced-dashboard-header'
            });
            widgetBox.add_child(titleLabel);

            let subtitleLabel = new St.Label({
                text: T('Premium Customize Center'),
                style_class: 'bar-enhanced-dashboard-subtitle'
            });
            widgetBox.add_child(subtitleLabel);

            // Section: Layouts
            let layoutTitle = new St.Label({
                text: T('Top Bar Layouts'),
                style_class: 'bar-enhanced-dashboard-section-title'
            });
            widgetBox.add_child(layoutTitle);

            // Grid rows for layout selection
            let row1 = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, style_class: 'bar-enhanced-dashboard-row' });
            let row2 = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, style_class: 'bar-enhanced-dashboard-row' });
            widgetBox.add_child(row1);
            widgetBox.add_child(row2);

            const layouts = ['Floating', 'Islands', 'Mainland', 'Trilands'];
            let layoutBtns = {};

            layouts.forEach((layout, index) => {
                let btn = new St.Button({
                    label: T(layout),
                    style_class: 'bar-enhanced-dashboard-button',
                    x_expand: true,
                    can_focus: true
                });

                btn.connect('clicked', () => {
                    this.obar._settings.set_string('bartype', layout);
                });

                layoutBtns[layout] = btn;

                if (index < 2) {
                    row1.add_child(btn);
                } else {
                    row2.add_child(btn);
                }
            });

            // Track active layout mode and add/remove style class
            const updateActiveLayoutHighlight = () => {
                let activeLayout = this.obar._settings.get_string('bartype');
                layouts.forEach(l => {
                    let btn = layoutBtns[l];
                    if (btn) {
                        if (l === activeLayout) {
                            btn.add_style_class_name('active');
                        } else {
                            btn.remove_style_class_name('active');
                        }
                    }
                });
            };

            this._settingsSignals.push(this.obar._settings.connect('changed::bartype', updateActiveLayoutHighlight));
            updateActiveLayoutHighlight();

            // Section: Live Toggles
            let togglesTitle = new St.Label({
                text: T('Engine Controls'),
                style_class: 'bar-enhanced-dashboard-section-title'
            });
            widgetBox.add_child(togglesTitle);

            // Focus Glow Toggle
            let focusGlowBtn = new St.Button({
                label: T('Focus Glow'),
                style_class: 'bar-enhanced-dashboard-button toggle-button',
                x_expand: true,
                can_focus: true
            });

            const updateFocusGlowBtn = () => {
                let active = this.obar._settings.get_boolean('focus-glow');
                focusGlowBtn.set_label(active ? T('Focus Glow: ON') : T('Focus Glow: OFF'));
                if (active) {
                    focusGlowBtn.add_style_class_name('active');
                } else {
                    focusGlowBtn.remove_style_class_name('active');
                }
            };

            focusGlowBtn.connect('clicked', () => {
                let active = !this.obar._settings.get_boolean('focus-glow');
                this.obar._settings.set_boolean('focus-glow', active);
            });

            this._settingsSignals.push(this.obar._settings.connect('changed::focus-glow', updateFocusGlowBtn));
            updateFocusGlowBtn();
            widgetBox.add_child(focusGlowBtn);

            // Pywal Sync Toggle
            let pywalSyncBtn = new St.Button({
                label: T('Pywal Sync'),
                style_class: 'bar-enhanced-dashboard-button toggle-button',
                x_expand: true,
                can_focus: true
            });

            const updatePywalSyncBtn = () => {
                let active = this.obar._settings.get_boolean('pywal-sync');
                pywalSyncBtn.set_label(active ? T('Pywal Sync: ON') : T('Pywal Sync: OFF'));
                if (active) {
                    pywalSyncBtn.add_style_class_name('active');
                } else {
                    pywalSyncBtn.remove_style_class_name('active');
                }
            };

            pywalSyncBtn.connect('clicked', () => {
                let active = !this.obar._settings.get_boolean('pywal-sync');
                this.obar._settings.set_boolean('pywal-sync', active);
            });

            this._settingsSignals.push(this.obar._settings.connect('changed::pywal-sync', updatePywalSyncBtn));
            updatePywalSyncBtn();
            widgetBox.add_child(pywalSyncBtn);

            // Immersive Music Theme Toggle
            let immersiveMusicBtn = new St.Button({
                label: T('Immersive Music'),
                style_class: 'bar-enhanced-dashboard-button toggle-button',
                x_expand: true,
                can_focus: true
            });

            const updateImmersiveMusicBtn = () => {
                let active = this.obar._settings.get_boolean('immersive-music-theme');
                immersiveMusicBtn.set_label(active ? T('Immersive Music: ON') : T('Immersive Music: OFF'));
                if (active) {
                    immersiveMusicBtn.add_style_class_name('active');
                } else {
                    immersiveMusicBtn.remove_style_class_name('active');
                }
            };

            immersiveMusicBtn.connect('clicked', () => {
                let active = !this.obar._settings.get_boolean('immersive-music-theme');
                this.obar._settings.set_boolean('immersive-music-theme', active);
                if (!active) {
                    this.obar.immersiveColorOverride = null;
                    try { this.obar.updateImmersiveColors(); } catch(e) {}
                }
            });

            this._settingsSignals.push(this.obar._settings.connect('changed::immersive-music-theme', updateImmersiveMusicBtn));
            updateImmersiveMusicBtn();
            widgetBox.add_child(immersiveMusicBtn);

            // Add whole box to the menu
            this.menu.box.add_child(widgetBox);
        }

        destroy() {
            if (this._settingsSignals && this.obar && this.obar._settings) {
                this._settingsSignals.forEach(id => this.obar._settings.disconnect(id));
                this._settingsSignals = null;
            }
            super.destroy();
        }
    });


// --- Notification Icons Integration ---
class NotifIcon {
    constructor(source, actualIconSize, gicon, iconName, coloredIcons, notificationCount, hideCountWhenOne) {
        this._source = source;
        this._hideCountWhenOne = hideCountWhenOne;
        this._widget = new St.Widget({ layout_manager: new Clutter.BinLayout() });
        this._icon = new St.Icon({ icon_size: actualIconSize, style_class: 'topbar-notification-icon' });
        if (gicon) this._icon.gicon = gicon;
        else this._icon.icon_name = iconName || 'notification-symbolic';
        if (!coloredIcons) {
            this._icon.add_style_class_name('app-menu-icon');
            this._icon.add_effect(new Clutter.DesaturateEffect());
        }
        this._widget.add_child(this._icon);
        if (notificationCount) {
            this._signal = source.connect('notify::count', this._updateNotificationCount.bind(this));
            this._badge = new St.Label({
                style_class: 'notification-count',
                text: this._getNotificationCount(),
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.START
            });
            this._badge.visible = this._badge.text !== '';
            this._widget.add_child(this._badge);
        }
    }
    _getNotificationCount() {
        const count = this._source.notifications ? this._source.notifications.length : 0;
        if (this._hideCountWhenOne) return count > 1 ? count.toString() : '';
        return count > 0 ? count.toString() : '';
    }
    _updateNotificationCount() {
        this._badge.text = this._getNotificationCount();
        this._badge.visible = this._badge.text !== '';
    }
}

const TopbarNotification = GObject.registerClass(
class TopbarNotification extends St.BoxLayout {
    _init(niSettings) {
        super._init({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            visible: true,
            style_class: 'topbar-notification-container'
        });
        this._niSettings = niSettings;
        this._icons = new Map();
        this._signals = [];
        this._dndSignals = [];
        this._sourceCountSignals = new Map();
        this._dndMode = this._niSettings.get_int('dnd-mode');
        this._coloredIcons = this._niSettings.get_boolean('colored-icons');
        this._notificationCount = this._niSettings.get_boolean('notification-count');
        this._hideCountWhenOne = this._niSettings.get_boolean('hide-count-when-one');
        this._iconSize = this._niSettings.get_int('icon-size');
        this._isDndActive = false;
        this._sourceIdCounter = 0;
        this._sourceIdMap = new WeakMap();
        this._connectSignals();
        this._updateDndState();
        this._updateAllSources();
    }
    _connectSignals() {
        this._signals = [
            Main.messageTray.connect('source-added', this._onSourceAdded.bind(this)),
            Main.messageTray.connect('source-removed', this._onSourceRemoved.bind(this)),
        ];
        this._monitorDndState();
    }
    _getSourceId(source) {
        if (source._policy && source._policy.id) return `policy:${source._policy.id}`;
        if (source.app && source.app.get_id) return `app:${source.app.get_id()}`;
        if (source.title) return `title:${source.title}`;
        if (!this._sourceIdMap.has(source)) this._sourceIdMap.set(source, `generated:${this._sourceIdCounter++}`);
        return this._sourceIdMap.get(source);
    }
    _onSourceAdded(tray, source) {
        if (!source) return;
        this._watchSourceCount(source);
        const sourceId = this._getSourceId(source);
        if (!this._shouldShowInDND(source)) return;
        if (!this._icons.has(sourceId)) {
            const icon = this._createIcon(source);
            this._icons.set(sourceId, icon);
            this._renderIcons();
        }
    }
    _onSourceRemoved(tray, source) {
        if (!source) return;
        this._unwatchSourceCount(source);
        const sourceId = this._getSourceId(source);
        // Sources of the same app share one icon. If another one is still
        // there, rebuild so the icon stays and points at the remaining source.
        if (Main.messageTray.getSources().some(other => other !== source && this._getSourceId(other) === sourceId)) {
            this._updateAllSources();
            return;
        }
        const icon = this._icons.get(sourceId);
        if (icon) {
            this._destroyIcon(icon);
            this._icons.delete(sourceId);
            this._renderIcons();
        }
    }
    _renderIcons() {
        this.remove_all_children();
        let iconsArray = Array.from(this._icons.values());
        let totalCount = iconsArray.length;
        let maxVisible = 5;
        let overlapThreshold = 3;
        
        let visibleIcons = iconsArray.slice(0, maxVisible);
        let isStacked = totalCount > overlapThreshold;
        
        // Use RTL trick to make the left-most icon render ON TOP of the right ones
        if (isStacked) {
            this.set_text_direction(Clutter.TextDirection.RTL);
            // In RTL, adding elements normally puts the first element on the RIGHT.
            // So we add them in reverse order.
            // Last element added goes to the LEFT and renders ON TOP.
            visibleIcons.reverse();
        } else {
            this.set_text_direction(Clutter.TextDirection.LTR);
        }
        
        visibleIcons.forEach((icon, index) => {
            icon._widget.remove_style_class_name('stacked-notification-icon');
            if (icon._redDot) {
                icon._widget.remove_child(icon._redDot);
                icon._redDot.destroy();
                icon._redDot = null;
            }
            
            // In our reversed array, index 0 is actually the last icon.
            // We want negative margin to overlap.
            if (isStacked && index < visibleIcons.length - 1) {
                icon._widget.add_style_class_name('stacked-notification-icon');
            }
            
            this.add_child(icon._widget);
        });

        // Add the red dot to the newest (left-most) icon, which is the last in our reversed array
        if (isStacked && totalCount > maxVisible) {
            let firstIcon = visibleIcons[visibleIcons.length - 1]; // The originally first icon
            if (firstIcon) {
                firstIcon._redDot = new St.Widget({
                    style_class: 'notification-overflow-dot',
                    x_align: Clutter.ActorAlign.END, // In RTL, END is Left
                    y_align: Clutter.ActorAlign.START
                });
                firstIcon._widget.add_child(firstIcon._redDot);
            }
        }
    }
    _createIcon(source) {
        const iconSizeMap = [16, 18, 20];
        const actualIconSize = iconSizeMap[this._iconSize] || 18;
        const gicon = this._getGIconForSource(source);
        const iconName = gicon ? null : this._getIconNameForSource(source);
        return new NotifIcon(source, actualIconSize, gicon, iconName, this._coloredIcons, this._notificationCount, this._hideCountWhenOne);
    }
    _getGIconForSource(source) {
        if (source.icon && source.icon instanceof Gio.Icon) return source.icon;
        if (source.notifications && source.notifications.length > 0) {
            for (const n of source.notifications) { if (n.gicon) return n.gicon; }
        }
        if (source.app && source.app.get_icon) { const ai = source.app.get_icon(); if (ai) return ai; }
        if (source.gicon && source.gicon instanceof Gio.Icon) return source.gicon;
        return null;
    }
    _getIconNameForSource(source) {
        if (source.notifications && source.notifications.length > 0) {
            for (const n of source.notifications) {
                if (n.gicon && n.gicon instanceof Gio.ThemedIcon) { const names = n.gicon.get_names(); if (names && names.length > 0) return names[0]; }
                if (n.iconName) return n.iconName;
            }
        }
        if (source.icon && source.icon instanceof Gio.ThemedIcon) { const names = source.icon.get_names(); if (names && names.length > 0) return names[0]; }
        if (source.iconName) return source.iconName;
        if (source.app && source.app.get_id) { const appId = source.app.get_id(); if (appId) return appId.replace(/\.desktop$/, ''); }
        if (source.title) return source.title.toLowerCase().replace(/\s+/g, '-');
        return 'notification-symbolic';
    }
    _monitorDndState() {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
        this._dndSignals = [settings.connect('changed::show-banners', this._onDndStateChanged.bind(this))];
        this._dndSettings = settings;
        this._updateDndState();
    }
    _updateDndState() {
        const wasDndActive = this._isDndActive;
        this._isDndActive = this._dndSettings ? !this._dndSettings.get_boolean('show-banners') : false;
        if (wasDndActive !== this._isDndActive) this._updateAllSources();
    }
    _onDndStateChanged() { this._updateDndState(); }
    _watchSourceCount(source) {
        if (this._sourceCountSignals.has(source)) return;
        const id = source.connect('notify::count', () => {
            if (this._isDndActive && this._dndMode === 1)
                this._updateAllSources();
        });
        this._sourceCountSignals.set(source, id);
    }
    _unwatchSourceCount(source) {
        const id = this._sourceCountSignals.get(source);
        if (id !== undefined) {
            source.disconnect(id);
            this._sourceCountSignals.delete(source);
        }
    }
    _shouldShowInDND(source) {
        if (!this._isDndActive) return true;
        const dndMode = this._niSettings.get_int('dnd-mode');
        switch (dndMode) {
            case 0: return true;
            case 1: return this._isUrgentNotification(source);
            case 2: return false;
            default: return true;
        }
    }
    _isUrgentNotification(source) {
        if (!source) return false;
        if (source.notifications && source.notifications.length > 0) {
            return source.notifications.some(n => {
                if (n._urgency === 2 || n._urgency === 3) return true;
                if (n.urgency === MessageTray.Urgency.CRITICAL || n.urgency === MessageTray.Urgency.HIGH) return true;
                return false;
            });
        }
        return false;
    }
    _updateAllSources() {
        this.remove_all_children();
        this._icons.forEach(icon => this._destroyIcon(icon));
        this._icons.clear();
        const sources = Main.messageTray.getSources();
        sources.forEach(source => {
            if (!source) return;
            this._watchSourceCount(source);
            const sourceId = this._getSourceId(source);
            if (!this._shouldShowInDND(source)) return;
            if (!this._icons.has(sourceId)) {
                const icon = this._createIcon(source);
                this._icons.set(sourceId, icon);
            }
        });
        this._renderIcons();
    }
    _destroyIcon(icon) {
        if (icon._signal) icon._source.disconnect(icon._signal);
        icon._widget.destroy();
    }
    updateSettings() {
        const newDndMode = this._niSettings.get_int('dnd-mode');
        const newColoredIcons = this._niSettings.get_boolean('colored-icons');
        const newNotificationCount = this._niSettings.get_boolean('notification-count');
        const newHideCountWhenOne = this._niSettings.get_boolean('hide-count-when-one');
        const newIconSize = this._niSettings.get_int('icon-size');
        let needsUpdate = false;
        if (newDndMode !== this._dndMode) { this._dndMode = newDndMode; needsUpdate = true; }
        if (newColoredIcons !== this._coloredIcons) { this._coloredIcons = newColoredIcons; needsUpdate = true; }
        if (newNotificationCount !== this._notificationCount) { this._notificationCount = newNotificationCount; needsUpdate = true; }
        if (newHideCountWhenOne !== this._hideCountWhenOne) { this._hideCountWhenOne = newHideCountWhenOne; needsUpdate = true; }
        if (newIconSize !== this._iconSize) { this._iconSize = newIconSize; needsUpdate = true; }
        if (needsUpdate) this._updateAllSources();
    }
    destroy() {
        if (this._signals) { this._signals.forEach(s => { if (s) Main.messageTray.disconnect(s); }); this._signals = []; }
        if (this._dndSignals && this._dndSettings) { this._dndSignals.forEach(s => { if (s) this._dndSettings.disconnect(s); }); this._dndSignals = []; this._dndSettings = null; }
        for (const source of this._sourceCountSignals.keys())
            this._unwatchSourceCount(source);
        this._icons.forEach(icon => this._destroyIcon(icon));
        this._icons.clear();
        super.destroy();
    }
});

// BarEnhanced Extension main class
export default class BarEnhanced extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._bgSettings = null;
        this._intSettings = null;
        this._hcSettings = null;
        this._connections = null;
        this._injections = [];
        this._windowBlurSignals = null;
        this._windowBlurBackgrounds = null;
        this._lifecycleGeneration = 0;
    }

    async _copyRuntimeAssets(sourceDir, destinationDir, cancellable) {
        try {
            await ensureDirectoryAsync(destinationDir, cancellable);
        } catch (e) {
            if (!cancellable.is_cancelled())
                console.error(`BarEnhanced: failed to create runtime assets directory: ${e.message}`);
            return;
        }

        let enumerator = null;
        try {
            enumerator = await sourceDir.enumerate_children_async(
                Gio.FILE_ATTRIBUTE_STANDARD_NAME,
                Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
                GLib.PRIORITY_LOW,
                cancellable);
            while (!cancellable.is_cancelled()) {
                const files = await enumerator.next_files_async(32, GLib.PRIORITY_LOW, cancellable);
                if (files.length === 0)
                    break;
                await Promise.all(files.map(info => {
                    const src = sourceDir.get_child(info.get_name());
                    const dst = destinationDir.get_child(info.get_name());
                    return src.copy_async(dst,
                        Gio.FileCopyFlags.OVERWRITE | Gio.FileCopyFlags.TARGET_DEFAULT_PERMS,
                        GLib.PRIORITY_LOW,
                        cancellable,
                        null);
                }));
            }
        } catch (e) {
            if (!cancellable.is_cancelled())
                console.error(`BarEnhanced: failed to copy runtime assets: ${e.message}`);
        } finally {
            if (enumerator) {
                try {
                    await enumerator.close_async(GLib.PRIORITY_LOW, cancellable);
                } catch (e) {
                    // A cancelled enumerator has no resources left to retain.
                }
            }
        }
    }

    // Generate a color palette from desktop background image
    getPaletteFromImage(pictureUri) {
        if (!pictureUri || typeof pictureUri !== 'string') {
            return [null, null];
        }

        let pictureFile;
        try {
            pictureFile = GLib.uri_parse_scheme(pictureUri)
                ? Gio.File.new_for_uri(pictureUri)
                : Gio.File.new_for_path(pictureUri);
        } catch (e) {
            console.error(`BarEnhanced: invalid background URI: ${pictureUri}`);
            return [null, null];
        }
        let path = pictureFile.get_path();

        if (!path) {
            console.error(`BarEnhanced: background image is not a readable local file: ${pictureUri}`);
            return [null, null];
        }

        try {
        // Limit both dimensions. Loading at a fixed width with an unlimited
        // height made panoramas and tall wallpapers allocate huge JS pixel
        // arrays in the Shell process, delaying or preventing a live palette
        // update.
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 1000, 1000, true);
        let nChannels = pixbuf.n_channels;
        // Rows can be padded for alignment; index pixels through the rowstride
        // or channels drift (R/G/B swap) on images with certain widths.
        const rowstride = pixbuf.get_rowstride();

        // Get the width, height and pixel count of the image
        let width = pixbuf.get_width();
        let height = pixbuf.get_height();
        let pixelCount = width * height;
        // Quantization does not need every source pixel. Keep extraction
        // responsive even for a full 1000x1000 thumbnail.
        const offset = Math.max(1, Math.floor(pixelCount / 120000));

        // Get the pixel data as an array of bytes
        let pixels = pixbuf.get_pixels();

        let pixelArray = [];
        let colorfulPixelArray = [];
        // Loop through the pixels and get the rgba values
        for (let i = 0, index, r, g, b, a; i < pixelCount; i = i + offset) {
            index = Math.floor(i / width) * rowstride + (i % width) * nChannels;

            // Get the red, green, blue, and alpha values
            r = pixels[index];
            g = pixels[index + 1];
            b = pixels[index + 2];

            a = nChannels == 4 ? pixels[index + 3] : undefined;

            // Save pixles that are not transparent and not full white/black
            if (typeof a === 'undefined' || a >= 125) {
                if (!(r > 250 && g > 250 && b > 250) && !(r < 5 && g < 5 && b < 5)) {
                    pixelArray.push([r, g, b]);
                    // If an image contains actual colour, neutral pixels should
                    // not dominate every extracted palette slot.
                    if (Math.max(r, g, b) - Math.min(r, g, b) >= 18)
                        colorfulPixelArray.push([r, g, b]);
                    // pixelArray.push(Material.argbFromRgb(r, g, b));
                }
            }
        }
        // log('pixelCount, pixelarray len ', pixelCount, pixelArray.length);

        // Generate color palette of 12 colors using Quantize to possibly get all colors for color-button
        const sourcePixels = colorfulPixelArray.length >= 500
            ? colorfulPixelArray
            : pixelArray;
        const cmap12 = Quantize.quantize(sourcePixels, 12);
        const palette12 = cmap12 ? cmap12.palette() : null;
        const count12 = cmap12 ? cmap12.colorCounts() : null;

        if (!palette12?.length || !count12?.length)
            return [null, null];

        // Keep each count associated with its original colour while sorting.
        // Sorting the two arrays independently previously desynchronized them.
        const ranked = palette12.map((color, index) => ({
            color,
            count: count12[index] || 0,
        })).sort((a, b) => b.count - a.count);
        // log('palette12 sorted ', palette12, 'count12 sorted ', count12);

        return [ranked.map(item => item.color), ranked.map(item => item.count)];
        } catch (e) {
            console.error(`BarEnhanced: palette extraction failed: ${e.message}`);
            return [null, null];
        }
    }

    backgroundPalette() {
        // A palette-only update is misleading when auto-refresh is enabled but
        // neither mode has a base theme (for example after applying a Vanguard
        // preset). Use the non-destructive Color theme for both modes.
        const autoRefresh = this._settings.get_boolean('autotheme-refresh');
        if (autoRefresh && !this._settings.get_boolean('pywal-sync') &&
            this._settings.get_string('autotheme-dark') === 'Select Theme' &&
            this._settings.get_string('autotheme-light') === 'Select Theme') {
            this._settings.set_string('autotheme-dark', 'Color');
            this._settings.set_string('autotheme-light', 'Color');
        }
        // Get the latest background image file (from picture-uri and picture-uri-dark)
        let pictureUriDark = this._settings.get_string('dark-bguri');
        let pictureUriLight = this._settings.get_string('light-bguri');
        const currentMode = this._intSettings.get_string('color-scheme');
        let darklight, palette12, count12, pictureUri;
        let uriArr = [pictureUriDark, pictureUriLight];
        let sameUri = pictureUriDark == pictureUriLight;

        for (let i = 0; i < uriArr.length; i++) {
            darklight = (i == 0) ? 'dark' : 'light';
            pictureUri = uriArr[i];

            if (!pictureUri || pictureUri.endsWith('.xml') || pictureUri.endsWith('.XML'))
                continue;

            // Generate palette only once if both URI are same
            if (!sameUri || i == 0) {
                [palette12, count12] = this.getPaletteFromImage(pictureUri);
            }

            // Save palette and counts to settings
            if (!palette12?.length || !count12?.length) {
                console.error(`BarEnhanced: palette extraction returned no usable colours for ${pictureUri}`);
                continue;
            }

            let paletteIdx = 1;
            palette12?.forEach(color => {
                // Save palette to dark/light settings
                this._settings.set_strv(darklight + '-' + 'palette' + paletteIdx, [String(color[0]), String(color[1]), String(color[2])]);
                // Copy the palette for current mode to main settings
                if ((sameUri && i == 0) ||
                    (darklight == 'dark' && currentMode == 'prefer-dark') ||
                    (darklight == 'light' && currentMode != 'prefer-dark'))
                    this._settings.set_strv('palette' + paletteIdx, [String(color[0]), String(color[1]), String(color[2])]);
                paletteIdx++;
            });
            let countIdx = 1;
            count12?.forEach(count => {
                this._settings.set_int('count' + countIdx, count12[countIdx - 1]);
                countIdx++;
            });

            // Toggle setting 'bg-change' to update the current mode palette in preferences window
            if ((sameUri && i == 0) ||
                (darklight == 'dark' && currentMode == 'prefer-dark') ||
                (darklight == 'light' && currentMode != 'prefer-dark')) {
                let bgchange = this._settings.get_boolean('bg-change');
                if (bgchange)
                    this._settings.set_boolean('bg-change', false);
                else
                    this._settings.set_boolean('bg-change', true);
            }

            // Apply auto theme for new background palette if auto-refresh enabled and theme set for this iteration (darklight)
            let theme;
            if (darklight == 'dark')
                theme = this._settings.get_string('autotheme-dark');
            else
                theme = this._settings.get_string('autotheme-light');
            if (autoRefresh && !this._settings.get_boolean('pywal-sync') && theme != 'Select Theme') {
                // log('Auto theme refresh for ', darklight);
                AutoThemes.autoApplyBGPalette(this, darklight);
            }
        }
    }

    _injectToFunction(parent, name, func) {
        let origin = parent[name];
        parent[name] = function () {
            let ret;
            ret = origin.apply(this, arguments);
            if (ret === undefined) ret = func.apply(this, arguments);
            return ret;
        };
        return origin;
    }

    _removeInjection(object, injection, name) {
        if (injection[name] === undefined) delete object[name];
        else object[name] = injection[name];
    }

    unloadStylesheet(invalidatePendingReload = true) {
        if (invalidatePendingReload) {
            this._styleReloadQueued = false;
            this._styleReloadGeneration = (this._styleReloadGeneration || 0) + 1;
        }
        if (this._reloadStyleTimeoutId) {
            GLib.Source.remove(this._reloadStyleTimeoutId);
            this._reloadStyleTimeoutId = null;
        }
        const theme = this.themeContext.get_theme();
        const stylesheet = this.obarRunDir.get_child('bar-enhanced.css');
        try {
            theme.unload_stylesheet(stylesheet);
        }
        catch (e) {
            console.error('BarEnhanced: failed to unload stylesheet', e);
        }
    }

    loadStylesheet() {
        const theme = this.themeContext.get_theme();
        const stylesheet = this.obarRunDir.get_child('bar-enhanced.css');
        try {
            theme.load_stylesheet(stylesheet);
        }
        catch (e) {
            console.error('BarEnhanced: failed to load stylesheet', e);
        }
    }

    loadDashToDockStylesheet() {
        if (this._dashToDockStylesheetLoaded)
            return;

        const theme = this.themeContext.get_theme();
        const stylesheet = Gio.File.new_for_path(GLib.build_filenamev([this.path, 'dash-to-dock', 'dash-to-dock.css']));
        try {
            theme.load_stylesheet(stylesheet);
            this._dashToDockStylesheetLoaded = true;
        }
        catch (e) {
            console.error('BarEnhanced: failed to load embedded dock stylesheet', e);
        }
    }

    unloadDashToDockStylesheet() {
        if (!this._dashToDockStylesheetLoaded)
            return;

        const theme = this.themeContext.get_theme();
        const stylesheet = Gio.File.new_for_path(GLib.build_filenamev([this.path, 'dash-to-dock', 'dash-to-dock.css']));
        try {
            theme.unload_stylesheet(stylesheet);
        }
        catch (e) {
            console.error('BarEnhanced: failed to unload embedded dock stylesheet', e);
        }
        this._dashToDockStylesheetLoaded = false;
    }

    reloadStylesheet() {
        // Unload stylesheet
        // This is a normal hot reload, not a disable. Do not invalidate a
        // style write that is still finishing or a queued user change.
        this.unloadStylesheet(false);

        // While a fullscreen window has the panel monitor, the stylesheet stays
        // unloaded on purpose. The regenerated file is loaded when fullscreen
        // ends (onFullScreen), so a background reload (e.g. the immersive music
        // theme on every track change) must not re-apply it now.
        if (this.isObarReset)
            return;

        // Load stylesheet
        this.loadStylesheet();
    }

    updateImmersiveColors() {
        StyleSheets.reloadStyle(this, this);
        if (this.hydroWidgetsManager) {
            this.hydroWidgetsManager.applyMonetColors();
        }
    }

    // Add or remove 'openmenu' class
    applyMenuClass(obj, add, className = 'openmenu') {
        if (!obj)
            return;
        if (add) {
            if (obj.add_style_class_name)
                obj.add_style_class_name(className);
        }
        else {
            if (obj.remove_style_class_name)
                obj.remove_style_class_name(className);
        }
    }

    // Add/Remove openmenu class to the object and its children/subchildren
    applyBoxStyles(box, add) {
        this.applyMenuClass(box, add);

        let menuChildren = box.get_children();
        menuChildren.forEach(menuItem => {
            this.applyMenuClass(menuItem, add);
            if (menuItem.menu) {
                this.applyMenuClass(menuItem.menu.box, add);
                menuItem.menu.box.get_children().forEach(child => {
                    this.applyMenuClass(child, add);
                });
            }

            let subChildren = menuItem.get_children(); // Required for submenus, at least in Gnome 42 settings menu
            subChildren.forEach(menuchild => {
                this.applyMenuClass(menuchild, add);
                if (menuchild.menu) {
                    this.applyMenuClass(menuchild.menu.box, add);
                    menuchild.menu.box.get_children().forEach(child => {
                        this.applyMenuClass(child, add);
                    });
                }
            });
        });
    }

    // Add/Remove openmenu class to Notifications and Media message lists
    // as well as to any other lists added by other extensions
    applySectionStyles(list, add) {
        list.get_children().forEach((section, idx) => {
            let msgList = section._list;
            if (add && !this.msgListIds[idx]) {
                this.msgListIds[idx] = msgList?.connect(this.addedSignal, (container, actor) => {
                    this.applyMenuClass(actor.child, add);
                });
                this.msgLists[idx] = msgList;
            }
            else if (!add && this.msgListIds[idx]) {
                msgList?.disconnect(this.msgListIds[idx]);
                this.msgListIds[idx] = null;
                this.msgLists[idx] = null;
            }
            msgList?.get_children().forEach(msg => {
                this.applyMenuClass(msg.child, add);
            });
        });
    }

    // Go through each panel button's menu to add/remove openmenu class to its children
    applyMenuStyles(panel, add) {
        for (const box of this.panelBoxes) {
            for (const btn of box) { // btn is a bin, parent of indicator button
                if (btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox) { // btn.child is the indicator

                    const menuBox = btn.child.menu?.box;
                    if (menuBox) {
                        const scope = btn.child === Main.panel.statusArea.quickSettings ? 'quick'
                            : btn.child === Main.panel.statusArea.dateMenu ? 'calendar'
                                : btn.child === this.vitalsMenu ? 'vitals'
                                    : btn.child === this.btBatteryMenu ? 'bluetooth' : 'panel';
                        this.applyMenuClass(menuBox, add, `be-menu-${scope}`);
                    }

                    // box pointer case, to update -arrow-rise for bottom panel
                    if (btn.child.menu?._boxPointer) {
                        this.applyMenuClass(btn.child.menu._boxPointer, add);
                    }

                    // special case for Quick Settings Audio Panel, because it changes the layout of the Quick Settings menu
                    if (btn.child.menu?.constructor.name == "PanelGrid") {
                        for (const panel of btn.child.menu._get_panels()) {
                            this.applyBoxStyles(panel, add);
                        }
                    }
                    // general case
                    else if (btn.child.menu?.box) {
                        this.applyBoxStyles(btn.child.menu.box, add);
                    }

                    // special case for Arc Menu, because it removes default menu and creates its own menu
                    if (btn.child.constructor.name === 'ArcMenuMenuButton') {
                        let menu = btn.child.arcMenu;
                        this.applyMenuClass(menu, add);
                        if (menu.box)
                            this.applyBoxStyles(menu.box, add);

                        let ctxMenu = btn.child.arcMenuContextMenu;
                        this.applyMenuClass(ctxMenu, add);
                        if (ctxMenu.box)
                            this.applyBoxStyles(ctxMenu.box, add);
                    }

                    // DateMenu: Notifications (messages and media), DND and Clear buttons
                    //           Calendar Grid, Events, World Clock, Weather
                    if (btn.child.constructor.name === 'DateMenuButton') {
                        const bin = btn.child.menu.box.get_child_at_index(0); // CalendarArea
                        const hbox = bin.get_child_at_index(0); // hbox with left and right sections

                        const msgList = hbox.get_child_at_index(0); // Left Pane/Section with notifications etc
                        this.applyMenuClass(msgList, add);
                        this.applyMenuClass(msgList, add, 'be-menu-notifications');
                        const placeholder = msgList.get_child_at_index(0); // placeholder for 'No Notifications'
                        this.applyMenuClass(placeholder, add);
                        const msgbox = msgList.get_child_at_index(1);
                        const msgScroll = msgbox.get_child_at_index(0);
                        const sectionList = msgScroll.child;
                        if (add) {
                            this._connections.connect(sectionList, this.addedSignal, (container, actor) => {
                                // log('section added: ', actor.constructor.name);
                                this.applySectionStyles(sectionList, add);
                            });
                        }
                        else
                            this._connections?.disconnect(sectionList, this.addedSignal);
                        this.applySectionStyles(sectionList, add);

                        const msgHbox = msgbox.get_child_at_index(1); // hbox at botton for dnd and clear buttons
                        let clearBtn;
                        if (this.gnomeVersion < 49) {
                            const dndBtn = msgHbox.get_child_at_index(1);
                            this.applyMenuClass(dndBtn, add);
                            const toggleSwitch = dndBtn.get_child_at_index(0);
                            this.applyMenuClass(toggleSwitch, add);
                            clearBtn = msgHbox.get_child_at_index(2);
                        }
                        else {
                            clearBtn = msgHbox.get_child_at_index(1);
                        }
                        this.applyMenuClass(clearBtn, add);

                        const vbox = hbox.get_child_at_index(1); // Right Pane/Section vbox for calendar etc
                        vbox.get_children().forEach(item => {
                            this.applyMenuClass(item, add);
                            item.get_children().forEach(child => {
                                this.applyMenuClass(child, add);
                                child.get_children().forEach(subch => {
                                    this.applyMenuClass(subch, add);
                                })
                            });

                            if (item.constructor.name === 'Calendar') {
                                this.applyCalendarGridStyle(item, add);
                                const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                                    this._calendarTimeoutIds.delete(timeoutId);
                                    if (!this.disabling && item.layout_manager)
                                        this.applyCalendarGridStyle(item, add);
                                    return GLib.SOURCE_REMOVE;
                                });
                                this._calendarTimeoutIds.add(timeoutId);
                            }
                        });
                    }

                }
            }
        }
    }

    applyCalendarGridStyle(item, add) { // calendar days grid with week numbers
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const child = item.layout_manager.get_child_at(i, j);
                this.applyMenuClass(child, add);
            }
        }
    }

    // Add BarEnhanced style classes to Panel and Panel-Buttons
    setPanelStyle(obj, key, sig_param, callbk_param) {
        // log('setPanelStyle: ', String(obj), key, String(sig_param), callbk_param);
        const panel = Main.panel;
        const bartype = this._settings.get_string('bartype');
        const buttonBgWMax = this._settings.get_boolean('buttonbg-wmax');
        const candybar = this._settings.get_boolean('candybar');
        const setOverview = this._settings.get_boolean('set-overview');
        // Add/remove candybar class as per settings
        if (candybar &&
            (setOverview || !panel.has_style_pseudo_class('overview')) &&
            (buttonBgWMax || !panel.has_style_pseudo_class('windowmax')))
            panel.add_style_class_name('candybar');
        else
            panel.remove_style_class_name('candybar');
        // Add/remove trialnds class as per bartype
        if (bartype == 'Trilands')
            panel.add_style_class_name('trilands');
        else
            panel.remove_style_class_name('trilands');

        let i = 0, idx, isFirst, firstIdx, lastIdx;
        for (const box of this.panelBoxes) {
            isFirst = true; idx = 0; firstIdx = 0; lastIdx = 0;
            for (const btn of box) {
                // Screen recording/share indicators use ButtonBox instead of Button
                if (btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox) {
                    if (btn.child.visible) {
                        if (isFirst) {
                            firstIdx = idx;
                            isFirst = false;
                        }
                        lastIdx = idx;
                        // log('Visible Child: ', String(btn.child));
                        btn.add_style_class_name('button-container');

                        // Add candybar classes if enabled else remove them
                        if (key == 'enabled' || key == 'candybar' || key == 'showing' || key == 'hiding' || key == 'overview'
                            || key == 'notify::visible' || key == this.addedSignal || key == this.removedSignal) {
                            for (let j = 1; j <= 16; j++) {
                                btn.child.remove_style_pseudo_class('candy' + j);
                            }
                            i++; i = i % 16; i = i == 0 ? 16 : i; // Cycle through candybar palette
                            if (candybar) {
                                btn.child.add_style_pseudo_class('candy' + i);
                            }
                        }

                        if (btn.child.constructor.name === 'DateMenuButton') {
                            // Remove padding widget to get rid of empty space on left when Message/DND indicator is on right
                            if (!this.dateMenuLeftPadWidget) {
                                this.dateMenuBtnBox = btn.child.get_first_child();
                                this.dateMenuLeftPadWidget = this.dateMenuBtnBox.get_first_child();
                                this.dateMenuBtnBox.remove_child(this.dateMenuLeftPadWidget);
                            }
                        }
                    }
                }

                idx++;
            }

            // Add trilands pseudo-classes if enabled else remove them
            let btns = box.get_children();
            if (bartype == 'Trilands') {
                for (let k = 0; k < btns.length; k++) {
                    if (btns[k].child instanceof PanelMenu.Button || btns[k].child instanceof PanelMenu.ButtonBox) {
                        if (k == firstIdx && k != lastIdx)
                            box.set_child_at_index(btns[k], 0);
                        else if (k == lastIdx && k != firstIdx)
                            box.set_child_at_index(btns[k], btns.length - 1);
                    }
                }
            }
        }
    }

    // Update panel style when Settings change
    updatePanelStyle(obj, key, sig_param, callbk_param) {
        // log('update called with ', key, sig_param, callbk_param);
        let panel = Main.panel;

        if (!this._settings)
            return;

        // Nothing to update if it's a color palette setting
        if (key.startsWith('palette') || key.startsWith('prominent') ||
            key.startsWith('dark-') || key.startsWith('light-'))
            return;

        // Generate background color palette
        if (key == 'bgpalette' || key == 'bguri') {
            const importExport = this._settings.get_boolean('import-export');
            if (!importExport) {
                if (key == 'bgpalette')
                    this.updateBguri(this, 'updatePanelStyle');
                else
                    this.backgroundPalette();
            }
            return;
        }

        if (key == 'autotheme-refresh') {
            if (this._settings.get_boolean(key))
                this.updateBguri();
            return;
        }

        if (key == 'auto-bgalpha') {
            AutoThemes.applyAutomaticOpacity(this);
            return;
        }

        // Window-Max bar settings
        if (key == 'wmaxbar') {
            this.onWindowMaxBar();
            return;
        }
        if (key == 'cust-margin-wmax' || key == 'margin-wmax') {
            this.setPanelBoxPosWindowMax(this.wmax, key);
            return;
        }
        if (key == 'buttonbg-wmax' && panel.has_style_pseudo_class('windowmax')) {
            const btnBgWMax = this._settings.get_boolean('buttonbg-wmax');
            const candybar = this._settings.get_boolean('candybar');
            if (candybar)
                btnBgWMax ?
                    panel.add_style_class_name('candybar') :
                    panel.remove_style_class_name('candybar');
            return;
        }

        // Generate and save autothemes for Dark and Light modes
        if (key == 'trigger-autotheme') {
            AutoThemes.autoApplyBGPalette(this, 'dark');
            AutoThemes.autoApplyBGPalette(this, 'light');
            return;
        }

        // Update styles on Dark/Light mode change
        if (callbk_param == 'color-scheme') {
            if (this._blockModeChange)
                return;
            this.onModeChange();
            return;
        }

        // Continue to update triland classes if actor (panel button) removed in trilands mode else return
        let bartype = this._settings.get_string('bartype');
        if (key == this.removedSignal && bartype != 'Trilands')
            return;

        // Generate/Reload stylesheet
        if (key == 'trigger-reload') { // A toggle key to trigger generation and reload of stylesheet
            StyleSheets.reloadStyle(this, this);
            return;
        }
        if (callbk_param == 'high-contrast') { // Reload stylesheet to pick up high contrast icons
            StyleSheets.reloadStyle(this, this);
            return;
        }
        if (key == 'reloadstyle') { // A toggle key to trigger reload of existing stylesheet
            this.reloadStylesheet();
            // continue to style
        }

        // Set bgalpha on change of bartype
        if (key == 'bartype') {
            AutoThemes.applyAutomaticOpacity(this);
            // Some controls change bartype directly, without toggling
            // trigger-reload as Preferences does. Apply the new layout in the
            // Shell immediately instead of leaving the old CSS in place.
            StyleSheets.reloadStyle(this, this);
        }

        // Overview style
        let setOverview = this._settings.get_boolean('set-overview');
        if (key == 'showing' || panel.has_style_pseudo_class('overview')) {
            if (setOverview) {
                if (this.isObarReset) { // Overview style is enabled but obar was reset due to Fullscreen
                    this.loadStylesheet();
                    this.isObarReset = false;
                }
            }
        }
        else if (key == 'hiding') {
            this.setWindowMaxBar('hiding');
            this.onFullScreen(null, 'hiding');
        }

        // Fullscreen style
        if (key == 'set-fullscreen') {
            const fullscreen = this._settings.get_boolean('set-fullscreen');
            if (fullscreen && this.isObarReset) {
                this.loadStylesheet();
                this.isObarReset = false;
            }
            else if (!fullscreen && !this.isObarReset) {
                this.onFullScreen(null, 'fullscreen');
            }
            return;
        }

        // Both Preferences and the dashboard write this setting. Clear the
        // existing music-derived palette immediately when either turns it off.
        if (key === 'immersive-music-theme') {
            if (!this._settings.get_boolean(key))
                this.immersiveColorOverride = null;
            StyleSheets.reloadStyle(this, this);
            return;
        }

        // GTK Apps styles
        let gtkKeys = ['apply-gtk', 'headerbar-hint', 'hbar-gtk3only', 'sidebar-hint', 'sbar-gradient', 'card-hint', 'view-hint', 'window-hint', 'winbradius', 'corner-radius',
            'traffic-light', 'menu-radius', 'gtk-popover', 'mscolor', 'msalpha', 'hscd-color', 'gtk-shadow'];
        if (gtkKeys.includes(key)) {
            // log('Call saveGtkCss from extension for key: ', key);
            this.gtkCSS = true;
            // For mscolor/msalpha, stylesheet will be generated/reloaded and also saveGtkCss will be called (in styleSheets.js)
            // For other keys, call saveGtkCss from here
            if (key != 'mscolor' && key != 'msalpha') {
                StyleSheets.saveGtkCss(this, 'enable');
                const wmaxHbar = this._settings.get_boolean('wmax-hbarhint');
                // Reload styelsheet to match WMax bar with Gtk headerbar
                if ((key == 'headerbar-hint' || key == 'hscd-color') && wmaxHbar)
                    StyleSheets.reloadStyle(this, this);
                return;
            }
        }
        // Flatpak overrides
        if (key == 'apply-flatpak') {
            StyleSheets.saveFlatpakOverrides(this, 'enable');
            return;
        }

        // Menu style
        let menustyle = this._settings.get_boolean('menustyle');
        if (['reloadstyle', 'removestyle', 'menustyle'].includes(key) ||
            (key == this.addedSignal && callbk_param != 'message-banner')) {
            this.applyMenuStyles(panel, menustyle);
        }
        if (key == 'menustyle') {
            StyleSheets.reloadStyle(this, this);
        }

        // Auto set closest Gnome Accent color
        if ((key == 'mscolor' || key == 'menu-sync-system-accent') &&
            this.gnomeVersion >= 47 && this._settings.get_boolean('menu-sync-system-accent')) {
            let closestAccent = AutoThemes.getClosestGnomeAccent(this);
            this._intSettings.set_string('accent-color', closestAccent);
        }
        // Auto set closest Yaru theme
        if (key == 'mscolor' || key == 'set-yarutheme') {
            let setYaruTheme = this._settings.get_boolean('set-yarutheme');
            // The previous themes are stored in GSettings (not in memory) so
            // turning this off after a re-login still restores them.
            if (key == 'set-yarutheme') {
                if (setYaruTheme) {
                    if (!this._settings.get_string('yaru-gtk-backup')) {
                        this._settings.set_string('yaru-gtk-backup', this._intSettings.get_string('gtk-theme'));
                        this._settings.set_string('yaru-icon-backup', this._intSettings.get_string('icon-theme'));
                    }
                }
                else {
                    const gtkBackup = this._settings.get_string('yaru-gtk-backup');
                    const iconBackup = this._settings.get_string('yaru-icon-backup');
                    if (gtkBackup)
                        this._intSettings.set_string('gtk-theme', gtkBackup);
                    if (iconBackup)
                        this._intSettings.set_string('icon-theme', iconBackup);
                    this._settings.set_string('yaru-gtk-backup', '');
                    this._settings.set_string('yaru-icon-backup', '');
                }
            }
            if (setYaruTheme) {
                let colorScheme = this._intSettings.get_string('color-scheme');
                let modeSuffix = colorScheme == 'prefer-dark' ? '-dark' : '';
                let yaruColor = AutoThemes.getClosestYaruTheme(this);
                yaruColor = (yaruColor == 'default') ? '' : '-' + yaruColor;
                let yaruTheme = 'Yaru' + yaruColor + modeSuffix;
                // Yaru only ships on Ubuntu. Never point GTK at a theme that is
                // not installed (that leaves apps with a broken fallback look).
                if (this._isThemeInstalled('themes', yaruTheme))
                    this._intSettings.set_string('gtk-theme', yaruTheme);
                if (this._isThemeInstalled('icons', yaruTheme))
                    this._intSettings.set_string('icon-theme', yaruTheme);
            }
        }

        // Set SVG icons update flags
        if (key == 'mscolor') {
            this.msSVG = true;
            this.smfgSVG = true;
        }
        else if (key == 'mfgcolor' || key == 'mbgcolor' || key == 'smbgcolor' || key == 'smbgoverride') {
            this.smfgSVG = true;
        }
        else if (key == 'mhcolor') {
            this.mhSVG = true;
        }

        // Manual override disables Auto theme font
        if (key == 'font') {
            this._settings.set_boolean('autotheme-font', false);
        }

        // Enable/Disable Fitts Widgets
        if (key == 'fitts-widgets') {
            const fittsWidgets = this._settings.get_boolean('fitts-widgets');
            if (fittsWidgets)
                this.enableFittsWidgets();
            else
                this.disableFittsWidgets();
        }

        let menuKeys = ['trigger-reload', 'reloadstyle', 'removestyle', 'menustyle', 'mfgcolor', 'mfgalpha', 'mbgcolor', 'mbgalpha', 'mbcolor', 'mbalpha',
            'mhcolor', 'mhalpha', 'mscolor', 'msalpha', 'mshcolor', 'mshalpha', 'smbgoverride', 'smbgcolor', 'qtoggle-radius', 'slider-height', 'slider-handle-color-override', 'slider-handle-color', 'mbg-gradient', 'qtile-border', 'menu-sync-system-accent', 'quick-settings-arrow-mode', 'quick-settings-arrow-colors'];
        if (key === 'quick-settings-arrow-mode')
            this._discoverQuickSettingsArrows();
        let barKeys = ['bgcolor', 'gradient', 'gradient-direction', 'bgcolor2', 'bgalpha', 'bgalpha2', 'fgcolor', 'fgalpha', 'bcolor', 'balpha', 'bradius',
            'bordertype', 'shcolor', 'shalpha', 'iscolor', 'isalpha', 'neon', 'shadow', 'font', 'default-font', 'hcolor', 'halpha', 'heffect', 'bgcolor-wmax',
            'bgalpha-wmax', 'neon-wmax', 'boxcolor', 'boxalpha', 'autofg-bar', 'autofg-menu', 'width-top', 'width-bottom', 'width-left', 'width-right',
            'radius-topleft', 'radius-topright', 'radius-bottomleft', 'radius-bottomright'];
        let keys = [...barKeys, ...menuKeys, 'autotheme-dark', 'autotheme-light', 'autotheme-refresh', 'accent-override', 'accent-color', 'apply-menu-shell',
            'dashdock-style', 'dbgcolor', 'dbgalpha', 'dbradius', 'disize', 'dborder', 'dshadow', 'dock-badge-color',
            'hpad', 'vpad', 'bwidth', 'neon-intensity', 'candybar', 'candyalpha',
            'menu-radius', 'notif-radius', 'apply-menu-notif', 'apply-accent-shell', 'apply-all-shell'];
        if (keys.includes(key)) {
            // Preference widgets request a reload, but imported profiles and
            // direct GSettings changes do not. Debouncing in reloadStyle keeps
            // both paths consistent without generating a sheet per signal.
            if (key !== 'reloadstyle' && key !== 'trigger-reload' && key !== 'removestyle')
                StyleSheets.reloadStyle(this, this);
            return;
        }

        // Set PanelBox position
        let position = this._settings.get_string('position');
        let borderWidth = this._settings.get_double('bwidth');
        let height = this._settings.get_double('height');
        let margin = this._settings.get_double('margin');
        let setBottomMargin = this._settings.get_boolean('set-bottom-margin');
        let bottomMargin = this._settings.get_double('bottom-margin');
        if (position == 'Bottom' || key == 'position' || key == 'bartype' || key == 'monitors-changed') {
            // If WMax is On then ignore 'margin' changes (do not set position) else set position
            if (!(this.wmax && (key == 'margin' || key == 'bottom-margin')))
                this.setPanelBoxPosition(position, height, margin, setBottomMargin, bottomMargin, borderWidth, bartype);
        }
        // Reset Fitts Widgets
        const fittsWidgets = this._settings.get_boolean('fitts-widgets');
        if (key == 'position' && fittsWidgets) {
            this.disableFittsWidgets();
            this.enableFittsWidgets();
        }

        // Update background-manager if monitors changed
        if (key == 'monitors-changed')
            this.connectPrimaryBGChanged();

        // Notifications position
        let setNotifications = this._settings.get_boolean('set-notifications');
        let setNotifPos = this._settings.get_boolean('set-notif-position');
        let notifKeys = ['set-notif-position', 'position', 'monitors-changed', 'updated', 'enabled'];
        if (notifKeys.includes(key) && setNotifPos) {
            if (position == 'Bottom')
                Main.messageTray._bannerBin.y_align = Clutter.ActorAlign.END;
            else
                Main.messageTray._bannerBin.y_align = Clutter.ActorAlign.START;
        }
        // Notifications style
        if (key == this.addedSignal && callbk_param == 'message-banner' && setNotifications) {
            Main.messageTray._banner?.add_style_class_name('openmenu');
        }

        this.setPanelStyle(null, key);
        if (['position', 'height', 'margin', 'bottom-margin', 'set-bottom-margin',
            'set-overview', 'set-fullscreen', 'wmax-hbarhint', 'border-wmax',
            'theme-app-grid'].includes(key))
            StyleSheets.reloadStyle(this, this);
    }

    // QSAP: listen for addition of new panels
    // this allows theming QSAP panels when QSAP is enabled after Bar Enhanced
    setupLibpanel(obj, signal, sig_param, menu) {
        if (menu.constructor.name != 'PanelGrid')
            return;

        for (const panelColumn of menu.box.get_children()) {
            this._connections.connect(panelColumn, this.addedSignal, this.updatePanelStyle.bind(this));
        }
        this._connections.connect(menu.box, this.addedSignal, (obj, signal, panelColumn, callbk_param) => {
            this._connections.connect(panelColumn, this.addedSignal, this.updatePanelStyle.bind(this));
        });
    }

    _discoverQuickSettingsArrows() {
        const menu = Main.panel.statusArea.quickSettings?.menu;
        const root = menu?.box;
        if (!root) return;
        const registry = this._settings.get_value('quick-settings-arrow-registry').deep_unpack();
        let changed = false;
        const labelFor = actor => {
            if (typeof actor.title === 'string' && actor.title.trim()) return actor.title.trim();
            for (const child of actor.get_children?.() ?? []) {
                if (child instanceof St.Label && child.text?.trim()) return child.text.trim();
                const found = labelFor(child);
                if (found) return found;
            }
            return null;
        };
        const visit = actor => {
            if (actor.has_style_class_name?.('quick-toggle-arrow') ||
                actor.has_style_class_name?.('quick-toggle-menu-button') ||
                actor.has_style_class_name?.('quick-settings-tile-side-button')) {
                const tile = actor.get_parent?.();
                const title = tile && labelFor(tile);
                if (title) {
                    // The class is stable for the visible title without embedding it in CSS.
                    let hash = 2166136261;
                    for (const char of title) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
                    const id = `tile-${(hash >>> 0).toString(16)}`;
                    this._quickArrowActors ??= new Map();
                    const previousClass = this._quickArrowActors.get(actor);
                    if (previousClass && previousClass !== `be-arrow-${id}`)
                        actor.remove_style_class_name(previousClass);
                    actor.add_style_class_name(`be-arrow-${id}`);
                    this._quickArrowActors.set(actor, `be-arrow-${id}`);
                    if (registry[id] !== title) { registry[id] = title; changed = true; }
                }
            }
            for (const child of actor.get_children?.() ?? []) visit(child);
        };
        visit(root);
        if (changed)
            this._settings.set_value('quick-settings-arrow-registry', new GLib.Variant('a{ss}', registry));
    }

    // Find the monitor which has the panel/panelBox
    getPanelMonitor() {
        let panelMonIndex = 0;
        const LM = Main.layoutManager;
        const monitors = LM.monitors;
        const panelBox = LM.panelBox;
        for (let i = 0; i < monitors.length; i++) {
            let monitor = monitors[i];
            if (panelBox.x >= monitor.x && panelBox.x < (monitor.x + monitor.width) &&
                panelBox.y >= monitor.y && panelBox.y < (monitor.y + monitor.height)) {
                panelMonIndex = i;
                break;
            }
        }
        return [monitors[panelMonIndex], panelMonIndex];
    }

    setPanelBoxPosition(position, height, margin, setBottomMargin, bottomMargin, borderWidth, bartype) {
        let panelMonitor = this.getPanelMonitor()[0];
        let panelBox = Main.layoutManager.panelBox;
        if (position == 'Top') {
            let topX = panelMonitor.x;
            let topY = panelMonitor.y;
            panelBox.set_position(topX, topY);
            panelBox.set_size(panelMonitor.width, -1);
        }
        else if (position == 'Bottom') {
            margin = (bartype == 'Mainland') ? 0 : margin;
            borderWidth = (bartype == 'Trilands' || bartype == 'Islands') ? 0 : borderWidth;
            let windowGap = setBottomMargin ? bottomMargin : margin;
            let panelBoxHeight = height + 2 * borderWidth + margin + windowGap;
            // Scale height by Display Scaling factor
            panelBoxHeight = this.themeContext.scale_factor * panelBoxHeight;
            let bottomX = panelMonitor.x;
            let bottomY = panelMonitor.y + panelMonitor.height - panelBoxHeight;
            panelBox.set_position(bottomX, bottomY);
            panelBox.set_size(panelMonitor.width, panelBoxHeight);
        }
    }

    // Set panelbox position for window max
    // Need to set panelBox position since bar margins/height can change with WMax
    setPanelBoxPosWindowMax(wmax, signal) {
        const position = this._settings.get_string('position');
        if (position == 'Bottom') {
            if (this.position == position && this.wmax == wmax && !(signal == 'cust-margin-wmax' || signal == 'margin-wmax'))
                return;
            const bartype = this._settings.get_string('bartype');
            const borderWidth = this._settings.get_double('bwidth');
            const custMarginWmax = this._settings.get_boolean('cust-margin-wmax');
            const marginWMax = this._settings.get_double('margin-wmax');
            let margin = this._settings.get_double('margin');
            let bottomMargin = this._settings.get_double('bottom-margin');
            const height = this._settings.get_double('height');
            if (wmax) {
                margin = custMarginWmax ? marginWMax : margin;
            }
            this.setPanelBoxPosition(position, height, margin, false, bottomMargin, borderWidth, bartype);
            this.wmax = wmax;
            this.position = position;
        }
        else if (position == 'Top') {
            if (this.position == position)
                return;
            this.setPanelBoxPosition(position);
            this.position = position;
        }
    }

    // Check for maximized window on Panel monitor
    setWindowMaxBar(obj, signal, sig2) {
        // Retain wmax status as-is in Overview (do nothing here)
        if (!this._settings || Main.panel.has_style_pseudo_class('overview'))
            return;

        const wmaxbar = this._settings.get_boolean('wmaxbar');
        if (!wmaxbar) {
            if (Main.panel.has_style_pseudo_class('windowmax')) {
                Main.panel.remove_style_pseudo_class('windowmax');
                this.setPanelBoxPosWindowMax(false, signal);
            }
            return;
        }

        // Find out index of the monitor which has the panel/panelBox
        let panelMonIndex = this.getPanelMonitor()[1];

        // Get valid windows maximized on the monitor with panel
        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows().filter(window =>
            window.get_monitor() == panelMonIndex &&
            window.showing_on_its_workspace() &&
            !window.is_hidden() &&
            window.get_window_type() !== Meta.WindowType.DESKTOP && // exclude Desktop
            window.get_gtk_application_id() !== "com.rastersoft.ding" && // exclude Desktop Icons NG
            (window.maximized_horizontally || window.maximized_vertically) &&
            !window.fullscreen
        );
        // for(const window of windows)
        //     log('window:', window.get_gtk_application_id());

        const btnBgWMax = this._settings.get_boolean('buttonbg-wmax');
        const candybar = this._settings.get_boolean('candybar');
        if (windows.length) {
            Main.panel.add_style_pseudo_class('windowmax');
            if (candybar && !btnBgWMax) // Disable candybar button-colors when in WMax
                Main.panel.remove_style_class_name('candybar');
            this.setPanelBoxPosWindowMax(true, signal);
        }
        else {
            Main.panel.remove_style_pseudo_class('windowmax');
            if (candybar && !btnBgWMax) // Enable candybar button-colors when not in WMax
                Main.panel.add_style_class_name('candybar');
            this.setPanelBoxPosWindowMax(false, signal);
        }
    }

    onWindowAdded(obj, signal, windowActor) {
        // A compositor notification can arrive after Window-Max was disabled.
        // In that case its registry has already been released.
        if (!this._windowSignals)
            return;

        if (windowActor) {
            this._windowSignals.set(windowActor, [
                windowActor.connect('notify::visible', () => this.setWindowMaxBar('notify-visible')),
            ]);

            if (windowActor.meta_window) {
                this._windowSignals.set(windowActor.meta_window, [
                    windowActor.meta_window.connect('notify::minimized', () => this.setWindowMaxBar('minimized')),
                    windowActor.meta_window.connect('size-changed', () => this.setWindowMaxBar('size-changed')),
                    windowActor.meta_window.connect('shown', () => this.setWindowMaxBar('shown')),
                ]);
            }
        }
        this.setWindowMaxBar(this.addedSignal);
    }

    onWindowRemoved(obj, signal, windowActor) {
        if (!this._windowSignals)
            return;

        // A removed actor can already have lost its Meta.Window while Mutter is
        // tearing down a window.  Keep cleanup best-effort instead of throwing
        // from a late signal and leaving the Window-Max state half-updated.
        let winSigActors = [windowActor, windowActor?.meta_window];
        for (const winSigActor of winSigActors) {
            if (winSigActor) {
                let windowSignals = this._windowSignals.get(winSigActor);
                if (windowSignals) {
                    for (const id of windowSignals) {
                        winSigActor.disconnect(id);
                    }
                    this._windowSignals.delete(winSigActor);
                }
            }
        }
        this.setWindowMaxBar(this.removedSignal);
    }

    // Connect/disconnect window signals based on Window-Max bar On/Off
    onWindowMaxBar() {
        let wmaxbar = this._settings.get_boolean('wmaxbar');
        if (wmaxbar) {
            // The setting callback can fire more than once while this mode is
            // already enabled. Reusing the existing registry prevents duplicate
            // window-group connections and orphaned per-window signal IDs.
            if (this._windowSignals) {
                this.setWindowMaxBar('wmaxbar-refresh');
                return;
            }
            this._windowSignals = new Map();
            const windowActors = this.gnomeVersion < 48 ? global.get_window_actors() : global.compositor.get_window_actors();
            for (const window of windowActors) {
                this.onWindowAdded(null, 'enabled', window);
            }
            this._connections.connect(global.window_group, this.addedSignal, this.onWindowAdded.bind(this));
            this._connections.connect(global.window_group, this.removedSignal, this.onWindowRemoved.bind(this));
        }
        else {
            this._connections.disconnect(global.window_group, this.addedSignal);
            this._connections.disconnect(global.window_group, this.removedSignal);
            this.disconnectWindowSignals();
            Main.panel.remove_style_pseudo_class('windowmax');
            this.setPanelBoxPosWindowMax(false);
        }
    }

    disconnectWindowSignals() {
        if (this._windowSignals) {
            for (const [windowActor, ids] of this._windowSignals) {
                for (const id of ids) {
                    // log('disconnectWindowSignals - id: ', id);
                    if (windowActor && id > 0)
                        windowActor.disconnect(id);
                }
            }
        }
        this._windowSignals = null;
    }

    onFullScreen(obj, signal, sig_param, timeout = 0) {
        if (this._settings.get_boolean('set-fullscreen'))
            return;

        // Timeout to allow other extensions to move panel to another monitor
        // Coalesce rapid fullscreen notifications so an older callback cannot
        // reload styles after a newer fullscreen state (or after disable).
        if (this.onFullScrTimeoutId) {
            GLib.Source.remove(this.onFullScrTimeoutId);
            this.onFullScrTimeoutId = null;
        }
        this.onFullScrTimeoutId =
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout, () => {
                // Check if panelBox is on the monitor which is in fullscreen
                const LM = Main.layoutManager;
                let panelBoxMonitor = this.getPanelMonitor()[0];
                let panelFullMonFound = false;
                for (const monitor of LM.monitors) {
                    if (monitor.inFullscreen && monitor == panelBoxMonitor) {
                        this.unloadStylesheet();
                        this.isObarReset = true;
                        panelFullMonFound = true;
                        break;
                    }
                }
                if (!panelFullMonFound && this.isObarReset) {
                    this.loadStylesheet();
                    this.isObarReset = false;
                }
                this.onFullScrTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
    }

    onModeChange() {
        this.gtkCSS = true;
        StyleSheets.saveGtkCss(this, 'enable');
        AutoThemes.onModeChange(this);
    }

    updateBguri(obj, signal) {
        // log('update bguri called for signal ', signal);
        // Coalesce rapid GNOME background notifications without dropping the
        // most recent update.
        if (this.updatingBguri) {
            this._pendingBguriUpdate = true;
            return;
        }
        this.updatingBguri = true;
        let colorScheme = this._intSettings.get_string('color-scheme');
        if (colorScheme != this.colorScheme) {
            this.colorScheme = colorScheme;
        }

        this.updateBguriId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            try {
                let bguriDark = this._bgSettings.get_string('picture-uri-dark');
                let bguriLight = this._bgSettings.get_string('picture-uri');
                this._settings.set_string('dark-bguri', bguriDark);
                this._settings.set_string('light-bguri', bguriLight);

                let bguriOld = this._settings.get_string('bguri');
                let bguriNew;
                if (colorScheme == 'prefer-dark')
                    bguriNew = bguriDark;
                else
                    bguriNew = bguriLight;
                this._settings.set_string('bguri', bguriNew);

                // GNOME may emit a background change without changing its URI.
                if (bguriOld == bguriNew)
                    this.updatePanelStyle(this._settings, 'bguri');
            } finally {
                this.updateBguriId = null;
                this.updatingBguri = false;
                if (this._pendingBguriUpdate) {
                    this._pendingBguriUpdate = false;
                    this.updateBguri();
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    // Connect multiple signals to ensure detecting background-change in all Gnome versions
    connectPrimaryBGChanged() {
        const pMonitorIdx = Main.layoutManager.primaryIndex;
        // Disconnect previous signals to prevent duplication
        try {
            if (this._primaryBgManager) {
                this._connections.disconnect(this._primaryBgManager, 'changed');
                this._primaryBgManager = null;
            }
            this._connections.disconnect(this._bgSettings, 'changed::picture-uri');
            this._connections.disconnect(this._bgSettings, 'changed::picture-uri-dark');
            this._connections.disconnect(this._intSettings, 'changed::color-scheme');
        } catch(e) {}

        const bgManager = Main.layoutManager._bgManagers?.[pMonitorIdx];
        if (bgManager) {
            this._connections.connect(bgManager, 'changed', this.updateBguri.bind(this));
            this._primaryBgManager = bgManager;
        }
        this._connections.connect(this._bgSettings, 'changed::picture-uri', this.updateBguri.bind(this));
        this._connections.connect(this._bgSettings, 'changed::picture-uri-dark', this.updateBguri.bind(this));
        this._connections.connect(this._intSettings, 'changed::color-scheme', this.updatePanelStyle.bind(this), 'color-scheme');
    }

    createFittsWidget(box, btn) {
        if (!this._settings || !box || !btn)
            return;
        let panel = Main.panel;
        let panelBox = Main.layoutManager.panelBox;
        let position = this._settings.get_string('position');

        if (!btn.FittsWidget &&
            (btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox) &&
            btn.child.visible) {

            btn.FittsWidget = new St.Widget({
                x: panelBox.x + panel.x + box.x + btn.x,
                width: btn.width,
                y: panelBox.y,
                height: panel.y + btn.child.y,
                reactive: true,
                track_hover: true,
                visible: true,
                // style: 'background-color: rgba(200, 200, 0, 0.35);'
            });
            if (position == 'Bottom')
                btn.FittsWidget.y = panelBox.y + panelBox.height - btn.FittsWidget.height;

            // Connect to btn destroy signal to also destroy its FittsWidget
            btn.destroyFittsId = btn.connect('destroy', () => { this.destroyFittsWidget(btn); });

            // Bind x of FittsWidget to params it depends on: panelBox.x + panel.x + box.x + btn.x
            btn.bind_property_full('x', btn.FittsWidget, 'x', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, panelBox.x + panel.x + box.x + value], null);
            box.bind_property_full('x', btn.FittsWidget, 'x', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, panelBox.x + panel.x + value + btn.x], null);
            panel.bind_property_full('x', btn.FittsWidget, 'x', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, panelBox.x + value + box.x + btn.x], null);
            panelBox.bind_property_full('x', btn.FittsWidget, 'x', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, value + panel.x + box.x + btn.x], null);

            // Bind width of FittsWidget to params it depends on: btn.width
            btn.bind_property('width', btn.FittsWidget, 'width', GObject.BindingFlags.SYNC_CREATE);

            // Bind y of FittsWidget to params it depends on: Top Panel => panelBox.y OR
            // Bottom Panel => panelBox.y + panelBox.height - btn.FittsWidget.height
            if (position == 'Top')
                panelBox.bind_property('y', btn.FittsWidget, 'y', GObject.BindingFlags.SYNC_CREATE);
            else if (position == 'Bottom') {
                panelBox.bind_property_full('y', btn.FittsWidget, 'y', GObject.BindingFlags.SYNC_CREATE,
                    (bind, value) => [true, value + panelBox.height - btn.FittsWidget.height], null);
                panelBox.bind_property_full('height', btn.FittsWidget, 'y', GObject.BindingFlags.SYNC_CREATE,
                    (bind, value) => [true, panelBox.y + value - btn.FittsWidget.height], null);
                btn.FittsWidget.bind_property_full('height', btn.FittsWidget, 'y', GObject.BindingFlags.SYNC_CREATE,
                    (bind, value) => [true, panelBox.y + panelBox.height - value], null);
            }

            // Bind height of FittsWidget to params it depends on: panel.y + btn.child.y
            panel.bind_property_full('y', btn.FittsWidget, 'height', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, value + btn.child.y], null);
            btn.child.bind_property_full('y', btn.FittsWidget, 'height', GObject.BindingFlags.SYNC_CREATE,
                (bind, value) => [true, panel.y + value], null);

            // Connect signals for hover
            this._connections.connect(btn.FittsWidget, 'enter-event', (actor, signal, event) => {
                btn.child.add_style_pseudo_class('hover');
                return Clutter.EVENT_PROPAGATE;
            });;
            this._connections.connect(btn.FittsWidget, 'leave-event', (actor, signal, event) => {
                btn.child.remove_style_pseudo_class('hover');
                return Clutter.EVENT_PROPAGATE;
            });;

            // Connect signals for captured-event
            this._connections.connect(btn.FittsWidget, 'captured-event', (actor, signal, event) => {
                btn.child.event(event, false);
                return Clutter.EVENT_PROPAGATE;
            });;

            Main.layoutManager.addChrome(btn.FittsWidget, { trackFullscreen: true });
        }
    }

    destroyFittsWidget(btn) {
        if (btn.FittsWidget) {
            Main.layoutManager.removeChrome(btn.FittsWidget);
            btn.FittsWidget.destroy();
            delete btn.FittsWidget;
        }
    }

    createFittsCornerWidgets() {
        let panel = Main.panel;
        let panelBox = Main.layoutManager.panelBox;

        for (const idx of [0, 1]) {
            if ((idx == 0 && !panel.leftFittsWidget) || (idx == 1 && !panel.rightFittsWidget)) {
                let widget = new St.Widget({
                    x: (idx == 0) ? panelBox.x : panelBox.x + panelBox.width - panel.x - panel._leftBox.x - 2, // 2 for border width
                    width: panel.x + panel._leftBox.x + 2,
                    y: panelBox.y,
                    height: panelBox.height,
                    reactive: true,
                    track_hover: true,
                    visible: true,
                    // style: 'background-color: rgba(200, 100, 0, 0.35);'
                });

                if (idx == 0) { // Bind x of leftFittsWidget to params it depends on: panelBox.x
                    panelBox.bind_property('x', widget, 'x', GObject.BindingFlags.SYNC_CREATE);
                }
                else { // Bind x of rightFittsWidget to params it depends on: panelBox.x + panelBox.width - panel.x - panel._leftBox.x - 2
                    panelBox.bind_property_full('x', widget, 'x', GObject.BindingFlags.SYNC_CREATE,
                        (bind, value) => [true, value + panelBox.width - panel.x - panel._leftBox.x - 2], null);
                    panelBox.bind_property_full('width', widget, 'x', GObject.BindingFlags.SYNC_CREATE,
                        (bind, value) => [true, panelBox.x + value - panel.x - panel._leftBox.x - 2], null);
                    panel.bind_property_full('x', widget, 'x', GObject.BindingFlags.SYNC_CREATE,
                        (bind, value) => [true, panelBox.x + panelBox.width - value - panel._leftBox.x - 2], null);
                    panel._leftBox.bind_property_full('x', widget, 'x', GObject.BindingFlags.SYNC_CREATE,
                        (bind, value) => [true, panelBox.x + panelBox.width - panel.x - value - 2], null);
                }
                // Bind width of FittsWidget to params it depends on: panel.x + panel._leftBox.x + 2
                panel.bind_property_full('x', widget, 'width', GObject.BindingFlags.SYNC_CREATE,
                    (bind, value) => [true, value + panel._leftBox.x + 2], null);
                panel._leftBox.bind_property_full('x', widget, 'width', GObject.BindingFlags.SYNC_CREATE,
                    (bind, value) => [true, panel.x + value + 2], null);
                // Bind y of FittsWidget to params it depends on: panelBox.y
                panelBox.bind_property('y', widget, 'y', GObject.BindingFlags.SYNC_CREATE);
                // Bind height of FittsWidget to params it depends on: panelBox.height
                panelBox.bind_property('height', widget, 'height', GObject.BindingFlags.SYNC_CREATE);

                // Get leftmost or rightmost visible button in the panel
                let btn, box;
                box = (idx == 0) ? this.panelBoxes[0] : this.panelBoxes[2];
                for (const boxBtn of box) {
                    if ((boxBtn.child instanceof PanelMenu.Button ||
                        boxBtn.child instanceof PanelMenu.ButtonBox) &&
                        boxBtn.child.visible)
                        btn = boxBtn;
                    if (idx == 0)
                        break;
                }

                // Connect signals for hover
                widget.connect('enter-event', (actor, event) => {
                    btn.child.add_style_pseudo_class('hover');
                    return Clutter.EVENT_PROPAGATE;
                });
                widget.connect('leave-event', (actor, event) => {
                    btn.child.remove_style_pseudo_class('hover');
                    return Clutter.EVENT_PROPAGATE;
                });
                // Connect signals for captured-event
                widget.connect('captured-event', (actor, event) => {
                    btn.child.event(event, false);
                    return Clutter.EVENT_PROPAGATE;
                });

                if (idx == 0) {
                    panel.leftCornerButton = btn;
                    panel.leftFittsWidget = widget;
                }
                else {
                    panel.rightCornerButton = btn;
                    panel.rightFittsWidget = widget;
                }
                Main.layoutManager.addChrome(widget, { trackFullscreen: true });
            }
        }
    }

    destroyFittsCornerWidgets() {
        let panel = Main.panel;
        if (panel.leftFittsWidget) {
            // log('Destroy Left Corner', String(panel.leftFittsWidget));
            Main.layoutManager.removeChrome(panel.leftFittsWidget);
            panel.leftFittsWidget.destroy();
            panel.leftFittsWidget = null;
            delete panel.leftFittsWidget;
            panel.leftCornerButton = null;
            delete panel.leftCornerButton;
        }
        if (panel.rightFittsWidget) {
            // log('Destroy Right Corner', String(panel.rightFittsWidget));
            Main.layoutManager.removeChrome(panel.rightFittsWidget);
            panel.rightFittsWidget.destroy();
            panel.rightFittsWidget = null;
            delete panel.rightFittsWidget;
            panel.rightCornerButton = null;
            delete panel.rightCornerButton;
        }
    }

    // Add / Remove Fitts Button Widgets and Corner Widgets
    addRemoveFittsWidgets(add) {
        for (const box of this.panelBoxes) {
            for (const btn of box) {
                if (add)
                    this.createFittsWidget(box, btn);
                else {
                    this.destroyFittsWidget(btn);
                    if (btn.destroyFittsId > 0)
                        btn.disconnect(btn.destroyFittsId);
                    delete btn.destroyFittsId;
                }
            }
        }

        if (add) {
            this.createFittsCornerWidgets();
        }
        else
            this.destroyFittsCornerWidgets();
    }

    updateFittsWidgetVisible(btn, child) {
        if (btn.child.visible)
            this.createFittsWidget(btn.get_parent(), btn);
        else
            this.destroyFittsWidget(btn);
    }

    connectFittsWidgetVisible(connect) {
        for (const box of this.panelBoxes) {
            for (const btn of box) {
                if (btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox) {
                    if (connect)
                        this._connections.connect(btn.child, 'notify::visible', this.updateFittsWidgetVisible.bind(this, btn));
                    else
                        this._connections.disconnect(btn.child, 'notify::visible');
                }
            }
        }
    }

    updateFittsWidgetAddRemove(box, key, btn) {
        if (this.fittsCornerTimeoutId) {
            GLib.Source.remove(this.fittsCornerTimeoutId);
            this.fittsCornerTimeoutId = null;
        }
        if (this.disabling) {
            return;
        }

        let panel = Main.panel;
        if ((key == this.addedSignal &&
            (btn == this.panelBoxes[0].get_first_child() || btn == this.panelBoxes[2].get_last_child())) ||
            (key == this.removedSignal &&
                (btn == panel.leftCornerButton || btn == panel.rightCornerButton))) {
            this.destroyFittsCornerWidgets();
            // Wait for Panel to update its x, width then create CornerWidgets
            this.fittsCornerTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                this.createFittsCornerWidgets();
                this.fittsCornerTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        if (!(btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox))
            return;

        if (key == this.addedSignal) {
            this._connections.connect(btn.child, 'notify::visible', this.updateFittsWidgetVisible.bind(this, btn));
            if (btn.child.visible)
                this.createFittsWidget(box, btn);
        }
        else if (key == this.removedSignal)
            this.destroyFittsWidget(btn);
    }

    connectFittsWidgetAddRemove(connect) {
        for (const box of this.panelBoxes) {
            if (connect) {
                this._connections.connect(box, this.addedSignal, this.updateFittsWidgetAddRemove.bind(this));
                this._connections.connect(box, this.removedSignal, this.updateFittsWidgetAddRemove.bind(this));
            }
            else {
                this._connections.disconnect(box, this.addedSignal);
                this._connections.disconnect(box, this.removedSignal);
            }
        }
    }

    enableFittsWidgets() {
        this.addRemoveFittsWidgets(true);
        this.connectFittsWidgetVisible(true);
        this.connectFittsWidgetAddRemove(true);
    }

    disableFittsWidgets() {
        this.connectFittsWidgetAddRemove(false);
        this.connectFittsWidgetVisible(false);
        this.addRemoveFittsWidgets(false);
    }

    postStartup() {
        this.postStartupId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this.setPanelStyle(null, 'post-startup');
            this.postStartupId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    enable() {
        const lifecycleGeneration = ++this._lifecycleGeneration;
        // Get Gnome version
        const [major, minor] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));
        this.gnomeVersion = major;

        // Get the top panel
        let panel = Main.panel;
        this.panelBoxes = [panel._leftBox, panel._centerBox, panel._rightBox];

        this.main = Main;
        this.msSVG = true;
        this.mhSVG = true;
        this.smfgSVG = true;
        this.gtkCSS = true;
        this.position = null;
        this.wmax = null;
        this.isObarReset = false;
        this.addedSignal = this.gnomeVersion > 45 ? 'child-added' : 'actor-added';
        this.removedSignal = this.gnomeVersion > 45 ? 'child-removed' : 'actor-removed';
        this._calendarTimeoutIds = new Set();
        this.bgMgrTimeOutId = null;
        this.onFullScrTimeoutId = null;
        this.msgLists = [];
        this.msgListIds = [];
        this.styleUnloaded = false;
        this.updatingBguri = false;
        this._pendingBguriUpdate = false;
        this.updateBguriId = null;
        this.postStartupId = null;
        this.disabling = false;
        this._styleReloadInFlight = false;
        this._styleReloadQueued = false;
        this._styleReloadGeneration = 0;
        this._focusGlowStyles = new Map();
        this._pywalGeneration = 0;
        this._primaryBgManager = null;

        // Settings for desktop background image (set bg-uri as per color scheme)
        this._bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        this._intSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        this._hcSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.a11y.interface' });
        this.colorScheme = this._intSettings.get_string('color-scheme');

        // Get global theme context (for display scaling)
        this.themeContext = St.ThemeContext.get_for_stage(global.stage);

        this._settings = this.getSettings();
        // this.bgalpha = this._settings.get_double('bgalpha');
        this._settings.set_boolean('import-export', false);
        this._settings.set_boolean('pause-reload', false);
        if (this._settings.get_boolean('enable-gtk-window-custom'))
            this._settings.set_boolean('enable-gtk-window-custom', false);
        if (this._settings.get_double('winbwidth') !== 0)
            this._settings.set_double('winbwidth', 0);
        if (this._settings.get_double('winbalpha') !== 0)
            this._settings.set_double('winbalpha', 0);

        let panelMonitor = this.getPanelMonitor()[0];
        this._settings.set_int('monitor-height', panelMonitor.height);
        this._settings.set_int('monitor-width', panelMonitor.width);

        // Connect to the settings changes
        this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
            if (key === 'pywal-sync') {
                if (settings.get_boolean(key)) {
                    this._startPywalMonitor();
                } else {
                    this._stopPywalMonitor();
                    this._restorePywalBackup();
                }
            }
            this.updatePanelStyle(settings, key);
            if (['focus-glow', 'neon-intensity', 'bartype', 'balpha', 'height', 'vpad', 'bradius', 'gradient'].includes(key)) {
                this._onFocusWindowChanged();
            }
        });

        let connections = [
            [Main.overview, 'hiding', this.updatePanelStyle.bind(this)],
            [Main.overview, 'showing', this.updatePanelStyle.bind(this)],
            [Main.layoutManager, 'monitors-changed', this.updatePanelStyle.bind(this)],
            [Main.messageTray._bannerBin, this.addedSignal, this.updatePanelStyle.bind(this), 'message-banner'],
            [global.display, 'in-fullscreen-changed', this.onFullScreen.bind(this), 100],
            [global.display, 'window-entered-monitor', this.setWindowMaxBar.bind(this), 'window-entered-monitor'],
            [global.display, 'window-left-monitor', this.setWindowMaxBar.bind(this), 'window-left-monitor'],
            [global.display, 'notify::focus-window', this._onFocusWindowChanged.bind(this), 'focus-window'],
            [Main.layoutManager, 'startup-complete', this.postStartup.bind(this)],
            // [ Main.sessionMode, 'updated', this.updatePanelStyle.bind(this), 'session-mode-updated' ],
        ];
        // Connections for actor-added/removed OR child-added/removed as per Gnome version
        for (const panelBox of this.panelBoxes) {
            connections.push([panelBox, this.addedSignal, this.updatePanelStyle.bind(this)]);
            connections.push([panelBox, this.removedSignal, this.updatePanelStyle.bind(this)]);
        }
        // Connections for panel buttons notify::visible
        for (const box of this.panelBoxes) {
            for (const btn of box) {
                if (btn.child instanceof PanelMenu.Button || btn.child instanceof PanelMenu.ButtonBox) {
                    if (btn.child.constructor.name === 'ATIndicator' || btn.child.constructor.name === 'InputSourceIndicator'
                        || btn.child.constructor.name === 'DwellClickIndicator') {
                        connections.push([btn.child, 'notify::visible', this.setPanelStyle.bind(this)]);
                    }
                }
            }
        }
        // Connection for Toggle Switch status shapes in High Contrast
        if (this.gnomeVersion <= 45) {
            connections.push([this._hcSettings, 'changed::high-contrast', this.updatePanelStyle.bind(this), 'high-contrast']);
        }
        // Connection specific to QSAP extension (Quick Settings)
        if (this.gnomeVersion > 42) {
            let qSettings = Main.panel.statusArea.quickSettings;
            connections.push([qSettings, 'menu-set', this.setupLibpanel.bind(this), qSettings.menu]);
            if (qSettings.menu)
                connections.push([qSettings.menu, 'open-state-changed', (_menu, isOpen) => {
                    if (isOpen) this._discoverQuickSettingsArrows();
                }]);
        }
        // Connection specific to Workspace indicator dots
        if (this.gnomeVersion > 44) {
            connections.push([global.workspace_manager, 'notify::n-workspaces', this.updatePanelStyle.bind(this)]);
        }

        // Setup all connections
        this._connections = new ConnectManager(connections);

        // Setup connections for addition of new QSAP extension panels
        if (this.gnomeVersion > 42)
            this.setupLibpanel(null, 'enabled', null, Main.panel.statusArea.quickSettings.menu);

        // Observe desktop settings immediately; the background manager itself
        // may not exist until Shell finishes creating the stage.
        this.connectPrimaryBGChanged();
        // Retry once to attach to the background manager when it is available.
        this.bgMgrTimeOutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this.connectPrimaryBGChanged();
            this.bgMgrTimeOutId = null;
            return GLib.SOURCE_REMOVE;
        });
        // Always refresh the current background on enable. A cached bguri used
        // to skip palette extraction entirely after a disable/enable cycle.
        this.updateBguri();
        // If mode was changed while BarEnhanced was disabled, update styles too.
        let obarScheme = this._settings.get_string('color-scheme');
        if (obarScheme != this.colorScheme)
            this.onModeChange();

        // Update calendar style on Calendar rebuild through fn injection
        const obar = this;
        this._injections["_rebuildCalendar"] = this._injectToFunction(
            Main.panel.statusArea.dateMenu._calendar,
            "_rebuildCalendar",
            function () {
                if (!obar._settings) {
                    return;
                }
                let menustyle = obar._settings.get_boolean('menustyle');
                if (menustyle) {
                    obar.applyCalendarGridStyle(this, menustyle);
                }
            }
        );

        // BarEnhanced runtime directory
        const userRunDir = GLib.get_user_runtime_dir();
        this.obarRunDir = Gio.File.new_for_path(`${userRunDir}/io.github.mrvanguardia.barEnhanced`);
        this.obarAssetsDir = Gio.File.new_for_path(`${this.obarRunDir.get_path()}/assets`);
        const assetsSrcDir = Gio.File.new_for_path(`${this.path}/media/assets`);
        this._runtimeAssetsCancellable = new Gio.Cancellable();
        this._runtimeAssetsReady = this._copyRuntimeAssets(
            assetsSrcDir, this.obarAssetsDir, this._runtimeAssetsCancellable);

        // Add 'barEnhanced' class to top panel and panelBox
        panel.add_style_class_name('barEnhanced');
        Main.layoutManager.panelBox.add_style_class_name('barEnhanced');

        this._walMonitor = null;
        this._walMonitorId = 0;
        this._walMonitorScope = null;
        if (this._settings.get_boolean('pywal-sync'))
            this._startPywalMonitor();

        // Connect palette changes to HydroWidgets
        this._paletteSettingsIds = [
            this._settings.connect('changed::palette1', () => {
                if (this.hydroWidgetsManager) this.hydroWidgetsManager.applyMonetColors();
            }),
            this._settings.connect('changed::palette2', () => {
                if (this.hydroWidgetsManager) this.hydroWidgetsManager.applyMonetColors();
            }),
            this._settings.connect('changed::palette3', () => {
                if (this.hydroWidgetsManager) this.hydroWidgetsManager.applyMonetColors();
            })
        ];

        // Cause stylesheet to save and reload on Enable (also creates gtk css)
        StyleSheets.reloadStyle(this, this);
        // Add Bar Enhanced Flatpak Overrides
        StyleSheets.saveFlatpakOverrides(this, 'enable');

        // Setup and add the custom Glassmorphic Dashboard Widget Center based on user visibility preferences
        this.dashboardBtn = null;
        this._showDashboardId = 0;
        this._updateDashboardVisibility();
        this._showDashboardId = this._settings.connect('changed::show-dashboard', () => {
            this._updateDashboardVisibility();
        });

        // Apply the initial style
        this.updatePanelStyle(null, 'enabled');
        this._onFocusWindowChanged();
        let menustyle = this._settings.get_boolean('menustyle');
        this.applyMenuStyles(panel, menustyle);
        // Refresh to fix any indicators added during initial styling
        this.enableStyleTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this.updatePanelStyle(null, 'enabled');
            this.applyMenuStyles(panel, menustyle);
            this._onFocusWindowChanged();
            this.enableStyleTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });

        // Set initial Window Max Bar
        this.onWindowMaxBar();

        // Set fullscreen mode if in Fullscreen when extension is enabled
        this.onFullScreen(null, 'enabled', null, 100);

        /* Fitts Widgets:
         * Add a widget to PanelBox for each button.
         * Widget x1,x2 as per btn and y1,y2 to extend button interaction to screen-edge.
         * Track widget events and send to button.
         */
        // Do not enable if Dash-to-Panel is On
        this._shellSettings = new Gio.Settings({ schema_id: 'org.gnome.shell' });
        let enabledExtensions = this._shellSettings.get_strv('enabled-extensions');
        let dtpOn = enabledExtensions.includes('dash-to-panel@jderose9.github.com');
        // Enable button proximity to interact with panel buttons without having to point precisely at them.
        const fittsWidgets = this._settings.get_boolean('fitts-widgets');
        if (fittsWidgets && !dtpOn)
            this.fittsEnableTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
                if (this._lifecycleGeneration !== lifecycleGeneration || !this._settings)
                    return GLib.SOURCE_REMOVE;
                this.enableFittsWidgets();
                this.fittsEnableTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });

        // Synchronize with Fedora/GNOME active system accent color in real-time
        this._interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        this._interfaceSettingsId = 0;
        this._systemAccentSyncSettingId = this._settings.connect('changed::system-accent-sync', () => {
            this._updateSystemAccentMonitor();
        });
        // enable() already regenerates the stylesheet; only attach the listener.
        this._updateSystemAccentMonitor(false);
        // this.updateWindowsBlur();

        // Dash to Dock
        this._syncDashToDock();
        this._dashToDockSettingId = this._settings.connect('changed::dash-to-dock-enabled', () => {
            this._syncDashToDock();
            // The root stylesheet contains optional visual rules for the
            // embedded dock. Regenerate it now so disabling the module removes
            // every #dash selector instead of leaving stale CSS behind.
            StyleSheets.reloadStyle(this, this);
        });
        // Re-evaluate when the user turns Ubuntu Dock / Dash to Dock on or off.
        this._dockConflictSettingIds = ['changed::enabled-extensions', 'changed::disabled-extensions']
            .map(signal => this._shellSettings.connect(signal, () => {
                const hadDock = !!this.dockManager;
                this._syncDashToDock();
                if (hadDock !== !!this.dockManager)
                    StyleSheets.reloadStyle(this, this);
            }));
        this._dockConflictStateId = Main.extensionManager.connect('extension-state-changed', (_manager, changedExtension) => {
            if (!['ubuntu-dock@ubuntu.com', 'dash-to-dock@micxgx.gmail.com'].includes(changedExtension?.uuid))
                return;
            const hadDock = !!this.dockManager;
            this._syncDashToDock();
            if (hadDock !== !!this.dockManager)
                StyleSheets.reloadStyle(this, this);
        });

        // Dynamic Music Pill
        this._musicPillEnabled = this._settings.get_boolean('music-pill-enabled');
        this._hydroMediaEnabled = this._settings.get_boolean('hydro-media-enabled');
        
        if (this._musicPillEnabled || this._hydroMediaEnabled) this._enableMusicPill();
        
        this._musicPillSettingId = this._settings.connect('changed::music-pill-enabled', () => {
            this._musicPillEnabled = this._settings.get_boolean('music-pill-enabled');
            if (this._musicPillEnabled) this._enableMusicPill();
            else this._disableMusicPill();
        });
        
        this._hydroMediaSettingId = this._settings.connect('changed::hydro-media-enabled', () => {
            this._hydroMediaEnabled = this._settings.get_boolean('hydro-media-enabled');
            if (this._hydroMediaEnabled) this._enableMusicPill();
            else if (!this._musicPillEnabled) this._disableMusicPill();
        });

        // Vitals
        this._vitalsEnabled = this._settings.get_boolean('vitals-enabled');
        if (this._vitalsEnabled) this._enableVitals();
        this._vitalsSettingId = this._settings.connect('changed::vitals-enabled', () => {
            this._vitalsEnabled = this._settings.get_boolean('vitals-enabled');
            if (this._vitalsEnabled) this._enableVitals();
            else this._disableVitals();
        });


        // Bluetooth Battery Menu
        this._btBatteryEnabled = this._settings.get_boolean('bluetooth-battery-enabled');
        if (this._btBatteryEnabled) this._enableBluetoothBattery();
        this._btBatterySettingId = this._settings.connect('changed::bluetooth-battery-enabled', () => {
            this._btBatteryEnabled = this._settings.get_boolean('bluetooth-battery-enabled');
            if (this._btBatteryEnabled) this._enableBluetoothBattery();
            else this._disableBluetoothBattery();
        });

        // Notification Icons
        this._notifIconsEnabled = this._settings.get_boolean('notif-icons-enabled');
        this._niSettings = this.getSettings('org.gnome.shell.extensions.notification-icons');
        if (this._notifIconsEnabled) this._enableNotifIcons();
        this._notifIconsSettingId = this._settings.connect('changed::notif-icons-enabled', () => {
            const enabled = this._settings.get_boolean('notif-icons-enabled');
            if (enabled && !this._topbarNotification) this._enableNotifIcons();
            else if (!enabled && this._topbarNotification) this._disableNotifIcons();
        });

        // Hydro-Widgets
        this._hydroWidgetsEnabled = this._settings.get_boolean('hydro-widgets-enabled');
        if (this._hydroWidgetsEnabled) this._enableHydroWidgets();
        this._hydroWidgetsSettingId = this._settings.connect('changed::hydro-widgets-enabled', () => {
            this._hydroWidgetsEnabled = this._settings.get_boolean('hydro-widgets-enabled');
            if (this._hydroWidgetsEnabled) this._enableHydroWidgets();
            else this._disableHydroWidgets();
        });

        // Privacy Indicators Accent Color
        this._privacyAccentEnabled = this._settings.get_boolean('privacy-accent-enabled');
        if (this._privacyAccentEnabled) this._enablePrivacyAccent();
        this._privacyAccentSettingId = this._settings.connect('changed::privacy-accent-enabled', () => {
            const enabled = this._settings.get_boolean('privacy-accent-enabled');
            if (enabled) this._enablePrivacyAccent();
            else this._disablePrivacyAccent();
        });

        // Dynamic Wallpaper Manager
        try {
            this.wallpaperManager = new WallpaperManager(this);
            this.wallpaperManager.enable();
        } catch (e) {
            console.error(`BarEnhanced: failed to initialize WallpaperManager: ${e.message}`);
        }
    }

    _enableNotifIcons() {
        this._niSignals = [];
        try {
            this._topbarNotification = new TopbarNotification(this._niSettings);
            for (const key of ['right-side', 'colored-icons', 'dnd-mode',
                'notification-count', 'hide-count-when-one', 'icon-size']) {
                this._niSignals.push(this._niSettings.connect(`changed::${key}`,
                    () => this._onNiSettingsChanged()));
            }
            this._insertNotifWidget();
        } catch (e) {
            console.error('BarEnhanced: failed to initialize notification icons', e);
            this._disableNotifIcons();
        }
    }

    _disableNotifIcons() {
        if (this._niSignals) {
            for (const signal of this._niSignals) {
                if (!signal) continue;
                try {
                    this._niSettings.disconnect(signal);
                } catch (e) {
                    console.error('BarEnhanced: failed to disconnect notification settings', e);
                }
            }
            this._niSignals = [];
        }
        if (this._topbarNotification) {
            const widget = this._topbarNotification;
            this._topbarNotification = null;
            try {
                widget.get_parent()?.remove_child(widget);
            } catch (e) {
                console.error('BarEnhanced: failed to remove notification icons', e);
            }
            try {
                widget.destroy();
            } catch (e) {
                console.error('BarEnhanced: failed to destroy notification icons', e);
            }
        }
    }

    _onNiSettingsChanged() {
        if (this._topbarNotification) {
            this._topbarNotification.updateSettings();
            this._repositionNotifWidget();
        }
    }

    _insertNotifWidget() {
        const dateMenu = Main.panel.statusArea.dateMenu;
        if (!dateMenu || !dateMenu._clockDisplay) return;
        const rightSide = this._niSettings.get_boolean('right-side');
        const container = dateMenu.get_first_child();
        if (rightSide) container.insert_child_above(this._topbarNotification, dateMenu._clockDisplay);
        else container.insert_child_below(this._topbarNotification, dateMenu._clockDisplay);
    }

    _repositionNotifWidget() {
        const dateMenu = Main.panel.statusArea.dateMenu;
        if (!dateMenu || !dateMenu._clockDisplay) return;
        const rightSide = this._niSettings.get_boolean('right-side');
        const container = dateMenu.get_first_child();
        try {
            this._topbarNotification.get_parent()?.remove_child(this._topbarNotification);
        } catch (e) {
            console.error('BarEnhanced: failed to detach notification icons', e);
            return;
        }
        if (rightSide) container.insert_child_above(this._topbarNotification, dateMenu._clockDisplay);
        else container.insert_child_below(this._topbarNotification, dateMenu._clockDisplay);
    }

    _enablePrivacyAccent() {
        this._privacySignals = [
            this._settings.connect('changed::privacy-indicators', () => this._updatePrivacyClasses()),
            this._settings.connect('changed::screen-sharing-indicator', () => this._updatePrivacyClasses()),
            this._settings.connect('changed::screen-recording-indicator', () => this._updatePrivacyClasses()),
            this._settings.connect('changed::privacy-blur', () => this._updatePrivacyClasses()),
            this._settings.connect('changed::privacy-neutral', () => this._updatePrivacyClasses()),
        ];
        this._updatePrivacyClasses();
    }

    _disablePrivacyAccent() {
        if (this._privacyAccentTimeout) {
            GLib.Source.remove(this._privacyAccentTimeout);
            this._privacyAccentTimeout = null;
        }
        if (this._privacySignals) {
            this._privacySignals.forEach(s => { if (s) this._settings.disconnect(s); });
            this._privacySignals = null;
        }
        this._updateUiGroupClass(false, 'privacy-indicators-accent-color');
        this._updateUiGroupClass(false, 'screen-sharing-indicator-accent-color');
        this._updateUiGroupClass(false, 'screen-recording-indicator-accent-color');
        this._updateUiGroupClass(false, 'screen-sharing-recording-indicators-blur');
        this._updateUiGroupClass(false, 'neutral-color');
    }

    // Ubuntu Dock and Dash to Dock patch the same Overview objects as the
    // embedded dock. Running two of them at once breaks the Overview, so the
    // embedded dock stays off while either of them is enabled.
    _getConflictingDock() {
        const docks = ['ubuntu-dock@ubuntu.com', 'dash-to-dock@micxgx.gmail.com'];
        try {
            const shellSettings = this._shellSettings;
            const enabled = new Set([
                ...shellSettings.get_strv('enabled-extensions'),
                ...(Main.sessionMode.enabledExtensions ?? []),
            ]);
            const disabled = new Set(shellSettings.get_strv('disabled-extensions'));
            // lookup() can't be used here: GNOME enables extensions while it is
            // still loading them, so a dock loaded after Bar Enhanced is not
            // known yet. Check the install directories instead, which also
            // ignores stale entries left in enabled-extensions by an
            // extension that was deleted.
            const installed = uuid => [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()]
                .some(dir => GLib.file_test(
                    GLib.build_filenamev([dir, 'gnome-shell', 'extensions', uuid, 'metadata.json']),
                    GLib.FileTest.EXISTS));
            return docks.find(uuid => enabled.has(uuid) && !disabled.has(uuid) && installed(uuid)) ?? null;
        } catch (e) {
            console.error('BarEnhanced: failed to check for other dock extensions', e);
            return null;
        }
    }

    _syncDashToDock() {
        this._dashToDockEnabled = this._settings.get_boolean('dash-to-dock-enabled');
        const conflict = this._dashToDockEnabled ? this._getConflictingDock() : null;
        if (this._dashToDockEnabled && !conflict) {
            this._enableDashToDock();
            return;
        }
        if (conflict && this._dockConflictLogged !== conflict) {
            console.log(`BarEnhanced: embedded dock disabled because ${conflict} is enabled`);
            this._dockConflictLogged = conflict;
        }
        this._disableDashToDock();
    }

    _enableDashToDock() {
        if (this.dockManager)
            return;

        try {
            this.dockManager = new DockManager(this);
            this.loadDashToDockStylesheet();
        } catch (e) {
            console.error('BarEnhanced: failed to initialize DockManager', e);
            this.dockManager?.destroy();
            this.dockManager = null;
            this.unloadDashToDockStylesheet();
        }
    }

    _disableDashToDock() {
        if (this.dockManager) {
            try {
                this.dockManager.destroy();
            } catch (e) {
                console.error('BarEnhanced: failed to destroy DockManager', e);
            }
            this.dockManager = null;
        }
        this.unloadDashToDockStylesheet();
    }

    _enableMusicPill() {
        if (!this.musicController) {
            try {
                this.musicController = new MusicController(this);
                this.musicController.enable();
            } catch (e) {
                console.error('BarEnhanced: failed to initialize MusicController', e);
                this._disableMusicPill(true);
            }
        } else {
            // Ensure the pill is created/shown if it was hidden
            this.musicController._createPill();
        }
    }

    _disableMusicPill(force = false) {
        if (this.musicController) {
            // We do not destroy the music controller if hydro-media is still enabled, unless forced
            if (force || !this._settings.get_boolean('hydro-media-enabled')) {
                try {
                    this.musicController.disable();
                } catch (e) {
                    console.error('BarEnhanced: failed to destroy MusicController', e);
                }
                this.musicController = null;
            } else {
                // Just hide the pill
                if (this.musicController._pill) {
                    this.musicController._pill._ensureHidden();
                }
            }
        }
    }

    _enableVitals() {
        if (!this.vitalsMenu) {
            try {
                this.vitalsMenu = new VitalsMenuButton(this);
                this.vitalsMenu.menu.box.add_style_class_name('be-menu-vitals');
                let position = this.vitalsMenu._positionInPanel();
                // 'vitalsMenu' is the standalone Vitals extension's role; using it here
                // made addToStatusArea throw whenever both were enabled.
                Main.panel.addToStatusArea('barEnhancedVitalsMenu', this.vitalsMenu, position[1], position[0]);
            } catch (e) {
                console.error('BarEnhanced: failed to initialize Vitals', e);
                this._disableVitals();
            }
        }
    }

    _disableVitals() {
        if (this.vitalsMenu) {
            try {
                this.vitalsMenu.destroy();
            } catch (e) {
                console.error('BarEnhanced: failed to destroy Vitals', e);
            }
            this.vitalsMenu = null;
        }
    }

    _enableBluetoothBattery() {
        if (!this.btBatteryMenu) {
            try {
                this.btBatteryMenu = new BluetoothBatteryButton(this);
                this.btBatteryMenu.menu.box.add_style_class_name('be-menu-bluetooth');
                Main.panel.addToStatusArea('bluetoothBatteryMenu', this.btBatteryMenu, 0, 'right');
            } catch (e) {
                console.error('BarEnhanced: failed to initialize Bluetooth Battery', e);
                this._disableBluetoothBattery();
            }
        }
    }

    _disableBluetoothBattery() {
        if (this.btBatteryMenu) {
            try {
                this.btBatteryMenu.destroy();
            } catch (e) {
                console.error('BarEnhanced: failed to destroy Bluetooth Battery', e);
            }
            this.btBatteryMenu = null;
        }
    }

    _enableHydroWidgets() {
        if (!this.hydroWidgetsManager) {
            try {
                this.hydroWidgetsManager = new HydroWidgetsManager(this);
                this.hydroWidgetsManager.enable();
            } catch (e) {
                console.error('BarEnhanced: failed to initialize HydroWidgetsManager', e);
                this._disableHydroWidgets();
            }
        }
    }

    _disableHydroWidgets() {
        if (this.hydroWidgetsManager) {
            try {
                this.hydroWidgetsManager.disable();
            } catch (e) {
                console.error('BarEnhanced: failed to destroy HydroWidgetsManager', e);
            }
            this.hydroWidgetsManager = null;
        }
    }

    _updateUiGroupClass(add, className) {
        try {
            if (add) {
                Main.layoutManager.uiGroup.add_style_class_name(className);
            } else {
                Main.layoutManager.uiGroup.remove_style_class_name(className);
            }
        } catch(e) {
            console.error('BarEnhanced: failed to update UI group class', e);
        }
    }

    _updatePrivacyClasses() {
        const pInd = this._settings.get_boolean('privacy-indicators');
        const sShare = this._settings.get_boolean('screen-sharing-indicator');
        const sRec = this._settings.get_boolean('screen-recording-indicator');
        const blur = this._settings.get_boolean('privacy-blur');
        const neutral = this._settings.get_boolean('privacy-neutral');

        this._updateUiGroupClass(pInd, 'privacy-indicators-accent-color');
        this._updateUiGroupClass(sShare, 'screen-sharing-indicator-accent-color');
        this._updateUiGroupClass(sRec, 'screen-recording-indicator-accent-color');
        this._updateUiGroupClass(blur, 'screen-sharing-recording-indicators-blur');
        this._updateUiGroupClass(neutral, 'neutral-color');

        // wallpaperManager is now managed once in enable() / disable()
    }

    disable() {
        ++this._lifecycleGeneration;
        this.disabling = true;
        if (this._quickArrowActors) {
            for (const [actor, className] of this._quickArrowActors) {
                try { actor.remove_style_class_name(className); } catch (e) {}
            }
            this._quickArrowActors.clear();
            this._quickArrowActors = null;
        }

        if (this._paletteSettingsIds) {
            this._paletteSettingsIds.forEach(id => this._settings.disconnect(id));
            this._paletteSettingsIds = null;
        }

        if (this.wallpaperManager) {
            this.wallpaperManager.disable();
            this.wallpaperManager = null;
        }

        // Hydro-Widgets cleanup
        if (this._hydroWidgetsSettingId) {
            this._settings.disconnect(this._hydroWidgetsSettingId);
            this._hydroWidgetsSettingId = null;
        }
        this._disableHydroWidgets();

        // Notification Icons cleanup
        if (this._notifIconsSettingId) {
            this._settings.disconnect(this._notifIconsSettingId);
            this._notifIconsSettingId = null;
        }
        this._disableNotifIcons();
        this._niSettings = null;

        // Privacy Indicators cleanup
        if (this._privacyAccentSettingId) {
            this._settings.disconnect(this._privacyAccentSettingId);
            this._privacyAccentSettingId = null;
        }
        this._disablePrivacyAccent();

        // Bluetooth Battery cleanup
        if (this._btBatterySettingId) {
            this._settings.disconnect(this._btBatterySettingId);
            this._btBatterySettingId = null;
        }
        this._disableBluetoothBattery();


        if (this._dashToDockSettingId) {
            this._settings.disconnect(this._dashToDockSettingId);
            this._dashToDockSettingId = null;
        }
        if (this._dockConflictSettingIds) {
            this._dockConflictSettingIds.forEach(id => this._shellSettings?.disconnect(id));
            this._dockConflictSettingIds = null;
        }
        if (this._dockConflictStateId) {
            Main.extensionManager.disconnect(this._dockConflictStateId);
            this._dockConflictStateId = null;
        }
        this._dockConflictLogged = null;
        this._disableDashToDock();

        if (this._musicPillSettingId) {
            this._settings.disconnect(this._musicPillSettingId);
            this._musicPillSettingId = null;
        }
        if (this._hydroMediaSettingId) {
            this._settings.disconnect(this._hydroMediaSettingId);
            this._hydroMediaSettingId = null;
        }
        this._disableMusicPill(true);

        if (this._vitalsSettingId) {
            this._settings.disconnect(this._vitalsSettingId);
            this._vitalsSettingId = null;
        }
        this._disableVitals();

        this._resetFocusGlow();

        if (this._interfaceSettings && this._interfaceSettingsId > 0) {
            this._interfaceSettings.disconnect(this._interfaceSettingsId);
            this._interfaceSettingsId = 0;
        }
        this._interfaceSettings = null;

        this._stopPywalMonitor();

        // Get the top panel
        let panel = Main.panel;

        if (this.fittsEnableTimeoutId) {
            GLib.Source.remove(this.fittsEnableTimeoutId);
            this.fittsEnableTimeoutId = null;
        }
        this.disableFittsWidgets();

        if (this._showDashboardId > 0) {
            this._settings.disconnect(this._showDashboardId);
            this._showDashboardId = 0;
        }

        if (this._systemAccentSyncSettingId) {
            this._settings.disconnect(this._systemAccentSyncSettingId);
            this._systemAccentSyncSettingId = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this.dashboardBtn) {
            this.dashboardBtn.destroy();
            this.dashboardBtn = null;
        }

        this._connections.disconnectAll();
        this._connections = null;

        this.disconnectWindowSignals();

        for (const timeoutId of this._calendarTimeoutIds)
            GLib.Source.remove(timeoutId);
        this._calendarTimeoutIds.clear();
        if (this.updateBguriId > 0) {
            GLib.Source.remove(this.updateBguriId);
            this.updateBguriId = null;
        }
        this.updatingBguri = false;
        this._pendingBguriUpdate = false;
        if (this.bgMgrTimeOutId > 0) {
            GLib.Source.remove(this.bgMgrTimeOutId);
            this.bgMgrTimeOutId = null;
        }
        if (this.onFullScrTimeoutId > 0) {
            GLib.Source.remove(this.onFullScrTimeoutId);
            this.onFullScrTimeoutId = null;
        }
        if (this.postStartupId > 0) {
            GLib.Source.remove(this.postStartupId);
            this.postStartupId = null;
        }
        if (this.enableStyleTimeoutId > 0) {
            GLib.Source.remove(this.enableStyleTimeoutId);
            this.enableStyleTimeoutId = null;
        }
        if (this.fittsEnableTimeoutId) {
            GLib.Source.remove(this.fittsEnableTimeoutId);
            this.fittsEnableTimeoutId = null;
        }
        if (this.fittsCornerTimeoutId > 0) {
            GLib.Source.remove(this.fittsCornerTimeoutId);
            this.fittsCornerTimeoutId = null;
        }

        for (let i = 0; i < this.msgLists.length; i++) {
            if (this.msgListIds[i]) {
                // log('Disable - msgListIds: ', this.msgListIds[i]);
                if (this.msgLists[i] && this.msgListIds[i] > 0)
                    this.msgLists[i].disconnect(this.msgListIds[i]);
                this.msgListIds[i] = null;
                this.msgLists[i] = null;
            }
        }
        this.msgLists = [];
        this.msgListIds = [];

        this._removeInjection(Main.panel.statusArea.dateMenu._calendar, this._injections, "_rebuildCalendar");
        this._injections = [];

        // Remove style class from Panel and PanelBox
        Main.layoutManager.panelBox.remove_style_class_name('barEnhanced');
        panel.remove_style_class_name('barEnhanced');
        panel.remove_style_class_name('candybar');
        panel.remove_style_class_name('trilands');
        // Reset left padding widget into DateMenu button
        if (this.dateMenuLeftPadWidget) {
            this.dateMenuBtnBox.insert_child_at_index(this.dateMenuLeftPadWidget, 0);
            this.dateMenuLeftPadWidget = null;
        }
        // Reset the style for Menus
        this.applyMenuStyles(panel, false);

        // Unload stylesheet
        this.unloadStylesheet();

        // Reset panel and banner position to Top
        this.setPanelBoxPosition('Top');
        Main.messageTray._bannerBin.y_align = Clutter.ActorAlign.START;

        // Clear/Restore Gtk css and Flatpak override
        StyleSheets.saveGtkCss(this, 'disable');
        StyleSheets.saveFlatpakOverrides(this, 'disable');

        if (this._runtimeAssetsCancellable) {
            this._runtimeAssetsCancellable.cancel();
            this._runtimeAssetsCancellable = null;
        }
        this._runtimeAssetsReady = null;

        this.main = null;
        this._settings = null;
        this._bgSettings = null;
        this._intSettings = null;
        this._hcSettings = null;
        this._shellSettings = null;
    }

    _onFocusWindowChanged() {
        if (!this._settings || !this._settings.get_boolean('focus-glow')) {
            this._resetFocusGlow();
            return;
        }

        let focusedWindow = global.display.focus_window;
        if (!focusedWindow) {
            this._resetFocusGlow();
            return;
        }

        let wmClass = focusedWindow.get_wm_class();
        if (!wmClass) {
            this._resetFocusGlow();
            return;
        }

        wmClass = wmClass.toLowerCase();

        // Registry of popular app colors to drive our beautiful adaptive Focus Glow
        const appColors = {
            'spotify': [29, 185, 84],          // Spotify Green
            'terminal': [78, 154, 6],          // Terminal Green
            'gnome-terminal': [78, 154, 6],
            'kitty': [255, 86, 241],           // Kitty Pink
            'alacritty': [255, 86, 241],
            'code': [0, 122, 204],             // VS Code Blue
            'firefox': [255, 122, 0],          // Firefox Orange
            'google-chrome': [66, 133, 244],    // Chrome Blue
            'chromium': [66, 133, 244],
            'discord': [88, 101, 242],         // Discord Blurple
            'slack': [74, 21, 75],             // Slack Aubergine
            'telegram-desktop': [36, 161, 222],    // Telegram Blue
            'org.gnome.nautilus': [22, 124, 128],  // Nautilus Teal
            'steam': [23, 26, 33],
            'gimp': [91, 60, 17],
            'inkscape': [0, 0, 0]
        };

        let rgb = null;
        for (let key in appColors) {
            if (wmClass.includes(key)) {
                rgb = appColors[key];
                break;
            }
        }

        if (!rgb) {
            // Unknown apps still get a stable, visible accent without pretending
            // that this synthetic color is their official brand color.
            const accents = [[31, 140, 220], [151, 89, 210], [20, 165, 140],
                [215, 113, 44], [200, 75, 120], [104, 144, 42]];
            let hash = 0;
            for (const char of wmClass)
                hash = (Math.imul(hash, 31) + char.codePointAt(0)) >>> 0;
            rgb = accents[hash % accents.length];
        }

        let [r, g, b] = rgb;
        this._applyFocusGlow(r, g, b);
    }

    _applyFocusGlow(r, g, b) {
        if (!this._settings) return;
        this._resetFocusGlow();
        let bartype = this._settings.get_string('bartype');
        let height = this._settings.get_double('height') || 30;
        let vPad = this._settings.get_double('vpad') || 2;
        let borderRadius = this._settings.get_double('bradius') || 30.0;
        let gradient = this._settings.get_boolean('gradient');
        let balpha = this._settings.get_double('balpha');
        let intensity = this._settings.get_double('neon-intensity');

        // Spread formula matched to stylesheets.js for flawless, clip-free rendering
        let padmod = (bartype === 'Mainland' || bartype === 'Floating') ? -2 : vPad;
        let radThreshold = Math.ceil(((height - 2 * padmod) / 10.0 - 1) * 5);
        let spread = 0;

        if (borderRadius <= radThreshold) {
            spread = gradient ? -3 : 0;
        } else {
            spread = 2;
        }

        // Render breathtaking adaptive neon glow respecting customized border transparency and snappy 100ms transition
        let styleStr = `box-shadow: 0px 0px 6px ${spread}px rgba(${r}, ${g}, ${b}, ${intensity}) !important; border-color: rgba(${r}, ${g}, ${b}, ${balpha}) !important; transition-duration: 100ms;`;

        const styleActor = actor => {
            const original = actor.get_style() ?? '';
            const applied = `${original}${original && !original.trimEnd().endsWith(';') ? ';' : ''}${styleStr}`;
            this._focusGlowStyles.set(actor, { original, applied });
            actor.set_style(applied);
        };

        if (bartype === 'Mainland' || bartype === 'Floating') {
            styleActor(Main.panel);
        } else {
            // Islands or Trilands: Apply style to individual panel buttons
            for (let box of [Main.panel._leftBox, Main.panel._centerBox, Main.panel._rightBox]) {
                for (let child of box.get_children()) {
                    styleActor(child);
                }
            }
        }
    }

    _resetFocusGlow() {
        if (!this._focusGlowStyles)
            return;
        for (const [actor, { original, applied }] of this._focusGlowStyles) {
            // Leave any style subsequently installed by another extension alone.
            try {
                if (actor.get_style() === applied)
                    actor.set_style(original);
            } catch (e) {
                // An indicator may have been destroyed after losing focus.
            }
        }
        this._focusGlowStyles.clear();
    }

    _stopPywalMonitor() {
        this._pywalGeneration++;
        if (this._walMonitor) {
            if (this._walMonitorId)
                this._walMonitor.disconnect(this._walMonitorId);
            this._walMonitor.cancel();
        }
        this._walMonitor = null;
        this._walMonitorId = 0;
        this._walMonitorScope = null;
    }

    _startPywalMonitor() {
        this._stopPywalMonitor();
        if (!this._settings?.get_boolean('pywal-sync'))
            return;

        const home = GLib.get_home_dir();
        const candidates = [
            ['wal', GLib.build_filenamev([home, '.cache', 'wal'])],
            ['cache', GLib.build_filenamev([home, '.cache'])],
            ['home', home],
        ];
        for (const [scope, path] of candidates) {
            try {
                this._walMonitor = Gio.File.new_for_path(path).monitor_directory(Gio.FileMonitorFlags.NONE, null);
                this._walMonitorScope = scope;
                break;
            } catch (e) {
                if (scope === 'home')
                    console.error('BarEnhanced: failed to monitor Pywal palette directory', e);
            }
        }
        if (this._walMonitor) {
            this._walMonitorId = this._walMonitor.connect('changed', (_monitor, file, otherFile, eventType) => {
                if (!this._settings?.get_boolean('pywal-sync'))
                    return;
                const name = eventType === Gio.FileMonitorEvent.RENAMED ? otherFile?.get_basename() : file.get_basename();
                if (this._walMonitorScope === 'wal' && name === 'colors' &&
                    [Gio.FileMonitorEvent.CREATED, Gio.FileMonitorEvent.CHANGES_DONE_HINT,
                        Gio.FileMonitorEvent.MOVED_IN, Gio.FileMonitorEvent.RENAMED].includes(eventType)) {
                    this._syncWithPywal();
                } else if ([Gio.FileMonitorEvent.CREATED, Gio.FileMonitorEvent.MOVED_IN,
                    Gio.FileMonitorEvent.RENAMED].includes(eventType) &&
                    ((this._walMonitorScope === 'cache' && name === 'wal') ||
                        (this._walMonitorScope === 'home' && name === '.cache'))) {
                    this._startPywalMonitor();
                }
            });
        }
        this._syncWithPywal();
    }

    _syncWithPywal() {
        if (!this._settings || !this._settings.get_boolean('pywal-sync')) {
            return;
        }

        const generation = ++this._pywalGeneration;

        const homeDir = GLib.get_home_dir();
        const walPath = GLib.build_filenamev([homeDir, '.cache', 'wal', 'colors']);
        const walFile = Gio.File.new_for_path(walPath);

        walFile.load_contents_async(null, (file, res) => {
            try {
                // File I/O can finish after disable() has released GSettings.
                // Never apply a stale palette to a later extension instance.
                if (!this._settings || !this._settings.get_boolean('pywal-sync') ||
                    generation !== this._pywalGeneration)
                    return;

                let [success, contents] = file.load_contents_finish(res);
                if (!success) return;

                let decodedContents = new TextDecoder('utf-8').decode(contents);
                let hexColors = decodedContents.trim().split(/\r?\n/).map(c => c.trim()).filter(Boolean);

                if (hexColors.length < 8 || hexColors.length > 16 ||
                    hexColors.some(color => !color.startsWith('#') || !Utils.hexToRgb(color))) {
                    console.warn('BarEnhanced: Pywal colors must contain 8–16 valid #RRGGBB lines');
                    return;
                }

                // Helper to compute contrast color (white or dark) based on background RGB
                const getContrastColor = (rVal, gVal, bVal) => {
                    const Y = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
                    return Y > 130 ? ['0.100', '0.100', '0.100'] : ['1.000', '1.000', '1.000'];
                };

                // Keep the user's own colors so turning Pywal off restores them.
                this._backupBeforePywal();

                // Pause stylesheet reload during multi-setting changes
                const wasPaused = this._settings.get_boolean('pause-reload');
                this._settings.set_boolean('pause-reload', true);
                let applied = false;
                try {

                // Map Pywal colors to candy colors
                for (let i = 0; i < 16; i++) {
                    let hex = hexColors[i % hexColors.length];
                    let r = (parseInt(hex.substring(1, 3), 16) / 255.0).toFixed(3);
                    let g = (parseInt(hex.substring(3, 5), 16) / 255.0).toFixed(3);
                    let b = (parseInt(hex.substring(5, 7), 16) / 255.0).toFixed(3);

                    this._settings.set_strv(`candy${i + 1}`, [r, g, b]);
                    this._settings.set_strv(`dark-candy${i + 1}`, [r, g, b]);
                    this._settings.set_strv(`light-candy${i + 1}`, [r, g, b]);
                }

                // Map primary color (color 0) to panel background and compute contrast
                let bgHex = hexColors[0];
                let bgR = (parseInt(bgHex.substring(1, 3), 16) / 255.0).toFixed(3);
                let bgG = (parseInt(bgHex.substring(3, 5), 16) / 255.0).toFixed(3);
                let bgB = (parseInt(bgHex.substring(5, 7), 16) / 255.0).toFixed(3);

                this._settings.set_strv('bgcolor', [bgR, bgG, bgB]);
                this._settings.set_strv('iscolor', [bgR, bgG, bgB]);
                this._settings.set_strv('dark-bgcolor', [bgR, bgG, bgB]);
                this._settings.set_strv('dark-iscolor', [bgR, bgG, bgB]);
                this._settings.set_strv('light-bgcolor', [bgR, bgG, bgB]);
                this._settings.set_strv('light-iscolor', [bgR, bgG, bgB]);

                // Calculate and apply bar foreground (text) contrast
                const fg = getContrastColor(parseInt(bgHex.substring(1, 3), 16), parseInt(bgHex.substring(3, 5), 16), parseInt(bgHex.substring(5, 7), 16));
                this._settings.set_strv('fgcolor', fg);
                this._settings.set_strv('dark-fgcolor', fg);
                this._settings.set_strv('light-fgcolor', fg);

                // Apply primary color to popups / menu background
                this._settings.set_strv('mbgcolor', [bgR, bgG, bgB]);
                this._settings.set_strv('dark-mbgcolor', [bgR, bgG, bgB]);
                this._settings.set_strv('light-mbgcolor', [bgR, bgG, bgB]);

                // Calculate popups / menu foreground (text) contrast
                this._settings.set_strv('mfgcolor', fg);
                this._settings.set_strv('dark-mfgcolor', fg);
                this._settings.set_strv('light-mfgcolor', fg);

                // Apply secondary color (color 1 or 2) to menu tiles / secondary surfaces background
                let smbgHex = hexColors[2] || hexColors[1];
                let smbgR = (parseInt(smbgHex.substring(1, 3), 16) / 255.0).toFixed(3);
                let smbgG = (parseInt(smbgHex.substring(3, 5), 16) / 255.0).toFixed(3);
                let smbgB = (parseInt(smbgHex.substring(5, 7), 16) / 255.0).toFixed(3);

                this._settings.set_strv('smbgcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-smbgcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-smbgcolor', [smbgR, smbgG, smbgB]);

                // Set border color and menu outline to secondary color
                this._settings.set_strv('bcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-bcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-bcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('mbcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-mbcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-mbcolor', [smbgR, smbgG, smbgB]);

                // Enable manual accent override and set custom accent color to secondary color
                this._settings.set_boolean('accent-override', true);
                this._settings.set_strv('accent-color', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-accent-color', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-accent-color', [smbgR, smbgG, smbgB]);

                // Set menu active toggles color (mscolor) and hover color (mhcolor)
                this._settings.set_strv('mscolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-mscolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-mscolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('mhcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('dark-mhcolor', [smbgR, smbgG, smbgB]);
                this._settings.set_strv('light-mhcolor', [smbgR, smbgG, smbgB]);

                // Set system GTK headerbar and sidebars custom colors to primary palette color
                this._settings.set_strv('hscd-color', [bgR, bgG, bgB]);
                this._settings.set_strv('dark-hscd-color', [bgR, bgG, bgB]);
                this._settings.set_strv('light-hscd-color', [bgR, bgG, bgB]);

                this._settings.set_strv('vw-color', [bgR, bgG, bgB]);
                this._settings.set_strv('dark-vw-color', [bgR, bgG, bgB]);
                this._settings.set_strv('light-vw-color', [bgR, bgG, bgB]);

                applied = true;
                } finally {
                    this._settings.set_boolean('pause-reload', wasPaused);
                    if (applied && !wasPaused)
                        this._settings.set_boolean('trigger-reload', !this._settings.get_boolean('trigger-reload'));
                }
            } catch (e) {
                if (e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                    return;
                console.error('BarEnhanced: failed to synchronize Pywal palette', e);
            }
        });
    }

    _isThemeInstalled(kind, name) {
        const dirs = [
            GLib.build_filenamev([GLib.get_user_data_dir(), kind]),
            GLib.build_filenamev([GLib.get_home_dir(), kind === 'themes' ? '.themes' : '.icons']),
            ...GLib.get_system_data_dirs().map(dir => GLib.build_filenamev([dir, kind])),
        ];
        return dirs.some(dir => GLib.file_test(GLib.build_filenamev([dir, name]), GLib.FileTest.IS_DIR));
    }

    // Settings that _syncWithPywal() overwrites.
    _getPywalKeys() {
        const keys = ['accent-override'];
        for (let i = 1; i <= 16; i++)
            keys.push(`candy${i}`, `dark-candy${i}`, `light-candy${i}`);
        for (const key of ['bgcolor', 'iscolor', 'fgcolor', 'mbgcolor', 'mfgcolor', 'smbgcolor',
            'bcolor', 'mbcolor', 'accent-color', 'mscolor', 'mhcolor', 'hscd-color', 'vw-color'])
            keys.push(key, `dark-${key}`, `light-${key}`);
        return keys;
    }

    _backupBeforePywal() {
        // Only the first sync saves: later syncs would back up Pywal's colors.
        if (!this._settings || this._settings.get_string('pywal-backup'))
            return;
        const backup = {};
        for (const key of this._getPywalKeys())
            backup[key] = this._settings.get_value(key).print(true);
        this._settings.set_string('pywal-backup', JSON.stringify(backup));
    }

    _restorePywalBackup() {
        const raw = this._settings?.get_string('pywal-backup');
        if (!raw)
            return;
        // An imported profile turning Pywal off carries its own colors; keep them.
        if (this._settings.get_boolean('import-export')) {
            this._settings.set_string('pywal-backup', '');
            return;
        }
        const wasPaused = this._settings.get_boolean('pause-reload');
        this._settings.set_boolean('pause-reload', true);
        let restored = false;
        try {
            const backup = JSON.parse(raw);
            const keys = new Set(this._getPywalKeys());
            for (const [key, value] of Object.entries(backup)) {
                if (keys.has(key))
                    this._settings.set_value(key, GLib.Variant.parse(null, value, null, null));
            }
            restored = true;
        } catch (e) {
            console.error('BarEnhanced: failed to restore colors saved before Pywal sync', e);
        } finally {
            this._settings.set_string('pywal-backup', '');
            this._settings.set_boolean('pause-reload', wasPaused);
            if (restored && !wasPaused)
                this._settings.set_boolean('trigger-reload', !this._settings.get_boolean('trigger-reload'));
        }
    }

    _updateSystemAccentMonitor(reload = true) {
        if (!this._settings || !this._interfaceSettings)
            return;
        const enabled = this._settings.get_boolean('system-accent-sync');
        if (enabled && !this._interfaceSettingsId &&
            this._interfaceSettings.settings_schema.has_key('accent-color')) {
            this._interfaceSettingsId = this._interfaceSettings.connect('changed::accent-color', () => {
                this._syncWithSystemAccent();
            });
        } else if (!enabled && this._interfaceSettingsId) {
            this._interfaceSettings.disconnect(this._interfaceSettingsId);
            this._interfaceSettingsId = 0;
        }
        // Toggling off must immediately restore the user's manual border color.
        if (reload)
            this._syncWithSystemAccent();
    }

    _syncWithSystemAccent() {
        if (!this._settings) return;
        try {
            // Simply trigger a full stylesheet compilation. The stylesheet will dynamically detect 
            // the system accent color if system-accent-sync is true, or fall back to
            // the user's manual colors if false. Extremely clean and non-destructive!
            this._settings.set_boolean('trigger-reload', !this._settings.get_boolean('trigger-reload'));
        } catch (e) {
            console.error('BarEnhanced: failed to synchronize system accent', e);
        }
    }

    updateWindowsBlur() {
        // Disabled: GTK Window custom styling is disabled to prevent menu/context corruption
        return;
    }

    _updateDashboardVisibility() {
        if (!this._settings) return;
        let show = this._settings.get_boolean('show-dashboard');
        if (show) {
            if (!this.dashboardBtn) {
                this.dashboardBtn = new BarEnhancedDashboard(this);
                Main.panel.addToStatusArea('bar-enhanced-dashboard', this.dashboardBtn, 0, 'right');
            }
        } else {
            if (this.dashboardBtn) {
                this.dashboardBtn.destroy();
                this.dashboardBtn = null;
            }
        }
    }

}
