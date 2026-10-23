// GNOME Shell 51 removed ui/pointerWatcher.js. Keep the dock's watch API
// available on GNOME 50 and 51 without changing its consumers.
import GLib from 'gi://GLib';

const MIN_INTERVAL_MS = 16;

class PointerWatcher {
    constructor() {
        this._watches = new Set();
    }

    addWatch(interval, callback) {
        const tracker = global.backend.get_cursor_tracker();
        let [lastX, lastY] = tracker.get_pointer();
        const watch = {
            _id: 0,
            remove: () => this._removeWatch(watch),
        };

        watch._id = GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            Math.max(interval, MIN_INTERVAL_MS), () => {
                const [x, y] = tracker.get_pointer();
                if (x !== lastX || y !== lastY) {
                    lastX = x;
                    lastY = y;
                    callback(x, y);
                }
                return GLib.SOURCE_CONTINUE;
            });
        this._watches.add(watch);
        return watch;
    }

    // Kept for callers that used the old private API.
    _removeWatch(watch) {
        if (!watch)
            return;
        if (watch._id) {
            GLib.Source.remove(watch._id);
            watch._id = 0;
        }
        this._watches.delete(watch);
    }

    destroy() {
        for (const watch of [...this._watches])
            this._removeWatch(watch);
    }
}

let instance = null;

export function getPointerWatcher() {
    instance ??= new PointerWatcher();
    return instance;
}
