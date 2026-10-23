import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

Gio._promisify(Gio.File.prototype, 'replace_contents_async', 'replace_contents_finish');

export class SharedVisualizerEngine {
    static _instance = null;

    static get() {
        if (!this._instance) {
            this._instance = new SharedVisualizerEngine();
        }
        return this._instance;
    }

    static destroy() {
        if (this._instance) {
            this._instance.stopCava();
            this._instance = null;
        }
    }

    constructor() {
        this._subscribers = new Map(); // callback -> isPlaying
        this._cavaProcess = null;
        this._fixedBarCount = 64; 
        
        this._bins = new Array(this._fixedBarCount).fill(0);
        this._silentFrames = 0;
        this._rollingMax = 2000;
        this._restartId = null;
        this._starting = false;
        this._generation = 0;
    }

    subscribe(callback) {
        if (!this._subscribers.has(callback)) {
            this._subscribers.set(callback, false);
        }
        this._evaluatePlayback();
    }

    unsubscribe(callback) {
        this._subscribers.delete(callback);
        this._evaluatePlayback();
    }

    setPlaying(callback, playing) {
        if (this._subscribers.has(callback)) {
            this._subscribers.set(callback, playing);
            this._evaluatePlayback();
        }
    }

    _evaluatePlayback() {
        const anyPlaying = this._hasPlayingSubscribers();

        if (anyPlaying) {
            if (!this._cavaProcess) this.startCava();
        } else {
            this.stopCava();
            this._broadcast(new Array(this._fixedBarCount).fill(0), true);
        }
    }

    _hasPlayingSubscribers() {
        for (const isPlaying of this._subscribers.values()) {
            if (isPlaying) return true;
        }
        return false;
    }

    async startCava() {
        if (this._cavaProcess || this._starting) return;
        this._starting = true;
        const generation = this._generation;
        try {
            if (!GLib.find_program_in_path('cava')) return;

            let tmpConfig = `${GLib.get_tmp_dir()}/dynamic-pill-cava-${GLib.get_monotonic_time()}`;
            
            let cfg = `[general]\n` +
                      `bars = ${this._fixedBarCount}\n` +
                      `framerate = 60\n` +
                      `autosens = 1\n` +
                      `lower_cutoff_freq = 50\n` +
                      `higher_cutoff_freq = 8000\n` +  
                      `[smoothing]\n` +
                      `monstercat = 1.5\n` +        
                      `waves = 0\n` +
                      `noise_reduction = 60\n` +   
                      `gravity = 140\n` +             
                      `[input]\n` +
                      `method = pulse\n` +
                      `source = auto\n` +
                      `[output]\n` +
                      `method = raw\n` +
                      `bit_format = 16bit\n` +
                      `channels = mono\n` +
                      `raw_target = /dev/stdout\n`;

            const configFile = Gio.File.new_for_path(tmpConfig);
            await configFile.replace_contents_async(
                new TextEncoder().encode(cfg), null, false,
                Gio.FileCreateFlags.REPLACE_DESTINATION, null);

            // The asynchronous write can finish after the last subscriber has
            // gone away (or after disable()).  Do not revive Cava in that
            // later lifecycle generation.
            if (generation !== this._generation || !this._hasPlayingSubscribers()) {
                this._removeTmpConfig(tmpConfig);
                return;
            }
            this._tmpConfigPath = tmpConfig;

            let launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            
            launcher.setenv('PULSE_PROP', 'application.id=org.PulseAudio.pavucontrol', true);

            this._process = launcher.spawnv(['cava', '-p', tmpConfig]);
            const process = this._process;

            this._stdout = this._process.get_stdout_pipe();
            this._cancellable = new Gio.Cancellable();
            this._bufferUsed = 0;
            this._rawBuffer = new Uint8Array(8192);
            this._cavaProcess = true;

            this._readStdoutBytes();
            process.wait_async(null, (completedProcess, result) => {
                try { completedProcess.wait_finish(result); } catch (e) {}
                // stopCava() clears _process before deliberately terminating
                // Cava, so only an unexpected exit reaches this branch.
                if (this._process !== process) return;
                this._process = null;
                if (this._cancellable) {
                    this._cancellable.cancel();
                    this._cancellable = null;
                }
                this._stdout = null;
                this._cavaProcess = false;
                if (this._tmpConfigPath === tmpConfig) {
                    this._removeTmpConfig(tmpConfig);
                    this._tmpConfigPath = null;
                }
                if (this._hasPlayingSubscribers() && !this._restartId) {
                    this._restartId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                        this._restartId = null;
                        if (this._hasPlayingSubscribers()) this.startCava();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            });
        } catch (e) {
            console.error(`Dynamic Music Pill: failed to start Cava: ${e.message}`);
        } finally {
            this._starting = false;
        }
    }

    _removeTmpConfig(path) {
        if (!path)
            return;
        try {
            Gio.File.new_for_path(path).delete_async(
                GLib.PRIORITY_DEFAULT, null, () => {});
        } catch (e) {
            // A failed cleanup must not keep the audio visualizer alive.
        }
    }

    _readStdoutBytes() {
        if (!this._stdout || !this._cancellable || this._cancellable.is_cancelled()) return;

        let readSize = Math.max(4096, this._fixedBarCount * 2 * 4);
        this._stdout.read_bytes_async(readSize, GLib.PRIORITY_DEFAULT, this._cancellable, (stream, res) => {
            try {
                let gbytes = stream.read_bytes_finish(res);
                if (!gbytes) return;

                let chunk = gbytes.get_data();
                if (!chunk || chunk.length === 0) {
                    this._readStdoutBytes();
                    return;
                }

                let needed = this._bufferUsed + chunk.length;
                if (needed > this._rawBuffer.length) {
                    let newBuffer = new Uint8Array(Math.max(needed, this._rawBuffer.length * 2));
                    newBuffer.set(this._rawBuffer.subarray(0, this._bufferUsed));
                    this._rawBuffer = newBuffer;
                }
                this._rawBuffer.set(chunk, this._bufferUsed);
                this._bufferUsed += chunk.length;

                let frameSize = this._fixedBarCount * 2;
                let totalFrames = Math.floor(this._bufferUsed / frameSize);

                if (totalFrames > 0) {
                    let lastFrameOffset = (totalFrames - 1) * frameSize;
                    let dv = new DataView(this._rawBuffer.buffer, this._rawBuffer.byteOffset + lastFrameOffset, frameSize);

                    let currentFrameMax = 1;
                    for (let i = 0; i < this._fixedBarCount; i++) {
                        let v = dv.getUint16(i * 2, true);
                        this._bins[i] = v;
                        if (v > currentFrameMax) currentFrameMax = v;
                    }

                    if (currentFrameMax < 100) {
                        this._silentFrames++;
                    } else {
                        this._silentFrames = 0;
                    }

                    let normalizedArray = new Array(this._fixedBarCount).fill(0);

                    if (this._silentFrames >= 30) {
                        this._rollingMax = 2000;
                    } else {
                        if (currentFrameMax > this._rollingMax) {
                            this._rollingMax = currentFrameMax;
                        } else {
                            this._rollingMax = this._rollingMax * 0.98 + currentFrameMax * 0.02;
                        }
                        
                        let safeMax = Math.max(this._rollingMax, 5000); 
                        let invMaxVal = 1 / safeMax;

                        for (let i = 0; i < this._fixedBarCount; i++) {
                            normalizedArray[i] = Math.min(1.0, this._bins[i] * invMaxVal);
                        }
                    }

                    this._broadcast(normalizedArray, this._silentFrames >= 30);

                    this._rawBuffer.copyWithin(0, totalFrames * frameSize, this._bufferUsed);
                    this._bufferUsed -= totalFrames * frameSize;
                }
                this._readStdoutBytes();
            } catch (e) { }
        });
    }

    _broadcast(data, isSilent) {
        for (let cb of this._subscribers.keys()) {
            try { cb(data, isSilent); } catch (e) {
                console.error(`Dynamic Music Pill: visualizer subscriber failed: ${e.message}`);
            }
        }
    }

    stopCava() {
        this._generation++;
        if (this._restartId) {
            GLib.Source.remove(this._restartId);
            this._restartId = null;
        }
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }
        if (this._process) {
            try { this._process.force_exit(); } catch (e) { }
            this._process = null;
        }
        if (this._stdout) {
            try { this._stdout.close(null); } catch (e) { }
            this._stdout = null;
        }
        if (this._tmpConfigPath) {
            this._removeTmpConfig(this._tmpConfigPath);
            this._tmpConfigPath = null;
        }
        this._cavaProcess = false;
        this._silentFrames = 30;
    }
}
