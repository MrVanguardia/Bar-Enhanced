import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WallpaperManager {
    constructor(extension) {
        this.extension = extension;
        this.settings = this.extension._settings;
        this._scriptPath = this.extension.dir.get_child('play-wallpaper.sh').get_path();
        this._enabled = false;
        
        this._settingsSignals = [];
        this._bgActor = null;
        this._parallaxSignalId = 0;
        this._parallaxSetupId = 0;
        this._layoutSignalId = 0;
        this._videoPath = null;
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;

        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-enabled', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-uri', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-type', this._sync.bind(this)));
        this._layoutSignalId = Main.layoutManager.connect('monitors-changed', () => this._scheduleParallax());
        
        this._sync();
    }

    _setupParallax() {
        if (!this._enabled || this._parallaxSignalId || !Main.layoutManager?._backgroundGroup)
            return;

        const primary = Main.layoutManager.primaryMonitor;
        const background = Main.layoutManager._backgroundGroup.get_children().find(actor => {
            const [x, y] = actor.get_transformed_position();
            return primary && x <= primary.x && y <= primary.y &&
                x + actor.width >= primary.x + primary.width &&
                y + actor.height >= primary.y + primary.height;
        });
        if (!background)
            return;

        this._bgActor = background;
        this._bgActor.set_scale(1.05, 1.05);
        this._bgActor.set_pivot_point(0.5, 0.5);
        this._parallaxSignalId = global.stage.connect('captured-event', (actor, event) => {
            if (!this._enabled || !this._bgActor || event.type() !== Clutter.EventType.MOTION)
                return Clutter.EVENT_PROPAGATE;

            const [x, y] = event.get_coords();
            const monitor = Main.layoutManager.primaryMonitor;
            if (!monitor || !monitor.width || !monitor.height)
                return Clutter.EVENT_PROPAGATE;

            const nx = ((x - monitor.x) / monitor.width) * 2 - 1;
            const ny = ((y - monitor.y) / monitor.height) * 2 - 1;
            this._bgActor.ease({
                translation_x: -nx * 20,
                translation_y: -ny * 20,
                duration: 100,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
            return Clutter.EVENT_PROPAGATE;
        });
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        for (let id of this._settingsSignals) {
            this.settings.disconnect(id);
        }
        this._settingsSignals = [];
        if (this._layoutSignalId) {
            Main.layoutManager.disconnect(this._layoutSignalId);
            this._layoutSignalId = 0;
        }
        if (this._parallaxSetupId) {
            GLib.Source.remove(this._parallaxSetupId);
            this._parallaxSetupId = 0;
        }

        this._teardownParallax();

        this._stopVideo();
    }

    _teardownParallax() {
        if (this._parallaxSignalId) {
            try {
                global.stage.disconnect(this._parallaxSignalId);
            } catch (e) {
                console.warn(`BarEnhanced: Could not disconnect parallax listener: ${e.message}`);
            }
            this._parallaxSignalId = 0;
        }
        if (this._bgActor) {
            this._bgActor.set_scale(1.0, 1.0);
            this._bgActor.remove_all_transitions();
            this._bgActor.set_translation(0, 0, 0);
            this._bgActor = null;
        }
    }

    _scheduleParallax() {
        if (this._parallaxSetupId) {
            GLib.Source.remove(this._parallaxSetupId);
            this._parallaxSetupId = 0;
        }
        if (!this._enabled || !this.settings.get_boolean('hydro-wallpaper-enabled') ||
            this.settings.get_string('hydro-wallpaper-type') !== 'image')
            return;
        this._parallaxSetupId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            this._parallaxSetupId = 0;
            this._teardownParallax();
            this._setupParallax();
            return GLib.SOURCE_REMOVE;
        });
    }

    _sync() {
        if (!this.settings.get_boolean('hydro-wallpaper-enabled')) {
            this._stopVideo();
            this._teardownParallax();
            return;
        }

        const type = this.settings.get_string('hydro-wallpaper-type');
        const uri = this.settings.get_string('hydro-wallpaper-uri');

        if (type === 'video' && uri) {
            this._teardownParallax();
            this._playVideo(uri);
        } else if (type === 'image' && uri) {
            this._stopVideo();
            this._setImageWallpaper(uri);
            this._scheduleParallax();
        } else {
            this._stopVideo();
            this._teardownParallax();
        }
    }

    _setImageWallpaper(pathOrUri) {
        try {
            const bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
            const file = GLib.uri_parse_scheme(pathOrUri)
                ? Gio.File.new_for_uri(pathOrUri)
                : Gio.File.new_for_path(pathOrUri);
            const uri = file.get_uri();
            bgSettings.set_string('picture-uri', uri);
            bgSettings.set_string('picture-uri-dark', uri);
        } catch (e) {
            console.error('Bar Enhanced: Error setting image wallpaper:', e);
        }
    }

    _playVideo(pathOrUri) {
        try {
            const path = GLib.uri_parse_scheme(pathOrUri)
                ? Gio.File.new_for_uri(pathOrUri).get_path()
                : pathOrUri;
            if (!path)
                throw new Error('The selected video is not a local file');
            if (this._videoPath === path)
                return;
            this._stopVideo();
            this._videoProcess = Gio.Subprocess.new(
                [this._scriptPath, path],
                Gio.SubprocessFlags.NONE
            );
            this._videoPath = path;
        } catch (e) {
            console.error('Bar Enhanced: Error launching wallpaper script:', e);
        }
    }

    _stopVideo() {
        try {
            Gio.Subprocess.new(
                [this._scriptPath, 'stop'],
                Gio.SubprocessFlags.NONE
            );
        } catch (e) {
            console.warn(`BarEnhanced: Could not stop video wallpaper: ${e.message}`);
        }
        this._videoProcess = null;
        this._videoPath = null;
    }
}
