import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export class WallpaperManager {
    constructor(extension) {
        this.extension = extension;
        this.settings = this.extension._settings;
        this._scriptPath = this.extension.dir.get_child('play-wallpaper.sh').get_path();
        this._enabled = false;
        
        this._settingsSignals = [];
        this._videoPath = null;
        this._videoProcess = null;
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;

        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-enabled', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-uri', this._sync.bind(this)));
        this._settingsSignals.push(this.settings.connect('changed::hydro-wallpaper-type', this._sync.bind(this)));
        this._sync();
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        for (let id of this._settingsSignals) {
            this.settings.disconnect(id);
        }
        this._settingsSignals = [];
        this._stopVideo();
        this.settings = null;
        this.extension = null;
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
            // Do not spawn a separate "stop" process here: it would run
            // concurrently with the new player and could read the PID file
            // after the new player wrote it, killing the video just started.
            // play-wallpaper.sh always stops the previous player itself.
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
        if (!this._videoProcess && !this._videoPath)
            return;

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
