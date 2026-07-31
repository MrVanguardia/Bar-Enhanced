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
        this._parallaxSignals = [];
        this._bgManager = null;
        this._bgActor = null;
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;

        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-enabled', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-uri', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-type', this._sync.bind(this)));
        
        // Setup Parallax Effect
        this._setupParallax();

        this._sync();
    }

    _setupParallax() {
        // Find the background actor
        import('resource:///org/gnome/shell/ui/main.js').then(Main => {
            if (Main.layoutManager && Main.layoutManager._backgroundGroup) {
                let children = Main.layoutManager._backgroundGroup.get_children();
                if (children.length > 0) {
                    this._bgActor = children[0]; // Usually the primary background actor
                    
                    // Slightly scale it up to allow moving without showing black borders
                    this._bgActor.set_scale(1.05, 1.05);
                    this._bgActor.set_pivot_point(0.5, 0.5);

                    // Track mouse movement globally
                    this._parallaxSignals.push(
                        global.stage.connect('captured-event', (actor, event) => {
                            if (event.type() === Clutter.EventType.MOTION) {
                                let [x, y] = event.get_coords();
                                let monitor = Main.layoutManager.primaryMonitor;
                                if (!monitor) return Clutter.EVENT_PROPAGATE;
                                
                                // Calculate normalized mouse position (-1 to 1)
                                let nx = (x / monitor.width) * 2 - 1;
                                let ny = (y / monitor.height) * 2 - 1;
                                
                                // Max shift in pixels
                                let maxShift = 20; 
                                
                                // Apply opposite shift (parallax)
                                this._bgActor.ease({
                                    translation_x: -nx * maxShift,
                                    translation_y: -ny * maxShift,
                                    duration: 100,
                                    mode: Clutter.AnimationMode.EASE_OUT_QUAD
                                });
                            }
                            return Clutter.EVENT_PROPAGATE;
                        })
                    );
                }
            }
        }).catch(e => console.error("BarEnhanced: Parallax setup failed", e));
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        for (let id of this._settingsSignals) {
            this.settings.disconnect(id);
        }
        this._settingsSignals = [];

        // Cleanup Parallax
        if (this._parallaxSignals.length > 0) {
            import('gi://Shell').then(Shell => {
                let global = Shell.Global.get();
                this._parallaxSignals.forEach(id => global.stage.disconnect(id));
                this._parallaxSignals = [];
            });
        }
        if (this._bgActor) {
            this._bgActor.set_scale(1.0, 1.0);
            this._bgActor.remove_all_transitions();
            this._bgActor.set_translation(0, 0, 0);
            this._bgActor = null;
        }

        this._stopVideo();
    }

    _sync() {
        if (!this.settings.get_boolean('hydro-wallpaper-enabled')) {
            this._stopVideo();
            return;
        }

        const type = this.settings.get_string('hydro-wallpaper-type');
        const uri = this.settings.get_string('hydro-wallpaper-uri');

        if (type === 'video' && uri) {
            this._playVideo(uri);
        } else if (type === 'image' && uri) {
            this._stopVideo();
            this._setImageWallpaper(uri);
        } else {
            this._stopVideo();
        }
    }

    _setImageWallpaper(path) {
        try {
            const bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
            bgSettings.set_string('picture-uri', `file://${path}`);
            bgSettings.set_string('picture-uri-dark', `file://${path}`);
        } catch (e) {
            console.error('Bar Enhanced: Error setting image wallpaper:', e);
        }
    }

    _playVideo(path) {
        try {
            this._videoProcess = Gio.Subprocess.new(
                [this._scriptPath, path],
                Gio.SubprocessFlags.NONE
            );
        } catch (e) {
            console.error('Bar Enhanced: Error launching wallpaper script:', e);
        }
    }

    _stopVideo() {
        try {
            const proc = Gio.Subprocess.new(
                [this._scriptPath, 'stop'],
                Gio.SubprocessFlags.NONE
            );
        } catch (e) {}
    }
}
