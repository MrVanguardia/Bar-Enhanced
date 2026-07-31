import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import cairo from 'gi://cairo';
import UPowerGlib from 'gi://UPowerGlib';
import * as Mpris from 'resource:///org/gnome/shell/ui/mpris.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { WeatherClient } from 'resource:///org/gnome/shell/misc/weather.js';
import { WaveformVisualizer } from './dynamic-music-pill/uiVisualizers.js';
import { ScrollLabel, CrossfadeArt } from './dynamic-music-pill/uiWidgets.js';

// Helper function to convert RGB/RGBA color strings to Hex format, since Pango markup
// does not support rgb() or rgba() color specifications in the 'color' attribute.
function toHexColor(colorStr) {
    if (!colorStr) return '#ffffff';
    if (colorStr.startsWith('#')) return colorStr;

    let m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
        let r = parseInt(m[1]).toString(16).padStart(2, '0');
        let g = parseInt(m[2]).toString(16).padStart(2, '0');
        let b = parseInt(m[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    return colorStr;
}

// Base Squircle Shape for Hydro-Widgets
// Uses Clutter/St features to create an organic, rounded floating container
const HydroSquircle = GObject.registerClass(
    class HydroSquircle extends St.Widget {
        _init(params = {}, extension = null, settingsPrefix = '') {
            super._init({
                reactive: true,
                track_hover: true,
                style_class: 'hydro-widget-base',
                layout_manager: new Clutter.BinLayout(),
                ...params
            });

            this.extension = extension;
            this.settingsPrefix = settingsPrefix;
            this._settings = extension ? extension._settings : null;

            // Make it draggable
            try {
                this._isDragging = false;
                let dragOffsetX = 0;
                let dragOffsetY = 0;

                this.connect('button-press-event', (actor, event) => {
                    this._isDragging = true;
                    let [stageX, stageY] = event.get_coords();
                    let [actorX, actorY] = this.get_transformed_position();
                    dragOffsetX = stageX - actorX;
                    dragOffsetY = stageY - actorY;
                    return Clutter.EVENT_PROPAGATE;
                });

                this.connect('button-release-event', (actor, event) => {
                    if (this._isDragging) {
                        this._isDragging = false;
                        if (this._settings && this.settingsPrefix) {
                            let [currentX, currentY] = this.get_position();
                            this._settings.set_double(`${this.settingsPrefix}-x`, currentX);
                            this._settings.set_double(`${this.settingsPrefix}-y`, currentY);
                        }
                    }
                    return Clutter.EVENT_PROPAGATE;
                });

                this.connect('motion-event', (actor, event) => {
                    if (this._isDragging) {
                        let [stageX, stageY] = event.get_coords();
                        this.set_position(stageX - dragOffsetX, stageY - dragOffsetY);
                        return Clutter.EVENT_STOP;
                    }
                    return Clutter.EVENT_PROPAGATE;
                });
                
                // Auto-center on width changes (so dynamic width widgets grow from their center)
                let lastWidth = 0;
                this.connect('notify::width', () => {
                    let currentWidth = this.width;
                    if (lastWidth > 0 && currentWidth > 0 && currentWidth !== lastWidth && !this._isDragging) {
                        let diff = currentWidth - lastWidth;
                        let newX = this.x - (diff / 2);
                        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                            try {
                                if (this.is_destroyed && this.is_destroyed()) return GLib.SOURCE_REMOVE;
                                this.set_x(newX);
                                if (this._settings && this.settingsPrefix) {
                                    this._settings.set_double(`${this.settingsPrefix}-x`, newX);
                                }
                            } catch (e) {}
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                    if (currentWidth > 0) {
                        lastWidth = currentWidth;
                    }
                });
            } catch (e) {
                log('BarEnhanced: Failed to initialize drag events for HydroWidget: ' + e);
            }

            // Listen to settings
            this._settingsSignals = [];
            if (this._settings && this.settingsPrefix) {
                let x = this._settings.get_double(`${this.settingsPrefix}-x`);
                let y = this._settings.get_double(`${this.settingsPrefix}-y`);
                this.set_position(x, y);

                this._settingsSignals.push(this._settings.connect(`changed::${this.settingsPrefix}-x`, () => {
                    let px = this._settings.get_double(`${this.settingsPrefix}-x`);
                    let py = this._settings.get_double(`${this.settingsPrefix}-y`);
                    this.set_position(px, py);
                }));
                this._settingsSignals.push(this._settings.connect(`changed::${this.settingsPrefix}-y`, () => {
                    let px = this._settings.get_double(`${this.settingsPrefix}-x`);
                    let py = this._settings.get_double(`${this.settingsPrefix}-y`);
                    this.set_position(px, py);
                }));
                this._settingsSignals.push(this._settings.connect(`changed::${this.settingsPrefix}-size`, () => this._syncSettings()));
                this._settingsSignals.push(this._settings.connect(`changed::${this.settingsPrefix}-shape`, () => this._syncSettings()));
                this._settingsSignals.push(this._settings.connect(`changed::${this.settingsPrefix}-style`, () => this._syncSettings()));
            }

            // Add a subtle entrance animation
            this.opacity = 0;
            this.scale_x = 0.8;
            this.scale_y = 0.8;

            this.ease({
                opacity: 255,
                scale_x: 1.0,
                scale_y: 1.0,
                duration: 600,
                mode: Clutter.AnimationMode.EASE_OUT_ELASTIC
            });

            // Hover effect for organic feel
            this.connect('notify::hover', () => {
                if (this.hover) {
                    this.ease({
                        scale_x: 1.05,
                        scale_y: 1.05,
                        duration: 300,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD
                    });
                } else {
                    this.ease({
                        scale_x: 1.0,
                        scale_y: 1.0,
                        duration: 300,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD
                    });
                }
            });

            // NOTE: We don't call this._syncSettings() here anymore!
            // Subclasses must call it at the end of their _init() to avoid undefined properties.
        }

        _syncSettings() {
            if (!this._settings || !this.settingsPrefix) return;
            const size = this._settings.get_double(`${this.settingsPrefix}-size`);
            this.set_size(size, size);
            if (this._lastPrimary && this._lastBg) {
                this.updateColors(this._lastPrimary, this._lastBg);
            }
        }

        getShapeRadius(shape, size) {
            switch (shape) {
                case 'pill': return `${size}px`;
                case 'circle': return `${size / 2}px`;
                case 'leaf': return `${size / 2}px ${size / 2}px 0px ${size / 2}px`;
                case 'scallop': return `${size / 4}px ${size / 2}px ${size / 4}px ${size / 2}px`;
                case 'squircle':
                default: return `${size * 0.2}px`;
            }
        }

        // Dynamic color update from Monet Engine
        updateColors(primary, background, secondary) {
            this._lastPrimary = primary;
            this._lastBg = background;
            this._lastSecondary = secondary || primary;
            let shape = 'squircle';
            let size = 220;
            if (this._settings && this.settingsPrefix) {
                shape = this._settings.get_string(`${this.settingsPrefix}-shape`);
                size = this._settings.get_double(`${this.settingsPrefix}-size`);
            }

            const radius = this.getShapeRadius(shape, size);
            const scale = size / 220.0;

            // Advanced Material You squircle styling
            this.style = `
            background-color: ${background};
            color: ${primary};
            border-radius: ${radius};
            box-shadow: 0 ${Math.round(10 * scale)}px ${Math.round(30 * scale)}px rgba(0,0,0,0.3);
            padding: ${Math.round(20 * scale)}px;
        `;
        }

        destroy() {
            if (this._settingsSignals && this._settings) {
                this._settingsSignals.forEach(id => this._settings.disconnect(id));
                this._settingsSignals = null;
            }
            super.destroy();
        }
    });

// Example Clock Widget
const HydroClockWidget = GObject.registerClass(
    class HydroClockWidget extends HydroSquircle {
        _init(extension) {
            super._init({}, extension, 'hydro-clock');

            // DIGITAL FACE
            this._digitalBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });

            this._timeLabel = new St.Label({
                text: '00:00',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 56px; font-weight: 900; font-family: sans-serif;'
            });

            this._dateLabel = new St.Label({
                text: 'Loading...',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 16px; font-weight: 600; opacity: 0.8;'
            });

            this._cyberTimeLabel = new St.Label({
                text: '-00:00-',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 14px; font-weight: 400;'
            });

            this._digitalBox.add_child(this._timeLabel);
            this._digitalBox.add_child(this._dateLabel);
            this._digitalBox.add_child(this._cyberTimeLabel);
            this.add_child(this._digitalBox);

            // ANALOG FACE
            this._analogActor = new St.DrawingArea({
                x_expand: true, y_expand: true,
                style: 'background-color: transparent;'
            });
            this._analogActor.connect('repaint', this._onDrawAnalog.bind(this));
            this.add_child(this._analogActor);

            this._updateTime();
            this._clockTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._updateTime();
                return GLib.SOURCE_CONTINUE;
            });

            this._syncSettings();
        }

        _syncSettings() {
            super._syncSettings();
            if (!this._settings) return;

            let style = this._settings.get_string('hydro-clock-style') || 'analog';
            let size = this._settings.get_double('hydro-clock-size') || 220;
            const scale = size / 220.0;

            if (style === 'analog') {
                this._digitalBox.hide();
                this._analogActor.show();
                this._analogActor.set_size(size, size);
                this.style = `background-color: transparent; border-radius: 0; box-shadow: none;`;
                this._analogActor.queue_repaint();
            } else {
                this._analogActor.hide();
                this._digitalBox.show();
                this._cyberTimeLabel.hide();
                if (style === 'text') {
                    this._timeLabel.style = `font-size: ${Math.round(32 * scale)}px; font-weight: 800; font-family: sans-serif; text-align: center;`;
                } else if (style === 'stacked') {
                    this._timeLabel.style = `font-size: ${Math.round(60 * scale)}px; font-weight: 500; font-family: sans-serif; text-align: center;`;
                    this._dateLabel.style = `font-size: ${Math.round(14 * scale)}px; font-weight: 700; opacity: 0.9; margin-bottom: ${Math.round(8 * scale)}px;`;
                } else if (style === 'cyberpunk') {
                    this._timeLabel.style = `font-size: ${Math.round(34 * scale)}px; font-weight: 900; font-family: monospace, sans-serif;`;
                    this._dateLabel.style = `font-size: ${Math.round(14 * scale)}px; font-weight: 600; opacity: 0.9; margin-top: ${Math.round(8 * scale)}px; margin-bottom: ${Math.round(4 * scale)}px;`;
                    this._cyberTimeLabel.style = `font-size: ${Math.round(14 * scale)}px; font-weight: 500; font-family: monospace, sans-serif; opacity: 0.8;`;
                    this._cyberTimeLabel.show();
                    this.style = `background-color: transparent; border-radius: 0; box-shadow: none;`;
                } else if (style === 'pixel16') {
                    this._timeLabel.style = `font-size: ${Math.round(48 * scale)}px; font-weight: 300; font-family: sans-serif; text-align: center; letter-spacing: -1px;`;
                    this._dateLabel.style = `font-size: ${Math.round(13 * scale)}px; font-weight: 500; opacity: 0.7; text-align: center; margin-top: ${Math.round(4 * scale)}px;`;
                } else {
                    this._timeLabel.style = `font-size: ${Math.round(56 * scale)}px; font-weight: 900; font-family: sans-serif;`;
                    this._dateLabel.style = `font-size: ${Math.round(16 * scale)}px; font-weight: 600; opacity: 0.8;`;
                }
                if (this._lastPrimary && this._lastBg && style !== 'cyberpunk') {
                    super.updateColors(this._lastPrimary, this._lastBg, this._lastSecondary);
                }
            }
        }

        updateColors(primary, background, secondary) {
            this._lastPrimary = primary;
            this._lastBg = background;
            this._lastSecondary = secondary || primary;
            let style = this._settings ? this._settings.get_string('hydro-clock-style') : 'analog';

            if (style === 'analog' || style === 'cyberpunk') {
                this.style = `background-color: transparent; border-radius: 0; box-shadow: none;`;
                if (this._analogActor) this._analogActor.queue_repaint();
            } else if (style === 'pixel16') {
                let size = this._settings ? this._settings.get_double('hydro-clock-size') : 220;
                const scale = size / 220.0;
                this.style = `
                    background-color: ${background};
                    color: ${primary};
                    border-radius: 28px;
                    box-shadow: 0 ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.15);
                    padding: ${Math.round(16 * scale)}px;
                `;
            } else {
                super.updateColors(primary, background, secondary);
            }
            if (this._timeLabel) {
                this._updateTime();
            }
        }

        _parseColor(colorStr) {
            let m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (m) {
                return [parseInt(m[1]) / 255, parseInt(m[2]) / 255, parseInt(m[3]) / 255, m[4] !== undefined ? parseFloat(m[4]) : 1.0];
            }
            return [1, 1, 1, 1];
        }

        _onDrawAnalog(widget) {
            let cr = widget.get_context();
            let [width, height] = widget.get_surface_size();

            cr.setOperator(cairo.Operator.CLEAR);
            cr.paint();
            cr.setOperator(cairo.Operator.OVER);

            let cx = width / 2;
            let cy = height / 2;
            let R = Math.min(width, height) / 2 - 10;

            let bgCol = this._parseColor(this._lastBg || 'rgba(32,33,36,0.85)');
            let fgCol = this._parseColor(this._lastPrimary || 'rgba(138,180,248,1)');

            let shape = this._settings ? this._settings.get_string('hydro-clock-shape') : 'scallop';

            cr.translate(cx, cy);

            // 1. Draw Background Shape
            cr.newPath();
            if (shape === 'scallop') {
                let numPetals = 12;
                let petalDepth = R * 0.08;
                cr.moveTo(R, 0);
                for (let i = 0; i <= 360; i++) {
                    let rad = i * Math.PI / 180;
                    let r = R - petalDepth + petalDepth * Math.cos(numPetals * rad);
                    cr.lineTo(r * Math.cos(rad), r * Math.sin(rad));
                }
            } else if (shape === 'circle') {
                cr.arc(0, 0, R, 0, Math.PI * 2);
            } else {
                // Generic circle fallback for pill/leaf in analog mode for now
                cr.arc(0, 0, R, 0, Math.PI * 2);
            }
            cr.closePath();

            cr.setSourceRGBA(...bgCol);
            cr.fill();

            if (!this.now) return true;

            let h = this.now.get_hour() % 12;
            let m = this.now.get_minute();
            let s = this.now.get_second();

            // 2. Draw Date Text
            cr.save();
            cr.rotate(-Math.PI / 4);
            cr.translate(0, -R * 0.72);
            cr.setSourceRGBA(...fgCol);
            cr.selectFontFace("Sans", cairo.FontSlant.NORMAL, cairo.FontWeight.BOLD);
            cr.setFontSize(R * 0.18);
            let dateStr = this.now.format('%a %e');
            let extents = cr.textExtents(dateStr);
            cr.moveTo(-extents.width / 2, extents.height / 2);
            cr.showText(dateStr);
            cr.restore();

            // 3. Draw Hands
            let hAngle = (h + m / 60) * (Math.PI * 2 / 12) - Math.PI / 2;
            let mAngle = (m + s / 60) * (Math.PI * 2 / 60) - Math.PI / 2;
            let sAngle = s * (Math.PI * 2 / 60) - Math.PI / 2;

            cr.setLineCap(cairo.LineCap.ROUND);
            cr.setLineJoin(cairo.LineJoin.ROUND);

            cr.setLineWidth(R * 0.18);
            cr.setSourceRGBA(fgCol[0] * 0.7, fgCol[1] * 0.7, fgCol[2] * 0.7, fgCol[3]);
            cr.moveTo(0, 0);
            cr.lineTo(Math.cos(hAngle) * R * 0.45, Math.sin(hAngle) * R * 0.45);
            cr.stroke();

            cr.setLineWidth(R * 0.18);
            cr.setSourceRGBA(...fgCol);
            cr.moveTo(0, 0);
            cr.lineTo(Math.cos(mAngle) * R * 0.65, Math.sin(mAngle) * R * 0.65);
            cr.stroke();

            cr.arc(Math.cos(sAngle) * R * 0.75, Math.sin(sAngle) * R * 0.75, R * 0.08, 0, Math.PI * 2);
            cr.setSourceRGBA(fgCol[0] * 0.9, fgCol[1] * 0.9, fgCol[2] * 0.9, fgCol[3]);
            cr.fill();

            return true;
        }

        _updateTime() {
            this.now = GLib.DateTime.new_now_local();
            let style = this._settings ? this._settings.get_string('hydro-clock-style') : 'analog';
            
            if (this._currentStyle !== style) {
                this._currentStyle = style;
                if (this._timeLabel.get_parent() === this._digitalBox) this._digitalBox.remove_child(this._timeLabel);
                if (this._dateLabel.get_parent() === this._digitalBox) this._digitalBox.remove_child(this._dateLabel);
                if (this._cyberTimeLabel.get_parent() === this._digitalBox) this._digitalBox.remove_child(this._cyberTimeLabel);
                
                if (style === 'stacked') {
                    this._digitalBox.add_child(this._dateLabel);
                    this._digitalBox.add_child(this._timeLabel);
                } else if (style === 'cyberpunk') {
                    this._digitalBox.add_child(this._timeLabel);
                    this._digitalBox.add_child(this._dateLabel);
                    this._digitalBox.add_child(this._cyberTimeLabel);
                } else {
                    this._digitalBox.add_child(this._timeLabel);
                    this._digitalBox.add_child(this._dateLabel);
                }
            }

            if (style === 'text') {
                // Very simple text clock logic
                const hours = ["Twelve", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven"];
                let h = this.now.get_hour() % 12;
                let m = this.now.get_minute();
                let textTime = `${hours[h]}\n${m.toString().padStart(2, '0')}`;
                this._timeLabel.get_clutter_text().set_markup(textTime);
                this._dateLabel.hide();
            } else if (style === 'stacked') {
                let h = this.now.get_hour().toString().padStart(2, '0');
                let m = this.now.get_minute().toString().padStart(2, '0');
                let secCol = toHexColor(this._lastSecondary || this._lastPrimary || '#a13835');
                let priCol = toHexColor(this._lastPrimary || '#4a4542');

                this._dateLabel.set_text(this.now.format('%a, %b %e'));
                this._timeLabel.get_clutter_text().set_markup(`<span color="${priCol}">${h}</span>\n<span color="${secCol}">${m}</span>`);
                this._dateLabel.show();
            } else if (style === 'cyberpunk') {
                let priCol = toHexColor(this._lastPrimary || '#e83b3b');

                let dayStr = this.now.format('%A').toUpperCase();
                let dateStr = this.now.format('%d %b %Y').toUpperCase();
                let timeStr = this.now.format('-%H:%M-');

                this._timeLabel.get_clutter_text().set_markup(`<span color="${priCol}">${dayStr}</span>`);
                this._dateLabel.get_clutter_text().set_markup(`<span color="${priCol}">${dateStr}</span>`);
                this._cyberTimeLabel.get_clutter_text().set_markup(`<span color="${priCol}">${timeStr}</span>`);

                this._dateLabel.show();
                this._cyberTimeLabel.show();
            } else if (style === 'pixel16') {
                this._timeLabel.get_clutter_text().set_markup(this.now.format('%H:%M'));
                let dayName = this.now.format('%a').toUpperCase();
                let dayNum = this.now.format('%e').trim();
                let monthShort = this.now.format('%b').toUpperCase();
                this._dateLabel.set_text(`${dayName}, ${dayNum} ${monthShort}`);
                this._dateLabel.show();
            } else {
                this._timeLabel.get_clutter_text().set_markup(this.now.format('%H:%M'));
                this._dateLabel.set_text(this.now.format('%a, %b %d'));
                this._dateLabel.show();
            }

            if (this._analogActor) this._analogActor.queue_repaint();
        }

        destroy() {
            if (this._clockTimeoutId) {
                GLib.Source.remove(this._clockTimeoutId);
                this._clockTimeoutId = null;
            }
            super.destroy();
        }
    });

// Weather Widget
const HydroWeatherWidget = GObject.registerClass(
    class HydroWeatherWidget extends HydroSquircle {
        _init(extension) {
            super._init({}, extension, 'hydro-weather');

            // Simple/Leaf Style (Image Reference)
            this._simpleBox = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 12px;'
            });

            this._weatherIcon = new St.Icon({
                icon_name: 'weather-clear-symbolic',
                icon_size: 64
            });

            this._tempLabel = new St.Label({
                text: '20°',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 56px; font-weight: 800; font-family: sans-serif;'
            });

            this._simpleBox.add_child(this._weatherIcon);
            this._simpleBox.add_child(this._tempLabel);

            // Detailed Style
            this._detailedBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });
            this._detLocation = new St.Label({ text: 'San Francisco', style: 'font-size: 16px; font-weight: 600;' });
            this._detTempBox = new St.BoxLayout({ vertical: false, style: 'spacing: 12px;' });
            this._detIcon = new St.Icon({ icon_name: 'weather-clear-symbolic', icon_size: 48 });
            this._detTemp = new St.Label({ text: '20°', style: 'font-size: 42px; font-weight: 800;' });
            this._detTempBox.add_child(this._detIcon);
            this._detTempBox.add_child(this._detTemp);
            this._detDesc = new St.Label({ text: 'Sunny', style: 'font-size: 14px; opacity: 0.8;' });

            this._detailedBox.add_child(this._detLocation);
            this._detailedBox.add_child(this._detTempBox);
            this._detailedBox.add_child(this._detDesc);

            // Minimal Style
            this._minimalBox = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 8px;'
            });
            this._minIcon = new St.Icon({ icon_name: 'weather-clear-symbolic', icon_size: 24 });
            this._minTemp = new St.Label({ text: '20°', style: 'font-size: 24px; font-weight: bold;' });
            this._minimalBox.add_child(this._minIcon);
            this._minimalBox.add_child(this._minTemp);

            // Pixel 16 Style (Capsule: horizontal layout with left text column and right icon+temp)
            this._pixel16Box = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 16px;'
            });
            this._pxLeftCol = new St.BoxLayout({ vertical: true, y_align: Clutter.ActorAlign.CENTER });
            this._pxLocation = new St.Label({ text: 'Location', style: 'font-size: 14px; font-weight: bold;' });
            this._pxDesc = new St.Label({ text: 'Clear', style: 'font-size: 12px; opacity: 0.7;' });
            this._pxLeftCol.add_child(this._pxLocation);
            this._pxLeftCol.add_child(this._pxDesc);
            this._pxRightCol = new St.BoxLayout({ vertical: false, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 8px;' });
            this._pxIcon = new St.Icon({ icon_name: 'weather-clear-symbolic', icon_size: 32 });
            this._pxTemp = new St.Label({ text: '20°', style: 'font-size: 32px; font-weight: 300;' });
            this._pxRightCol.add_child(this._pxIcon);
            this._pxRightCol.add_child(this._pxTemp);
            this._pixel16Box.add_child(this._pxLeftCol);
            this._pixel16Box.add_child(this._pxRightCol);

            this.add_child(this._simpleBox);
            this.add_child(this._detailedBox);
            this.add_child(this._minimalBox);
            this.add_child(this._pixel16Box);

            this._weatherClient = new WeatherClient();
            this._weatherUpdateId = this._weatherClient.connect('changed', this._updateWeather.bind(this));
            this._updateWeather();

            this._syncSettings();
        }

        _updateWeather() {
            let info = this._weatherClient.info;
            if ((this._weatherClient.hasLocation !== undefined && !this._weatherClient.hasLocation) || 
                !info || (info.is_valid && !info.is_valid())) {
                this._tempLabel.set_text('--°');
                this._detLocation.set_text('Location Off');
                return;
            }

            // Try to get icon (from GTK icon name fallback)
            let iconName = 'weather-clear-symbolic';
            let temp = '--°';
            let location = 'Unknown';
            let desc = '';

            try {
                // Weather info provides GIcon, but we need string for St.Icon.
                if (info.get_icon_name) {
                    iconName = info.get_icon_name();
                    if (!iconName.endsWith('-symbolic')) {
                        iconName += '-symbolic';
                    }
                }
                // Get temperature in user's preferred unit
                temp = info.get_temp_summary();
                if (info.get_location) location = info.get_location().get_name();
                if (info.get_conditions) desc = info.get_conditions();
            } catch (e) {
                log('BarEnhanced: Weather parsing error: ' + e);
            }

            // Update Simple
            this._weatherIcon.icon_name = iconName;
            this._tempLabel.set_text(temp);

            // Update Detailed
            this._detLocation.set_text(location);
            this._detIcon.icon_name = iconName;
            this._detTemp.set_text(temp);
            this._detDesc.set_text(desc);

            // Update Minimal
            this._minIcon.icon_name = iconName;
            this._minTemp.set_text(temp);

            // Update Pixel 16
            this._pxIcon.icon_name = iconName;
            this._pxTemp.set_text(temp);
            this._pxLocation.set_text(location);
            this._pxDesc.set_text(desc || 'Clear');
        }

        destroy() {
            if (this._weatherUpdateId) {
                this._weatherClient.disconnect(this._weatherUpdateId);
                this._weatherUpdateId = null;
            }
            super.destroy();
        }

        _syncSettings() {
            super._syncSettings();
            if (!this._settings) return;

            let style = this._settings.get_string('hydro-weather-style') || 'simple';
            let size = this._settings.get_double('hydro-weather-size') || 220;
            const scale = size / 220.0;

            this._simpleBox.hide();
            this._detailedBox.hide();
            this._minimalBox.hide();
            this._pixel16Box.hide();

            if (style === 'simple') {
                this._simpleBox.show();
                this._simpleBox.style = `spacing: ${Math.round(12 * scale)}px;`;
                this._weatherIcon.icon_size = Math.round(64 * scale);
                this._tempLabel.style = `font-size: ${Math.round(56 * scale)}px; font-weight: 800; font-family: sans-serif;`;
            } else if (style === 'detailed') {
                this._detailedBox.show();
                this._detLocation.style = `font-size: ${Math.round(16 * scale)}px; font-weight: 600;`;
                this._detTempBox.style = `spacing: ${Math.round(12 * scale)}px;`;
                this._detIcon.icon_size = Math.round(48 * scale);
                this._detTemp.style = `font-size: ${Math.round(42 * scale)}px; font-weight: 800;`;
                this._detDesc.style = `font-size: ${Math.round(14 * scale)}px; opacity: 0.8;`;
            } else if (style === 'minimal') {
                this._minimalBox.show();
                this._minimalBox.style = `spacing: ${Math.round(8 * scale)}px;`;
                this._minIcon.icon_size = Math.round(24 * scale);
                this._minTemp.style = `font-size: ${Math.round(24 * scale)}px; font-weight: bold;`;
            } else if (style === 'pixel16') {
                this._pixel16Box.show();
                this._pixel16Box.style = `spacing: ${Math.round(16 * scale)}px;`;
                this._pxIcon.icon_size = Math.round(32 * scale);
                this._pxTemp.style = `font-size: ${Math.round(32 * scale)}px; font-weight: 300; font-family: sans-serif;`;
                this._pxLocation.style = `font-size: ${Math.round(14 * scale)}px; font-weight: bold;`;
                this._pxDesc.style = `font-size: ${Math.round(12 * scale)}px; opacity: 0.7;`;
                // Make it wider capsule shape
                this.set_size(Math.round(size * 1.6), size);
            }
        }

        updateColors(primary, background, secondary) {
            this._lastPrimary = primary;
            this._lastBg = background;
            this._lastSecondary = secondary || primary;
            let style = this._settings ? this._settings.get_string('hydro-weather-style') : 'simple';

            if (style === 'pixel16') {
                let size = this._settings ? this._settings.get_double('hydro-weather-size') : 220;
                const scale = size / 220.0;
                this.style = `
                    background-color: ${background};
                    color: ${primary};
                    border-radius: 32px;
                    box-shadow: 0 ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.15);
                    padding: ${Math.round(20 * scale)}px;
                `;
            } else {
                super.updateColors(primary, background, secondary);
            }
        }
    });

// At a Glance / Calendar Widget (Pixel Style)
const HydroCalendarWidget = GObject.registerClass(
    class HydroCalendarWidget extends HydroSquircle {
        _init(extension) {
            super._init({}, extension, 'hydro-calendar');

            this._mainBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 6px; width: 100%;'
            });

            this._topRow = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 12px;'
            });

            this._dateLabel = new St.Label({
                text: 'Loading...',
                style: 'font-size: 22px; font-weight: 500; font-family: sans-serif;'
            });

            this._weatherBox = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 6px;'
            });

            this._weatherIcon = new St.Icon({
                icon_name: 'weather-clear-symbolic',
                icon_size: 22
            });

            this._tempLabel = new St.Label({
                text: '--°',
                style: 'font-size: 22px; font-weight: 500; font-family: sans-serif;'
            });

            this._weatherBox.add_child(this._weatherIcon);
            this._weatherBox.add_child(this._tempLabel);

            this._topRow.add_child(this._dateLabel);
            this._topRow.add_child(this._weatherBox);

            this._eventLabel = new St.Label({
                text: 'Toca para ver el calendario',
                style: 'font-size: 16px; font-weight: 400; opacity: 0.8;'
            });

            this._mainBox.add_child(this._topRow);
            this._mainBox.add_child(this._eventLabel);
            this.add_child(this._mainBox);

            this._updateWidget();
            this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 60, () => {
                this._updateWidget();
                return GLib.SOURCE_CONTINUE;
            });

            this._syncSettings();
        }

        _updateWidget() {
            let now = GLib.DateTime.new_now_local();
            // Format like Pixel: "Tue, Aug 29"
            let dayName = now.format('%a');
            let monthName = now.format('%b');
            let dayNum = now.format('%e').trim();
            let dateStr = `${dayName}, ${monthName} ${dayNum}`;
            this._dateLabel.set_text(dateStr);

            // Fetch weather from main client if available
            try {
                if (!this._weatherClient) {
                    this._weatherClient = new WeatherClient();
                }
                let info = this._weatherClient.info;
                if (info && info.is_valid && info.is_valid()) {
                    let temp = info.get_temp_summary();
                    this._tempLabel.set_text(temp);
                    let iconName = info.get_icon_name();
                    if (iconName) this._weatherIcon.icon_name = iconName;
                }
            } catch (e) {}
        }

        destroy() {
            if (this._timerId) {
                GLib.Source.remove(this._timerId);
                this._timerId = null;
            }
            if (this._weatherClient) {
                this._weatherClient = null;
            }
            super.destroy();
        }

        _syncSettings() {
            super._syncSettings();
            let size = this._settings ? this._settings.get_double('hydro-calendar-size') : 220;
            this.set_size(Math.round(size * 1.8), size);
        }

        updateColors(primary, background, secondary) {
            super.updateColors(primary, background, secondary);
            let size = this._settings ? this._settings.get_double('hydro-calendar-size') : 220;
            const scale = size / 220.0;
            // Pixel At a Glance is typically transparent without background, just text shadow for readability
            this.style = `
                background-color: transparent;
                color: #ffffff;
                text-shadow: 0px 1px 3px rgba(0,0,0,0.6);
                border-radius: 0px;
                box-shadow: none;
                padding: ${Math.round(20 * scale)}px;
            `;
        }
    }
);

// Battery Monitor Widget (Pixel Style)
const HydroBatteryWidget = GObject.registerClass(
    class HydroBatteryWidget extends HydroSquircle {
        _init(extension) {
            super._init({}, extension, 'hydro-battery');
            this._upowerClient = UPowerGlib.Client.new();

            this._mainBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 8px; width: 100%;'
            });

            // Large Battery Percentage
            this._sysLabel = new St.Label({ 
                text: '100%', 
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 48px; font-weight: 300; font-family: sans-serif; letter-spacing: -1px;' 
            });

            this._statusRow = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 6px;'
            });

            this._sysIcon = new St.Icon({ icon_name: 'battery-good-symbolic', icon_size: 20 });
            this._statusText = new St.Label({ text: 'Batería del sistema', style: 'font-size: 14px; font-weight: 500; opacity: 0.8;' });
            
            this._statusRow.add_child(this._sysIcon);
            this._statusRow.add_child(this._statusText);

            this._mainBox.add_child(this._sysLabel);
            this._mainBox.add_child(this._statusRow);
            this.add_child(this._mainBox);

            this._updateBatteries();
            this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
                this._updateBatteries();
                return GLib.SOURCE_CONTINUE;
            });

            this._syncSettings();
        }

        _updateBatteries() {
            try {
                let devices = this._upowerClient.get_devices();
                let percentage = 100;
                let isCharging = false;
                
                for (let i = 0; i < devices.length; i++) {
                    let d = devices[i];
                    if (d.kind === UPowerGlib.DeviceKind.BATTERY) {
                        percentage = Math.round(d.percentage);
                        isCharging = d.state === UPowerGlib.DeviceState.CHARGING;
                        break;
                    }
                }
                this._sysLabel.set_text(`${percentage}%`);
                this._sysIcon.icon_name = isCharging ? 'battery-level-100-charging-symbolic' : 'battery-good-symbolic';
                this._statusText.set_text(isCharging ? 'Cargando' : 'Batería');
            } catch (e) {}
        }

        destroy() {
            if (this._timerId) {
                GLib.Source.remove(this._timerId);
                this._timerId = null;
            }
            this._upowerClient = null;
            super.destroy();
        }

        updateColors(primary, background, secondary) {
            super.updateColors(primary, background, secondary);
            let size = this._settings ? this._settings.get_double('hydro-battery-size') : 220;
            const scale = size / 220.0;
            this.style = `
                background-color: ${background};
                color: ${primary};
                border-radius: ${Math.round(28 * scale)}px;
                box-shadow: 0 ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.15);
                padding: ${Math.round(20 * scale)}px;
            `;
        }
    }
);

// Media / Music Controller Widget
const HydroMediaWidget = GObject.registerClass(
    class HydroMediaWidget extends HydroSquircle {
        _init(extension) {
            super._init({}, extension, 'hydro-media');

            this._simpleBox = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 16px; width: 100%;'
            });

            this._albumArt = new CrossfadeArt();
            this._albumArt.set_size(64, 64);
            this._albumArt.setRadius(12);
            this._albumArt.style = 'background-color: rgba(255,255,255,0.1); padding: 8px;';

            this._infoCol = new St.BoxLayout({
                vertical: true,
                style: 'spacing: 4px;'
            });

            this._titleLabel = new St.Label({
                text: 'No playback',
                style: 'font-weight: bold; font-size: 16px; font-family: sans-serif;'
            });

            this._artistLabel = new St.Label({
                text: 'Unknown Artist',
                style: 'font-size: 13px; opacity: 0.7;'
            });

            this._controlsBox = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 12px; margin-top: 8px;'
            });

            this._prevBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', icon_size: 20 }), reactive: true });
            this._playBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-playback-start-symbolic', icon_size: 20 }), reactive: true });
            this._nextBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', icon_size: 20 }), reactive: true });

            this._controlsBox.add_child(this._prevBtn);
            this._controlsBox.add_child(this._playBtn);
            this._controlsBox.add_child(this._nextBtn);

            this._infoCol.add_child(this._titleLabel);
            this._infoCol.add_child(this._artistLabel);
            this._infoCol.add_child(this._controlsBox);

            this._simpleBox.add_child(this._albumArt);
            this._simpleBox.add_child(this._infoCol);

            // Vinyl Style Box
            this._vinylBox = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 24px;'
            });
            
            this._vinylRecord = new St.Widget({
                style: 'border-radius: 999px; background-color: #111; box-shadow: 0 4px 15px rgba(0,0,0,0.5);',
                layout_manager: new Clutter.BinLayout(),
                width: 140, height: 140
            });
            this._vinylRecord.set_pivot_point(0.5, 0.5);

            this._vinylArt = new CrossfadeArt();
            this._vinylArt.x_expand = true;
            this._vinylArt.y_expand = true;
            this._vinylArt.x_align = Clutter.ActorAlign.FILL;
            this._vinylArt.y_align = Clutter.ActorAlign.FILL;
            this._vinylArt.setRadius(70); // half of 140
            this._vinylArt.style = 'border-radius: 999px;';
            this._vinylHole = new St.Widget({
                style: 'border-radius: 999px; background-color: #222; border: 2px solid #111; width: 30px; height: 30px;',
                x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER
            });
            this._vinylRecord.add_child(this._vinylArt);
            this._vinylRecord.add_child(this._vinylHole);
            
            this._vinylInfoCol = new St.BoxLayout({
                vertical: true,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 8px;'
            });
            
            this._vinylTitle = new St.Label({
                text: 'No playback',
                style: 'font-weight: 900; font-size: 24px; font-family: sans-serif;'
            });
            this._vinylArtist = new St.Label({
                text: 'Unknown Artist',
                style: 'font-size: 16px; opacity: 0.8;'
            });

            // Lyrics and Visualizer Box
            this._vinylExtraBox = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 12px; margin-top: 4px;',
                y_align: Clutter.ActorAlign.CENTER
            });

            // Settings fetching for visualizer
            let mpSettings = extension ? extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill') : null;
            
            this._vinylLyric = new St.Label({
                text: '',
                style: 'font-size: 14px; font-style: italic; opacity: 0.9; max-width: 200px;',
                y_align: Clutter.ActorAlign.CENTER
            });
            this._vinylLyric.clutter_text.line_wrap = true;

            this._vinylVisualizer = null;
            if (mpSettings) {
                this._vinylVisualizer = new WaveformVisualizer(24, mpSettings, false);
                this._vinylVisualizer.setMode(1);
            }

            if (this._vinylVisualizer) this._vinylExtraBox.add_child(this._vinylVisualizer);
            this._vinylExtraBox.add_child(this._vinylLyric);

            this._vinylInfoCol.add_child(this._vinylTitle);
            this._vinylInfoCol.add_child(this._vinylArtist);
            this._vinylInfoCol.add_child(this._vinylExtraBox);
            
            // Reusing same buttons for vinyl
            this._vinylControlsBox = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 16px; margin-top: 12px;'
            });
            this._vinylPrevBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', icon_size: 24 }), reactive: true });
            this._vinylPlayBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-playback-start-symbolic', icon_size: 24 }), reactive: true });
            this._vinylNextBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', icon_size: 24 }), reactive: true });
            this._vinylControlsBox.add_child(this._vinylPrevBtn);
            this._vinylControlsBox.add_child(this._vinylPlayBtn);
            this._vinylControlsBox.add_child(this._vinylNextBtn);
            this._vinylInfoCol.add_child(this._vinylControlsBox);
            
            this._vinylBox.add_child(this._vinylRecord);
            this._vinylBox.add_child(this._vinylInfoCol);
            
            // Poster Style Box
            this._posterBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 16px;'
            });

            this._posterArt = new CrossfadeArt();
            this._posterArt.set_size(180, 180);
            this._posterArt.setRadius(24);
            
            this._posterInfoCol = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 6px;'
            });

            this._posterTitle = new St.Label({
                text: 'No playback',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-weight: 900; font-size: 20px; font-family: sans-serif;'
            });
            this._posterArtist = new St.Label({
                text: 'Unknown Artist',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 14px; opacity: 0.8;'
            });

            this._posterControls = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 24px; margin-top: 8px;'
            });

            this._posterPrevBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', icon_size: 24 }), reactive: true });
            this._posterPlayBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-playback-start-symbolic', icon_size: 28 }), reactive: true });
            this._posterNextBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', icon_size: 24 }), reactive: true });
            
            this._posterControls.add_child(this._posterPrevBtn);
            this._posterControls.add_child(this._posterPlayBtn);
            this._posterControls.add_child(this._posterNextBtn);

            this._posterInfoCol.add_child(this._posterTitle);
            this._posterInfoCol.add_child(this._posterArtist);

            this._posterBox.add_child(this._posterArt);
            this._posterBox.add_child(this._posterInfoCol);
            this._posterBox.add_child(this._posterControls);

            // Sleek (Soundbar) Style Box
            this._sleekBox = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.FILL,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 16px;'
            });

            this._sleekArt = new CrossfadeArt();
            this._sleekArt.set_size(56, 56);
            this._sleekArt.setRadius(28); // Circular
            this._sleekArt.style = 'border: 2px solid rgba(255,255,255,0.1);';
            
            this._sleekInfoCol = new St.BoxLayout({
                vertical: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: false,
                style: 'spacing: 2px;'
            });

            this._sleekTitle = new St.Label({
                text: 'No playback',
                style: 'font-weight: 800; font-size: 16px; font-family: sans-serif;'
            });
            
            this._sleekArtistRow = new St.BoxLayout({ vertical: false, style: 'spacing: 8px;', y_align: Clutter.ActorAlign.CENTER });
            
            this._sleekArtist = new St.Label({
                text: 'Unknown Artist',
                style: 'font-size: 13px; opacity: 0.8;'
            });
            
            this._sleekVisualizerBox = new St.BoxLayout({ vertical: false, y_align: Clutter.ActorAlign.CENTER });
            this._sleekVisualizer = null;
            if (mpSettings) {
                this._sleekVisualizer = new WaveformVisualizer(16, mpSettings, false);
                this._sleekVisualizer.setMode(1);
                this._sleekVisualizerBox.add_child(this._sleekVisualizer);
            }
            
            this._sleekArtistRow.add_child(this._sleekArtist);
            this._sleekArtistRow.add_child(this._sleekVisualizerBox);

            this._sleekInfoCol.add_child(this._sleekTitle);
            this._sleekInfoCol.add_child(this._sleekArtistRow);

            this._sleekControls = new St.BoxLayout({
                vertical: false,
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 12px;'
            });

            this._sleekPrevBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-backward-symbolic', icon_size: 20 }), reactive: true });
            this._sleekPlayBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-playback-start-symbolic', icon_size: 20 }), reactive: true });
            this._sleekNextBtn = new St.Button({ child: new St.Icon({ icon_name: 'media-skip-forward-symbolic', icon_size: 20 }), reactive: true });

            this._sleekControls.add_child(this._sleekPrevBtn);
            this._sleekControls.add_child(this._sleekPlayBtn);
            this._sleekControls.add_child(this._sleekNextBtn);

            this._sleekBox.add_child(this._sleekArt);
            this._sleekBox.add_child(this._sleekInfoCol);
            this._sleekBox.add_child(this._sleekControls);

            this._rotationAngle = 0;
            this._rotationTimer = null;
            this._isPlaying = false;

            this._mainContainer = new St.Widget({ layout_manager: new Clutter.BinLayout() });
            this._mainContainer.add_child(this._simpleBox);
            this._mainContainer.add_child(this._vinylBox);
            this._mainContainer.add_child(this._posterBox);
            this._mainContainer.add_child(this._sleekBox);
            this.add_child(this._mainContainer);

            try {
                this._playBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.togglePlayback();
                });
                this._vinylPlayBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.togglePlayback();
                });
                this._posterPlayBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.togglePlayback();
                });
                this._sleekPlayBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.togglePlayback();
                });
                
                this._nextBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.next();
                });
                this._vinylNextBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.next();
                });
                this._posterNextBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.next();
                });
                this._sleekNextBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.next();
                });
                
                this._prevBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.previous();
                });
                this._vinylPrevBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.previous();
                });
                this._posterPrevBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.previous();
                });
                this._sleekPrevBtn.connect('clicked', () => {
                    if (this.extension && this.extension.musicController) this.extension.musicController.previous();
                });
            } catch (e) {}

            this._syncSettings();
            
            // Connect to MusicController for lyrics and metadata if available
            try {
                if (this.extension && this.extension.musicController) {
                    this.extension.musicController._hydroMediaRef = this;
                    // Trigger an initial update to populate current state
                    this.extension.musicController._updateUI();
                }
            } catch (e) {}
        }

        setLyric(lrc) {
            if (!this._vinylLyric) return;
            if (lrc && lrc.content) {
                this._vinylLyric.set_text(lrc.content);
                this._vinylLyric.show();
            } else {
                this._vinylLyric.set_text('');
                this._vinylLyric.hide();
            }
        }

        _startRotation() {
            if (this._rotationTimer) return;
            this._rotationTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 33, () => {
                if (!this || (this.is_finalized && this.is_finalized())) {
                    this._rotationTimer = null;
                    return GLib.SOURCE_REMOVE;
                }
                if (!this._vinylBox.visible) return GLib.SOURCE_CONTINUE;
                if (this._isPlaying) {
                    this._rotationAngle += 1;
                    if (this._rotationAngle >= 360) this._rotationAngle = 0;
                    this._vinylRecord.rotation_angle_z = this._rotationAngle;
                }
                return GLib.SOURCE_CONTINUE;
            });
        }

        updateDisplay(title, artist, artUrl, playbackStatus, busName, isSkipActive, player) {
            try {
                this._isPlaying = (playbackStatus === 'Playing');
                
                let safeTitle = title || 'No playback';
                let safeArtist = artist || 'Unknown Artist';
                
                this._titleLabel.set_text(safeTitle);
                this._artistLabel.set_text(safeArtist);
                this._vinylTitle.set_text(safeTitle);
                this._vinylArtist.set_text(safeArtist);
                this._posterTitle.set_text(safeTitle);
                this._posterArtist.set_text(safeArtist);
                this._sleekTitle.set_text(safeTitle);
                this._sleekArtist.set_text(safeArtist);
                
                if (this._playBtn && this._playBtn.get_child()) {
                    this._playBtn.get_child().icon_name = this._isPlaying ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
                }
                if (this._vinylPlayBtn && this._vinylPlayBtn.get_child()) {
                    this._vinylPlayBtn.get_child().icon_name = this._isPlaying ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
                }
                if (this._posterPlayBtn && this._posterPlayBtn.get_child()) {
                    this._posterPlayBtn.get_child().icon_name = this._isPlaying ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
                }
                if (this._sleekPlayBtn && this._sleekPlayBtn.get_child()) {
                    this._sleekPlayBtn.get_child().icon_name = this._isPlaying ? 'media-playback-pause-symbolic' : 'media-playback-start-symbolic';
                }
                
                if (this._vinylVisualizer) this._vinylVisualizer.setPlaying(this._isPlaying);
                if (this._sleekVisualizer) this._sleekVisualizer.setPlaying(this._isPlaying);
                if (this._isPlaying) this._startRotation();

                if (artUrl) {
                    this._albumArt.setArt(artUrl, true);
                    this._vinylArt.setArt(artUrl, true);
                    this._posterArt.setArt(artUrl, true);
                    this._sleekArt.setArt(artUrl, true);
                } else {
                    this._albumArt.setArt(null);
                    this._vinylArt.setArt(null);
                    this._posterArt.setArt(null);
                    this._sleekArt.setArt(null);
                }
            } catch (e) {
                log('BarEnhanced: Error in HydroMediaWidget.updateDisplay: ' + e);
            }
        }

        _syncSettings() {
            super._syncSettings();
            let size = this._settings ? this._settings.get_double('hydro-media-size') : 220;
            const scale = size / 220.0;
            this.set_size(Math.round(220 * 1.8 * scale), Math.round(220 * scale));

            // Dynamic scaling for Simple Box
            this._albumArt.set_size(Math.round(64 * scale), Math.round(64 * scale));
            this._albumArt.setRadius(Math.round(12 * scale));
            this._albumArt.style = `background-color: rgba(255,255,255,0.1); padding: ${Math.round(8 * scale)}px;`;
            this._titleLabel.style = `font-weight: bold; font-size: ${Math.round(16 * scale)}px; font-family: sans-serif;`;
            this._artistLabel.style = `font-size: ${Math.round(13 * scale)}px; opacity: 0.7;`;
            this._simpleBox.style = `spacing: ${Math.round(16 * scale)}px; width: 100%;`;
            this._infoCol.style = `spacing: ${Math.round(4 * scale)}px;`;
            this._controlsBox.style = `spacing: ${Math.round(12 * scale)}px; margin-top: ${Math.round(8 * scale)}px;`;
            this._prevBtn.get_child().icon_size = Math.round(20 * scale);
            this._playBtn.get_child().icon_size = Math.round(20 * scale);
            this._nextBtn.get_child().icon_size = Math.round(20 * scale);

            // Dynamic scaling for Vinyl Box
            this._vinylBox.style = `spacing: ${Math.round(24 * scale)}px;`;
            this._vinylRecord.set_size(Math.round(140 * scale), Math.round(140 * scale));
            this._vinylArt.setRadius(Math.round(70 * scale));
            this._vinylHole.set_size(Math.round(30 * scale), Math.round(30 * scale));
            this._vinylHole.style = `border-radius: 999px; background-color: #222; border: ${Math.max(1, Math.round(2 * scale))}px solid #111;`;
            
            this._vinylInfoCol.style = `spacing: ${Math.round(8 * scale)}px;`;
            this._vinylTitle.style = `font-weight: 900; font-size: ${Math.round(24 * scale)}px; font-family: sans-serif;`;
            this._vinylArtist.style = `font-size: ${Math.round(16 * scale)}px; opacity: 0.8;`;
            
            this._vinylExtraBox.style = `spacing: ${Math.round(12 * scale)}px; margin-top: ${Math.round(4 * scale)}px;`;
            this._vinylLyric.style = `font-size: ${Math.round(14 * scale)}px; font-style: italic; opacity: 0.9; max-width: ${Math.round(200 * scale)}px;`;
            
            if (this._vinylVisualizer) {
                this._vinylVisualizer.set_scale(scale, scale);
                this._vinylVisualizer.set_pivot_point(0, 0.5);
            }
            
            this._vinylControlsBox.style = `spacing: ${Math.round(16 * scale)}px; margin-top: ${Math.round(12 * scale)}px;`;
            this._vinylPrevBtn.get_child().icon_size = Math.round(24 * scale);
            this._vinylPlayBtn.get_child().icon_size = Math.round(24 * scale);
            this._vinylNextBtn.get_child().icon_size = Math.round(24 * scale);

            // Dynamic scaling for Poster Box
            this._posterBox.style = `spacing: ${Math.round(16 * scale)}px;`;
            this._posterArt.set_size(Math.round(180 * scale), Math.round(180 * scale));
            this._posterArt.setRadius(Math.round(24 * scale));
            
            this._posterInfoCol.style = `spacing: ${Math.round(6 * scale)}px;`;
            this._posterTitle.style = `font-weight: 900; font-size: ${Math.round(20 * scale)}px; font-family: sans-serif;`;
            this._posterArtist.style = `font-size: ${Math.round(14 * scale)}px; opacity: 0.8;`;
            
            this._posterControls.style = `spacing: ${Math.round(24 * scale)}px; margin-top: ${Math.round(8 * scale)}px;`;
            this._posterPrevBtn.get_child().icon_size = Math.round(24 * scale);
            this._posterPlayBtn.get_child().icon_size = Math.round(28 * scale);
            this._posterNextBtn.get_child().icon_size = Math.round(24 * scale);

            // Dynamic scaling for Sleek Box
            this._sleekBox.style = `spacing: ${Math.round(16 * scale)}px; width: 100%;`;
            this._sleekArt.set_size(Math.round(56 * scale), Math.round(56 * scale));
            this._sleekArt.setRadius(Math.round(28 * scale));
            
            this._sleekInfoCol.style = `spacing: ${Math.round(2 * scale)}px;`;
            this._sleekTitle.style = `font-weight: 800; font-size: ${Math.round(16 * scale)}px; font-family: sans-serif;`;
            
            this._sleekArtistRow.style = `spacing: ${Math.round(8 * scale)}px;`;
            this._sleekArtist.style = `font-size: ${Math.round(13 * scale)}px; opacity: 0.8;`;
            this._sleekVisualizerBox.style = `margin-top: ${Math.round(4 * scale)}px;`;
            
            if (this._sleekVisualizer) {
                this._sleekVisualizer.set_scale(scale * 0.7, scale * 0.7);
                this._sleekVisualizer.set_pivot_point(0, 1);
            }
            this._sleekControls.style = `spacing: ${Math.round(12 * scale)}px;`;
            this._sleekPrevBtn.get_child().icon_size = Math.round(20 * scale);
            this._sleekPlayBtn.get_child().icon_size = Math.round(20 * scale);
            this._sleekNextBtn.get_child().icon_size = Math.round(20 * scale);

            let style = this._settings ? this._settings.get_string('hydro-media-style') : 'simple';
            
            this._simpleBox.hide();
            this._vinylBox.hide();
            this._posterBox.hide();
            this._sleekBox.hide();

            if (style === 'vinyl') {
                this.set_size(Math.round(220 * 1.8 * scale), Math.round(220 * scale));
                this._vinylBox.show();
            } else if (style === 'poster') {
                this.set_size(Math.round(220 * 1.1 * scale), Math.round(220 * 1.6 * scale));
                this._posterBox.show();
            } else if (style === 'sleek') {
                this.set_size(-1, Math.round(220 * 0.45 * scale));
                this._sleekBox.show();
            } else {
                this.set_size(Math.round(220 * 1.8 * scale), Math.round(220 * scale));
                this._simpleBox.show();
            }
        }

        updateColors(primary, background, secondary) {
            super.updateColors(primary, background, secondary);
            let size = this._settings ? this._settings.get_double('hydro-media-size') : 220;
            let style = this._settings ? this._settings.get_string('hydro-media-style') : 'simple';
            const scale = size / 220.0;
            
            let radius = 32;
            if (style === 'sleek') {
                radius = 999; // Perfect pill shape
            }
            
            this.style = `
                background-color: ${background};
                color: ${primary};
                border-radius: ${radius}px;
                box-shadow: 0 ${Math.round(4 * scale)}px ${Math.round(12 * scale)}px rgba(0,0,0,0.15);
                padding: ${Math.round(20 * scale)}px;
            `;
        }

        destroy() {
            if (this._rotationTimer) {
                GLib.Source.remove(this._rotationTimer);
                this._rotationTimer = null;
            }
            if (this.extension && this.extension.musicController && this.extension.musicController._hydroMediaRef === this) {
                this.extension.musicController._hydroMediaRef = null;
            }
            super.destroy();
        }
    }
);

// Main Manager for Hydro-Widgets
export class HydroWidgetsManager {
    constructor(extension) {
        this.extension = extension;
        this.widgets = [];
        this.enabled = false;
        this.container = null;
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;

        // Container layer for floating widgets
        this.container = new St.Widget({
            layout_manager: new Clutter.FixedLayout(),
            x_expand: true,
            y_expand: true,
            visible: true,
            width: global.display.get_monitor_geometry(Main.layoutManager.primaryIndex).width,
            height: global.display.get_monitor_geometry(Main.layoutManager.primaryIndex).height
        });

        // Ensure container doesn't block desktop clicks, but let children be reactive
        this.container.reactive = false;

        // Add directly as a child of backgroundGroup so it is drawn on the desktop background
        if (Main.layoutManager._backgroundGroup) {
            Main.layoutManager._backgroundGroup.add_child(this.container);
            // Move to the top of the background group to ensure it's above the wallpaper
            try {
                Main.layoutManager._backgroundGroup.set_child_above_sibling(this.container, null);
            } catch (e) {
                // If it fails, it's already added at the top anyway
            }
        } else {
            // Fallback to uiGroup if backgroundGroup is not found
            Main.layoutManager.uiGroup.insert_child_at_index(this.container, 0);
        }

        this.createWidgets();
        this.applyMonetColors();

        this._settingsSignals = [];
        const trackToggle = (key, WidgetClass) => {
            this._settingsSignals.push(this.extension._settings.connect(`changed::${key}`, () => {
                let enabled = this.extension._settings.get_boolean(key);
                if (enabled) {
                    let exists = this.widgets.find(w => w instanceof WidgetClass);
                    if (!exists) {
                        let w = new WidgetClass(this.extension);
                        this.container.add_child(w);
                        this.widgets.push(w);
                        this.applyMonetColors();
                    }
                } else {
                    let idx = this.widgets.findIndex(w => w instanceof WidgetClass);
                    if (idx >= 0) {
                        let w = this.widgets[idx];
                        w.destroy();
                        this.widgets.splice(idx, 1);
                    }
                }
            }));
        };

        trackToggle('hydro-clock-enabled', HydroClockWidget);
        trackToggle('hydro-weather-enabled', HydroWeatherWidget);
        trackToggle('hydro-calendar-enabled', HydroCalendarWidget);
        trackToggle('hydro-battery-enabled', HydroBatteryWidget);
        trackToggle('hydro-media-enabled', HydroMediaWidget);

        // Connect to Overview signals to hide widgets when showing all windows
        this._overviewShowingId = Main.overview.connect('showing', () => this._onOverviewShowing());
        this._overviewHiddenId = Main.overview.connect('hidden', () => this._onOverviewHidden());
    }

    _onOverviewShowing() {
        if (this.container) {
            this.container.ease({
                opacity: 0,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
        }
    }

    _onOverviewHidden() {
        if (this.container) {
            this.container.ease({
                opacity: 255,
                duration: 200,
                mode: Clutter.AnimationMode.EASE_IN_QUAD
            });
        }
    }

    createWidgets() {
        // Create Clock Widget
        if (this.extension._settings.get_boolean('hydro-clock-enabled')) {
            let clock = new HydroClockWidget(this.extension);
            this.container.add_child(clock);
            this.widgets.push(clock);
        }

        // Create Weather Widget
        if (this.extension._settings.get_boolean('hydro-weather-enabled')) {
            let weather = new HydroWeatherWidget(this.extension);
            this.container.add_child(weather);
            this.widgets.push(weather);
        }

        // Create Calendar Widget
        if (this.extension._settings.get_boolean('hydro-calendar-enabled')) {
            let calendar = new HydroCalendarWidget(this.extension);
            this.container.add_child(calendar);
            this.widgets.push(calendar);
        }

        // Create Battery Widget
        if (this.extension._settings.get_boolean('hydro-battery-enabled')) {
            let battery = new HydroBatteryWidget(this.extension);
            this.container.add_child(battery);
            this.widgets.push(battery);
        }

        // Create Media Player Widget
        if (this.extension._settings.get_boolean('hydro-media-enabled')) {
            let media = new HydroMediaWidget(this.extension);
            this.container.add_child(media);
            this.widgets.push(media);
        }
    }

    applyMonetColors() {
        // Custom color overrides check
        let useCustom = this.extension._settings.get_boolean('hydro-use-custom-colors');
        if (useCustom) {
            let bg = this.extension._settings.get_string('hydro-custom-bg') || '#f1f0ee';
            let fg1 = this.extension._settings.get_string('hydro-custom-fg1') || '#4a4542';
            let fg2 = this.extension._settings.get_string('hydro-custom-fg2') || '#a13835';
            this.widgets.forEach(w => w.updateColors(fg1, bg, fg2));
            return;
        }

        // Fetch palette from existing extension logic (BarEnhanced's Quantize/Pywal)
        // We use the already extracted palette1 (Primary) and palette2 (Secondary)
        let primaryColor = '#8ab4f8';
        let backgroundColor = 'rgba(32, 33, 36, 0.85)';
        let secondaryColor = '#fbbc04';

        if (this.extension && this.extension.immersiveColorOverride) {
            let ic = this.extension.immersiveColorOverride;
            backgroundColor = `rgba(${ic.r}, ${ic.g}, ${ic.b}, 0.85)`;
            let brightness = (ic.r * 299 + ic.g * 587 + ic.b * 114) / 1000;
            if (brightness > 160) {
                primaryColor = 'rgb(0, 0, 0)';
                secondaryColor = 'rgb(0, 0, 0)';
            } else {
                primaryColor = 'rgb(255, 255, 255)';
                secondaryColor = 'rgb(255, 255, 255)';
            }
            this.widgets.forEach(w => w.updateColors(primaryColor, backgroundColor, secondaryColor));
            return;
        }

        const palette1 = this.extension._settings.get_strv('palette1');
        const palette2 = this.extension._settings.get_strv('palette2');
        const palette3 = this.extension._settings.get_strv('palette3');

        if (palette1 && palette1.length === 3) {
            backgroundColor = `rgba(${palette1[0]}, ${palette1[1]}, ${palette1[2]}, 0.85)`;
        }
        if (palette2 && palette2.length === 3) {
            primaryColor = `rgb(${palette2[0]}, ${palette2[1]}, ${palette2[2]})`;
        } else if (palette1 && palette1.length === 3) {
            primaryColor = `rgb(255, 255, 255)`;
        }
        if (palette3 && palette3.length === 3) {
            secondaryColor = `rgb(${palette3[0]}, ${palette3[1]}, ${palette3[2]})`;
        } else {
            secondaryColor = primaryColor;
        }

        this.widgets.forEach(w => w.updateColors(primaryColor, backgroundColor, secondaryColor));
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;

        if (this._settingsSignals) {
            this._settingsSignals.forEach(id => this.extension._settings.disconnect(id));
            this._settingsSignals = null;
        }

        if (this._overviewShowingId) {
            Main.overview.disconnect(this._overviewShowingId);
            this._overviewShowingId = null;
        }
        if (this._overviewHiddenId) {
            Main.overview.disconnect(this._overviewHiddenId);
            this._overviewHiddenId = null;
        }

        this.widgets.forEach(w => w.destroy());
        this.widgets = [];

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
