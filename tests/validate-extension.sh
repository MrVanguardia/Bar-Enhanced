#!/usr/bin/env bash
# Fast, dependency-light validation for changes made outside a GNOME Shell session.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/bar-enhanced@mrvanguardia"
SCHEMA_DIR="$(mktemp -d)"
RUNTIME_DIR="$(mktemp -d)"
trap 'rm -rf "$SCHEMA_DIR" "$RUNTIME_DIR"' EXIT

cp "$EXTENSION_DIR"/schemas/*.xml "$SCHEMA_DIR"/
glib-compile-schemas --strict "$SCHEMA_DIR"

while IFS= read -r -d '' file; do
    node --check "$file"
done < <(find "$EXTENSION_DIR" -type f -name '*.js' -print0)

gjs -m "$ROOT_DIR/tests/color-utils.test.js"
gjs -m "$ROOT_DIR/tests/lyrics-parser.test.js"
GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas" gjs -m "$ROOT_DIR/tests/schema-contract.test.js"

bash -n "$EXTENSION_DIR/play-wallpaper.sh"
bash -n "$ROOT_DIR/tools/package-extension.sh"

if rg -q "\['pkill', '-f'|killall (mpvpaper|xwinwrap)" "$EXTENSION_DIR"; then
    echo 'Unsafe broad process termination found.' >&2
    exit 1
fi

if rg -q 'BG_IMG="\$\{bgImage\}"|LOGO_IMG="\$\{logoImage\}"' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'Unsafe GDM shell interpolation found.' >&2
    exit 1
fi

if rg -q '/tmp/gdm-(monitors|restore)\.sh' "$EXTENSION_DIR/bar-enhanced-gdm-app"; then
    echo 'Predictable privileged GDM script path found.' >&2
    exit 1
fi

if rg -q ' /tmp/(95-gdm-settings|gdm-profile)' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'TEMP_DIR=\$\(mktemp -d\)' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'GDM dconf generation must use a private temporary directory.' >&2
    exit 1
fi

if ! rg -q "curl', '--fail', '--location', '--output'" "$EXTENSION_DIR/wallpaper-store-prefs.js"; then
    echo 'Wallpaper downloads must fail safely before applying a file.' >&2
    exit 1
fi

if ! rg -q 'markFailed' "$EXTENSION_DIR/wallpaper-store-prefs.js" || ! rg -q 'requestState\?\.destroyed' "$EXTENSION_DIR/wallpaper-store-prefs.js"; then
    echo 'Wallpaper store must recover failed actions and ignore destroyed windows.' >&2
    exit 1
fi

if ! rg -q 'requestState = \{ generation: 0, destroyed: false \}' "$EXTENSION_DIR/wallpaper-store-prefs.js"; then
    echo 'Wallpaper searches can render after their window is closed.' >&2
    exit 1
fi

if ! rg -q "GLib.uuid_string_random\(\)" "$EXTENSION_DIR/prefs.js" || ! rg -q "curl', '--fail', '--location'" "$EXTENSION_DIR/prefs.js"; then
    echo 'Theme downloads must use a unique temporary path and fail safely.' >&2
    exit 1
fi

if rg -q 'cp -rf "\$\{sourceDir\}' "$EXTENSION_DIR/prefs.js"; then
    echo 'GTK4 theme copy interpolates an untrusted path into a shell command.' >&2
    exit 1
fi

if ! rg -q '_styleReloadInFlight|_styleReloadQueued' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Stylesheet reloads are not serialized.' >&2
    exit 1
fi

if ! rg -q '_styleReloadGeneration' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Stylesheet reloads can complete after the extension is disabled.' >&2
    exit 1
fi

if ! rg -q 'writeGeneratedFile' "$EXTENSION_DIR/stylesheets.js" || ! rg -q 'await Promise\.all\(\[' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Generated SVG assets must finish writing before the live stylesheet reload.' >&2
    exit 1
fi

if ! rg -q "padStart\(2, '0'\)" "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Generated SVG alpha must use valid two-digit hexadecimal notation.' >&2
    exit 1
fi

if ! rg -q '_pywalResumeTimer' "$EXTENSION_DIR/extension.js"; then
    echo 'Pywal deferred reload is not cleaned up.' >&2
    exit 1
fi

if ! rg -q '_queueDeviceUpdate|_updateIdleId' "$EXTENSION_DIR/bluetooth-battery.js"; then
    echo 'Bluetooth deferred updates are not cleaned up.' >&2
    exit 1
fi
if ! rg -q '_queueVisibility|_visibilityIdleId' "$EXTENSION_DIR/bluetooth-battery.js"; then
    echo 'Bluetooth visibility updates are not cleaned up.' >&2
    exit 1
fi
if ! rg -q '_setWeatherUnavailable|battery-missing-symbolic' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro weather and battery fallback states are incomplete.' >&2
    exit 1
fi

if ! rg -q "shape === 'pill'" "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q "shape === 'leaf'" "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Analog Hydro clock must render every supported shape instead of falling back to a circle.' >&2
    exit 1
fi

if ! rg -q 'calendarShapeRow' "$EXTENSION_DIR/hydro-widgets-prefs.js" || ! rg -q 'batteryShapeRow' "$EXTENSION_DIR/hydro-widgets-prefs.js" || ! rg -q 'mediaShapeRow' "$EXTENSION_DIR/hydro-widgets-prefs.js"; then
    echo 'Every Hydro widget with a stored shape must expose it in preferences.' >&2
    exit 1
fi

if ! rg -q 'calendarStyleRow' "$EXTENSION_DIR/hydro-widgets-prefs.js" || ! rg -q 'batteryStyleRow' "$EXTENSION_DIR/hydro-widgets-prefs.js" || ! rg -q "style === 'card'" "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q "style === 'minimal'" "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Calendar and battery style choices must be both exposed and rendered.' >&2
    exit 1
fi

if ! rg -q 'this\.updateColors\(this\._lastPrimary, this\._lastBg, this\._lastSecondary\)' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Live Hydro setting changes must retain the secondary Monet color.' >&2
    exit 1
fi

if ! rg -q "'hydro-custom-fg2'" "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q "changed::palette3" "$EXTENSION_DIR/extension.js"; then
    echo 'Hydro color overrides and the third palette color must update live.' >&2
    exit 1
fi

if ! rg -q 'source instanceof St\.Button' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro drag handling must support widget content without stealing media controls.' >&2
    exit 1
fi

if ! rg -q 'value\.length === 3 \|\| value\.length === 4' "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q 'hasAlpha \? parseInt' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Analog Hydro clock must parse custom hexadecimal colors.' >&2
    exit 1
fi

if ! rg -q 'Math\.round\(percentage / 10\) \* 10' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro battery icon must reflect the current battery level.' >&2
    exit 1
fi

if ! rg -q '_stopRotation\(\)' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro media rotation timer must be stopped when it is not needed.' >&2
    exit 1
fi

if ! rg -q 'Main\.layoutManager\._backgroundGroup \|\| Main\.layoutManager\.uiGroup' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro widgets must use the desktop layer instead of covering normal windows.' >&2
    exit 1
fi

if ! rg -q 'gdm\.bar-enhanced-backup' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'gdm\.bar-enhanced-backup' "$EXTENSION_DIR/bar-enhanced-gdm-app/main.js"; then
    echo 'GDM restore does not preserve an existing profile.' >&2
    exit 1
fi

if ! rg -q 'p\.get_successful\(\)' "$EXTENSION_DIR/bar-enhanced-gdm-app/main.js"; then
    echo 'GDM operations do not check subprocess failure.' >&2
    exit 1
fi

if ! rg -q "'bar-enhanced-gdm', wallPath, selectedLogoPath" "$EXTENSION_DIR/prefs.js" || ! rg -q 'welcomeTextSafe' "$EXTENSION_DIR/prefs.js"; then
    echo 'Legacy GDM preferences must isolate file paths and sanitize dconf text.' >&2
    exit 1
fi

if ! rg -q 'Coalesce rapid fullscreen notifications' "$EXTENSION_DIR/extension.js"; then
    echo 'Fullscreen style reloads are not coalesced.' >&2
    exit 1
fi

if ! rg -q 'style write that is still finishing' "$EXTENSION_DIR/extension.js" || ! rg -q "obar\.reloadStylesheet\(\)" "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Hot stylesheet updates do not reload the active Shell theme directly.' >&2
    exit 1
fi

if ! rg -q 'Always refresh the current background on enable' "$EXTENSION_DIR/extension.js"; then
    echo 'Background palette extraction is skipped after re-enabling the extension.' >&2
    exit 1
fi

if ! rg -q 'new_from_file_at_scale\(path, 1000, 1000, true\)' "$EXTENSION_DIR/extension.js" || ! rg -q 'pixelCount / 120000' "$EXTENSION_DIR/extension.js"; then
    echo 'Wallpaper palette extraction must bound image dimensions and sampling work.' >&2
    exit 1
fi

if ! rg -q 'do not leave a prior' "$EXTENSION_DIR/autothemes.js" || ! rg -q 'Atomic presets write settings directly' "$EXTENSION_DIR/autothemes.js"; then
    echo 'Auto-theme exits must release the stylesheet pause and refresh live styles.' >&2
    exit 1
fi

if ! rg -q 'Some controls change bartype directly' "$EXTENSION_DIR/extension.js"; then
    echo 'Direct bar-type changes do not regenerate the stylesheet.' >&2
    exit 1
fi

if rg -q '/home/mrvanguardia' "$EXTENSION_DIR/autothemes.js"; then
    echo 'Theme presets contain a developer-machine wallpaper path.' >&2
    exit 1
fi

if rg -q '/tmp/gdm-extract\.sh' "$EXTENSION_DIR/bar-enhanced-gdm-app/tabs/tools.js" || ! rg -q 'get_successful' "$EXTENSION_DIR/bar-enhanced-gdm-app/tabs/tools.js"; then
    echo 'GDM theme extraction must avoid predictable scripts and validate its subprocess.' >&2
    exit 1
fi

if ! rg -q -- 'sensors-detect --auto' "$EXTENSION_DIR/vitals-setup-sensors.sh" || rg -q 'yes "yes" \| sensors-detect|eval \$\(grep' "$EXTENSION_DIR/vitals-setup-sensors.sh"; then
    echo 'Sensor setup contains an unsafe hardware probe or configuration evaluation.' >&2
    exit 1
fi

if ! rg -q '_restartId' "$EXTENSION_DIR/dynamic-music-pill/visualizerEngine.js"; then
    echo 'Visualizer does not recover after an unexpected Cava exit.' >&2
    exit 1
fi

if ! rg -q 'Math\.max\(2, this\._isPopup' "$EXTENSION_DIR/dynamic-music-pill/uiVisualizers.js" || ! rg -q 'Math\.max\(1, this\._isPopup' "$EXTENSION_DIR/dynamic-music-pill/uiVisualizers.js"; then
    echo 'Visualizer settings must be clamped before rendering.' >&2
    exit 1
fi

if rg -q 'menuKeys\.forEach\(k => this\._settings\.connect' "$EXTENSION_DIR/prefs.js"; then
    echo 'Colour edits must not register duplicate stylesheet listeners.' >&2
    exit 1
fi

if ! rg -q '_settingsSignalIds' "$EXTENSION_DIR/prefs.js" || ! rg -q '_connectSettings' "$EXTENSION_DIR/prefs.js"; then
    echo 'Preferences must disconnect its direct GSettings listeners when closed.' >&2
    exit 1
fi

if rg -q '#7d7d7d|setTimeout\(\(\) => \{' "$EXTENSION_DIR/prefs.js" | rg -q 'triggerBackgroundPalette'; then
    echo 'Palette refresh must wait for the completed bg-change signal, not a fixed delay.' >&2
    exit 1
fi

if ! rg -q '_cacheCleanupIdleId' "$EXTENSION_DIR/dynamic-music-pill/controller.js" || ! rg -q 'if \(this\._enabled\)' "$EXTENSION_DIR/dynamic-music-pill/controller.js"; then
    echo 'Music controller must guard repeated lifecycle calls and remove idle work.' >&2
    exit 1
fi

if ! rg -q '_ensureHidden\(\)' "$EXTENSION_DIR/dynamic-music-pill/uiMusicPill.js" || ! rg -q "changed::music-pill-enabled" "$EXTENSION_DIR/dynamic-music-pill/uiMusicPill.js"; then
    echo 'Hydro Media must be able to keep its controller without showing a disabled music pill.' >&2
    exit 1
fi

if ! rg -q 'const cancellable = new Gio\.Cancellable' "$EXTENSION_DIR/dynamic-music-pill/uiMusicPill.js" || ! rg -q 'this\._colorCancellable !== cancellable' "$EXTENSION_DIR/dynamic-music-pill/uiMusicPill.js"; then
    echo 'Album-art colour loading must reject stale asynchronous results.' >&2
    exit 1
fi

if ! rg -q 'obj\.get_successful()' "$EXTENSION_DIR/vitals-prefs.js"; then
    echo 'Vitals setup does not detect a failed privileged subprocess.' >&2
    exit 1
fi

if ! rg -q 'this\._destroyed = true' "$EXTENSION_DIR/vitals/sensors.js" || ! rg -q 'this\._nvidia_labels\.some' "$EXTENSION_DIR/vitals/sensors.js"; then
    echo 'Vitals must discard asynchronous results after teardown and deduplicate GPU labels.' >&2
    exit 1
fi

if ! rg -q 'get_if_exited' "$EXTENSION_DIR/vitals/helpers/subprocess.js"; then
    echo 'Vitals subprocess teardown must tolerate an already-exited child.' >&2
    exit 1
fi

if ! rg -q "global\.stage\.connect\('captured-event'" "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q 'Main\.layoutManager\._backgroundGroup \|\| Main\.layoutManager\.uiGroup' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Floating widgets must support stage-wide dragging without covering regular windows.' >&2
    exit 1
fi

if ! rg -q '_widthRecenterId' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Floating widget width adjustments must be cancelled during teardown.' >&2
    exit 1
fi

if ! rg -q '_scheduleParallax' "$EXTENSION_DIR/wallpaper-manager.js" || ! rg -q "type === 'image'" "$EXTENSION_DIR/wallpaper-manager.js"; then
    echo 'Wallpaper parallax must reattach after live image background changes.' >&2
    exit 1
fi

if ! rg -q '_syncStageSize|_positionMenu|_monitorsChangedId' "$EXTENSION_DIR/dynamic-music-pill/uiPlayerSelector.js"; then
    echo 'Player selector must resize and reposition when monitors change.' >&2
    exit 1
fi

if ! rg -q 'this\._destroyed = true' "$EXTENSION_DIR/dash-to-dock/fileManager1API.js" || ! rg -q 'if \(this\._destroyed\)' "$EXTENSION_DIR/dash-to-dock/fileManager1API.js"; then
    echo 'File-manager integration must ignore callbacks after teardown.' >&2
    exit 1
fi

if ! rg -q '_primaryBgManager' "$EXTENSION_DIR/extension.js"; then
    echo 'Primary-background monitoring must follow monitor changes.' >&2
    exit 1
fi

if ! rg -q 'requestState = \{ generation: 0, destroyed: false \}' "$EXTENSION_DIR/prefs.js" || ! rg -q 'requestState\?\.destroyed' "$EXTENSION_DIR/prefs.js"; then
    echo 'Theme store requests must not update a destroyed preferences window.' >&2
    exit 1
fi

if ! rg -q 'applyInProgress' "$EXTENSION_DIR/bar-enhanced-gdm-app/main.js" || ! rg -q 'p\.get_successful\(\)' "$EXTENSION_DIR/bar-enhanced-gdm-app/main.js"; then
    echo 'GDM apply must prevent concurrent writes and inspect subprocess success.' >&2
    exit 1
fi

if ! rg -q 'function dconfString' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'dconfString\(fonts\.get_string' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'GDM dconf text values must be escaped before generating the profile.' >&2
    exit 1
fi

if ! rg -q 'getGdmPanelFallback' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'GDM must include a class-free fallback for the Bar Enhanced panel style.' >&2
    exit 1
fi

if ! rg -q 'requires the system User Themes extension' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'UT_META_BACKUP' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'UT_META_BACKUP' "$EXTENSION_DIR/bar-enhanced-gdm-app/main.js"; then
    echo 'GDM must preflight User Themes and restore metadata it modifies.' >&2
    exit 1
fi

if ! rg -q 'clamp\(value, 1\) \* 255' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'GDM panel fallback must convert normalized extension colours to CSS RGB channels.' >&2
    exit 1
fi

# The stop path must only remove this extension's PID record. It must never need
# to discover or kill a system-wide mpvpaper/xwinwrap process.
printf 'not-a-pid\n' > "$RUNTIME_DIR/bar-enhanced-wallpaper.pid"
XDG_RUNTIME_DIR="$RUNTIME_DIR" "$EXTENSION_DIR/play-wallpaper.sh" stop
test ! -e "$RUNTIME_DIR/bar-enhanced-wallpaper.pid"

bash "$ROOT_DIR/tools/package-extension.sh" "$RUNTIME_DIR/package"
ARCHIVE="$RUNTIME_DIR/package/bar-enhanced@mrvanguardia.shell-extension.zip"
unzip -tqq "$ARCHIVE"
if unzip -Z1 "$ARCHIVE" | grep -q '^graphify-out/'; then
    echo 'Development graph cache must not be packaged.' >&2
    exit 1
fi
for required_file in \
    dynamic-music-pill/controller.js \
    dash-to-dock/docking.js \
    vitals/extension.js \
    schemas/gschemas.compiled \
    media/assets/menu.svg; do
    unzip -Z1 "$ARCHIVE" | grep -Fxq "$required_file"
done

printf '%s\n' 'Validation passed: schemas, JavaScript syntax, secure downloads, and package contents.'
