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

# The repository ships a precompiled schema for manual git installs. If it falls
# behind the XML, GSettings aborts GNOME Shell when a missing key is read.
COMMITTED_SCHEMA="$EXTENSION_DIR/schemas/gschemas.compiled"
if [[ -f "$COMMITTED_SCHEMA" ]]; then
    for schema_id in $(xmllint --xpath '//schema/@id' "$EXTENSION_DIR"/schemas/*.gschema.xml | sed -E 's/ ?id="([^"]+)"/\1\n/g'); do
        fresh="$(GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gsettings list-keys "$schema_id" | sort)"
        shipped="$(GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas" gsettings list-keys "$schema_id" 2>/dev/null | sort || true)"
        if [[ "$fresh" != "$shipped" ]]; then
            echo "schemas/gschemas.compiled is stale for $schema_id; run: glib-compile-schemas bar-enhanced@mrvanguardia/schemas" >&2
            exit 1
        fi
    done
fi

for schema_file in "$EXTENSION_DIR"/schemas/*.gschema.xml; do
    schema_count="$(xmllint --xpath 'count(/schemalist/schema)' "$schema_file")"
    schema_id="$(xmllint --xpath 'string(/schemalist/schema/@id)' "$schema_file")"
    expected_file="${schema_id}.gschema.xml"
    if [[ "$schema_count" != 1 || -z "$schema_id" || "$(basename "$schema_file")" != "$expected_file" ]]; then
        echo "Schema file must contain one schema and match its ID: $schema_file (ID: $schema_id, count: $schema_count)" >&2
        exit 1
    fi
done

while IFS= read -r -d '' file; do
    node --check "$file"
done < <(find "$EXTENSION_DIR" -type f -name '*.js' -print0)

gjs -m "$ROOT_DIR/tests/color-utils.test.js"
gjs -m "$ROOT_DIR/tests/vitals-values.test.js"
gjs -m "$ROOT_DIR/tests/lyrics-parser.test.js"
gjs -m "$ROOT_DIR/tests/wallpaper-store.test.js"
node --check "$ROOT_DIR/tests/fake-mpris-player.js"
XDG_DATA_HOME="$RUNTIME_DIR" gjs -m "$ROOT_DIR/tests/flatpak-overrides.test.js"
GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gjs -m "$ROOT_DIR/tests/schema-contract.test.js"
GSETTINGS_BACKEND=memory GSETTINGS_SCHEMA_DIR="$SCHEMA_DIR" gjs -m "$ROOT_DIR/tests/auto-themes.test.js"
node "$ROOT_DIR/tests/focus-glow.test.js"
node "$ROOT_DIR/tests/quick-settings-arrows.test.js"
node "$ROOT_DIR/tests/dashboard-toggle.test.js"
node "$ROOT_DIR/tests/system-accent-monitor.test.js"
node "$ROOT_DIR/tests/palette-actions.test.js"

if rg -n -P '\bimports\.(?!js)' "$EXTENSION_DIR" --glob '*.js'; then
    echo 'Legacy imports.* APIs are not permitted in the packaged extension.' >&2
    exit 1
fi

if rg -n -P '\bimports\[|\b(?:const|let|var)\s+\{[^}]*\}\s*=\s*imports\b' "$EXTENSION_DIR" --glob '*.js' -g '!**/dash-to-dock/utils.js'; then
    echo 'Legacy global imports access is not permitted in the packaged extension.' >&2
    exit 1
fi

if ! rg -qx "const Gi = imports\['_gi'\];" "$EXTENSION_DIR/dash-to-dock/utils.js"; then
    echo 'Dash-to-Dock vfunc compatibility bridge was changed unexpectedly.' >&2
    exit 1
fi

if rg -q 'spawn_command_line_sync' "$EXTENSION_DIR/prefs.js"; then
    echo 'Preferences must not synchronously spawn gnome-shell to detect its version.' >&2
    exit 1
fi

if ! rg -q 'lightOptions\.forEach\(opt => lightModel\.append' "$EXTENSION_DIR/prefs.js" ||
    ! rg -q 'const lightIdx = lightOptions\.findIndex' "$EXTENSION_DIR/prefs.js" ||
    ! rg -q 'const option = lightOptions\[lightRow\.get_selected\(\)\]' "$EXTENSION_DIR/prefs.js"; then
    echo 'Light auto-theme preferences must use the light-theme options.' >&2
    exit 1
fi

if rg -n 'load_contents\(|file_get_contents|query_exists\(|make_directory_with_parents\(|\.copy\(|replace_contents\(|\.move\(' "$EXTENSION_DIR/prefs.js"; then
    echo 'Preferences must not perform synchronous file I/O on the GTK main thread.' >&2
    exit 1
fi

if rg -n 'query_exists\(|enumerate_children\(|next_file\(|\.delete\(|\blog\(' "$EXTENSION_DIR/dynamic-music-pill-prefs.js"; then
    echo 'Music Pill preferences must avoid synchronous cache I/O and deprecated log().' >&2
    exit 1
fi

if rg -n 'bus_get_sync' "$EXTENSION_DIR" --glob '*.js'; then
    echo 'Synchronous session-bus access is not permitted in the packaged extension.' >&2
    exit 1
fi

if rg -n '^\s*log\(' "$EXTENSION_DIR" --glob '*.js'; then
    echo 'The extension must use console diagnostics, not deprecated log().' >&2
    exit 1
fi

if rg -n 'GLib\.source_remove' "$EXTENSION_DIR" --glob '*.js'; then
    echo 'Use GLib.Source.remove() consistently for GLib source cleanup.' >&2
    exit 1
fi

if rg -n '\b(setTimeout|clearTimeout|setInterval|clearInterval)\b' "$EXTENSION_DIR/extension.js"; then
    echo 'Core lifecycle timers must use tracked GLib sources.' >&2
    exit 1
fi

if ! rg -q 'this\.menu\.disconnect\(this\._menuStateChangeId\)' "$EXTENSION_DIR/vitals/extension.js" || ! rg -q 'this\._settingChangedSignals = \[\]' "$EXTENSION_DIR/vitals/extension.js"; then
    echo 'Vitals must release its menu and GSettings signal registry on destroy().' >&2
    exit 1
fi

if ! rg -q 'this\._terminateNvidiaSmiProcess\(\)' "$EXTENSION_DIR/vitals/sensors.js" || ! rg -q 'this\._settings = null' "$EXTENSION_DIR/vitals/sensors.js"; then
    echo 'Vitals sensors must terminate GPU monitoring and release GSettings on destroy().' >&2
    exit 1
fi

if ! rg -q "'Read rate', readRate, 'storage', 'speed'" "$EXTENSION_DIR/vitals/sensors.js" || ! rg -q 'this\._lastRead > 0' "$EXTENSION_DIR/vitals/sensors.js"; then
    echo 'Vitals disk rates must avoid first-sample spikes and use speed units.' >&2
    exit 1
fi

if rg -n '^\s*log\(' "$EXTENSION_DIR/vitals" --glob '*.js'; then
    echo 'Vitals must not emit debug log() calls in production.' >&2
    exit 1
fi

if rg -n '^\s*log\(' "$EXTENSION_DIR/bar-enhanced-gdm-app" --glob '*.js'; then
    echo 'GDM Center must use console diagnostics, not deprecated log().' >&2
    exit 1
fi

if rg -q 'GLib\.file_set_contents' "$EXTENSION_DIR/dynamic-music-pill/visualizerEngine.js" || ! rg -q 'replace_contents_async' "$EXTENSION_DIR/dynamic-music-pill/visualizerEngine.js" || ! rg -q 'generation !== this\._generation' "$EXTENSION_DIR/dynamic-music-pill/visualizerEngine.js"; then
    echo 'Visualizer config writes must be asynchronous and lifecycle-safe.' >&2
    exit 1
fi

if ! rg -q 'this\._artDownloadSession\.abort\(\)' "$EXTENSION_DIR/dynamic-music-pill/controller.js" || ! rg -q 'artRequestGeneration !== this\._artDownloadGeneration' "$EXTENSION_DIR/dynamic-music-pill/controller.js"; then
    echo 'Artwork downloads must be aborted and invalidated when Music Pill disables.' >&2
    exit 1
fi

if rg -n 'query_exists\(|query_info\(' "$EXTENSION_DIR/dynamic-music-pill/controller.js"; then
    echo 'Music Pill must not query artwork files synchronously on the Shell thread.' >&2
    exit 1
fi

if rg -q "this\._settings\.get_boolean\('(music-pill-enabled|immersive-music-theme)'\)" "$EXTENSION_DIR/dynamic-music-pill/uiMusicPill.js" || ! rg -q 'this\._barSettings = extension\.getSettings\(\)' "$EXTENSION_DIR/dynamic-music-pill/controller.js"; then
    echo 'Music Pill must read Bar Enhanced master settings from the primary schema.' >&2
    exit 1
fi

if ! rg -q '^        destroy\(\) \{' "$EXTENSION_DIR/dynamic-music-pill/uiExpandedPlayer.js" || ! rg -q 'this\._cleanup\(\);' "$EXTENSION_DIR/dynamic-music-pill/uiExpandedPlayer.js" || ! rg -q '_firstHintOpenTimer' "$EXTENSION_DIR/dynamic-music-pill/uiExpandedPlayer.js"; then
    echo 'Expanded Music Player must release timers and helper objects on destroy().' >&2
    exit 1
fi

if ! rg -q 'this\._videoProcess = null' "$EXTENSION_DIR/wallpaper-manager.js" || ! rg -q 'if \(!this\._videoProcess && !this\._videoPath\)' "$EXTENSION_DIR/wallpaper-manager.js"; then
    echo 'Wallpaper manager must track and stop only its own video session.' >&2
    exit 1
fi

if rg -q 'captured-event|_setupParallax|_scheduleParallax|set_scale\(1\.05|translation_x:' "$EXTENSION_DIR/wallpaper-manager.js"; then
    echo 'Wallpaper manager must not zoom or move the wallpaper with the pointer.' >&2
    exit 1
fi

bash -n "$EXTENSION_DIR/play-wallpaper.sh"
bash -n "$ROOT_DIR/tests/devkit-mpris-smoke.sh"

# Preferences run in a separate process where Shell-only resources are absent.
if rg -n "resource:///org/gnome/shell/" "$EXTENSION_DIR/prefs.js" "$EXTENSION_DIR"/*-prefs.js; then
    echo 'Preferences import a GNOME Shell-only resource.' >&2
    exit 1
fi
bash -n "$ROOT_DIR/tools/package-extension.sh"
bash -n "$ROOT_DIR/tools/update-translations.sh"

if [ ! -f "$EXTENSION_DIR/po/bar-enhanced.pot" ]; then
    echo 'Missing gettext template for Bar Enhanced.' >&2
    exit 1
fi
msgfmt --check --output-file=/dev/null "$EXTENSION_DIR/locale/es/LC_MESSAGES/bar-enhanced.po"
spanish_stats="$(msgfmt --statistics --output-file=/dev/null \
    "$EXTENSION_DIR/locale/es/LC_MESSAGES/bar-enhanced.po" 2>&1)"
if [[ "$spanish_stats" == *'untranslated message'* || "$spanish_stats" == *'fuzzy translation'* ]]; then
    printf 'Spanish catalogue is incomplete: %s\n' "$spanish_stats" >&2
    exit 1
fi

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

if ! rg -q "'--connect-timeout', '10', '--max-time', '120'" "$EXTENSION_DIR/wallpaper-store-prefs.js"; then
    echo 'Wallpaper downloads must terminate when a provider does not respond.' >&2
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

if ! rg -q 'this\._stopPywalMonitor\(\)' "$EXTENSION_DIR/extension.js" ||
    ! rg -q 'generation !== this\._pywalGeneration' "$EXTENSION_DIR/extension.js"; then
    echo 'Pywal monitor and pending reads must be invalidated on disable.' >&2
    exit 1
fi

if rg -q 'assetsSrcDir\.enumerate_children\(|make_directory_with_parents_async' "$EXTENSION_DIR/extension.js" || ! rg -q 'ensureDirectoryAsync' "$EXTENSION_DIR/extension.js" || ! rg -q '_runtimeAssetsCancellable\.cancel\(\)' "$EXTENSION_DIR/extension.js"; then
    echo 'Runtime asset copying must be asynchronous and cancelled on disable().' >&2
    exit 1
fi

if ! rg -q 'this\._runtimeAssetsReady = this\._copyRuntimeAssets' "$EXTENSION_DIR/extension.js" || ! rg -q 'await obar\._runtimeAssetsReady' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Stylesheet writes must wait until runtime asset directories exist.' >&2
    exit 1
fi

if ! rg -q '_queueDeviceUpdate|_updateIdleId' "$EXTENSION_DIR/bluetooth-battery.js"; then
    echo 'Bluetooth deferred updates are not cleaned up.' >&2
    exit 1
fi

if rg -U -q 'this\.scale_y = 0\.8;\s*\n\s*this\.ease\(' "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q '_entranceAnimationPending' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro Widgets must defer their entrance animation until they are mapped.' >&2
    exit 1
fi

if ! rg -q '_createWidgetsWhenMapped' "$EXTENSION_DIR/hydro-widgets.js" || ! rg -q 'this\.container\?\.mapped' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro Widgets must create themed actors only after the host container is mapped.' >&2
    exit 1
fi

if rg -q 'width: 100%' "$EXTENSION_DIR/hydro-widgets.js"; then
    echo 'Hydro Widgets must not use unsupported percentage lengths in St CSS.' >&2
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

if ! rg -q 'function dconfString' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js" || ! rg -q 'dconfString\(misc\.get_string' "$EXTENSION_DIR/bar-enhanced-gdm-app/apply.js"; then
    echo 'Modular GDM settings must sanitize dconf text.' >&2
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

if ! rg -q "type === 'image' && uri" "$EXTENSION_DIR/wallpaper-manager.js" || ! rg -q 'this\._setImageWallpaper\(uri\)' "$EXTENSION_DIR/wallpaper-manager.js"; then
    echo 'Static wallpaper selection must still update GNOME background settings.' >&2
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

if rg -U -q 'this\._syncWithSystemAccent\(\);\s*\n\s*this\.loadDashToDockStylesheet\(\);' "$EXTENSION_DIR/extension.js" || ! rg -U -q 'this\.dockManager = new DockManager\(this\);\s*\n\s*this\.loadDashToDockStylesheet\(\);' "$EXTENSION_DIR/extension.js"; then
    echo 'Dash to Dock stylesheet must only load together with the enabled DockManager.' >&2
    exit 1
fi

if ! rg -q 'dashToDockEnabled && dashDockStyle !=' "$EXTENSION_DIR/stylesheets.js" || ! rg -q '#dashtodockContainer \.dash-background' "$EXTENSION_DIR/stylesheets.js" || ! rg -A 8 "changed::dash-to-dock-enabled" "$EXTENSION_DIR/extension.js" | rg -q 'StyleSheets\.reloadStyle'; then
    echo 'Dash to Dock CSS must be omitted and reloaded when the embedded module is disabled.' >&2
    exit 1
fi

if ! rg -q 'org\.gnome\.shell\.extensions\.bar-enhanced\.dash-to-dock' "$EXTENSION_DIR/dash-to-dock/docking.js" || ! rg -q 'path="/org/gnome/shell/extensions/bar-enhanced/dash-to-dock/"' "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.bar-enhanced.dash-to-dock.gschema.xml"; then
    echo 'Embedded Dash to Dock must use an isolated Bar Enhanced dconf schema and path.' >&2
    exit 1
fi

if rg -n 'Signals\.addSignalMethods|\{signals: Signals\}' "$EXTENSION_DIR/dash-to-dock" --glob '*.js' || ! rg -q 'export function addSignalMethods\(prototype\)' "$EXTENSION_DIR/dash-to-dock/utils.js"; then
    echo 'Embedded Dash to Dock must use its compatible local signal helper on GNOME 50+.' >&2
    exit 1
fi

if rg -q 'msColor = rgbRatio' "$EXTENSION_DIR/stylesheets.js" || ! rg -q 'quick-settings-tile-main-button:checked' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Specialized popup active-tile colour must remain user-controlled.' >&2
    exit 1
fi

if rg -q 'mhfggblue' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Unified shell colors must not reference an undefined hover-blue variable.' >&2
    exit 1
fi

if ! rg -q "dockEnum\('transparency-mode'.*" "$EXTENSION_DIR/prefs.js" || ! rg -q "\['Default', 'Fixed', 'Dynamic'\], \[0, 1, 3\]" "$EXTENSION_DIR/prefs.js" || ! rg -q "'Focus, Minimize or App Spread'" "$EXTENSION_DIR/prefs.js"; then
    echo 'Dash to Dock preference rows must represent every schema enum value.' >&2
    exit 1
fi

if ! rg -q '_getSortedKeys\(' "$EXTENSION_DIR/prefs.js" || ! rg -q '_sortProfileValue\(data\)' "$EXTENSION_DIR/prefs.js"; then
    echo 'Profile exports must sort settings within every section deterministically.' >&2
    exit 1
fi

if ! rg -q "get_boolean\('theme-app-grid'\)" "$EXTENSION_DIR/stylesheets.js" || ! rg -q 'applyAllShell && themeAppGrid' "$EXTENSION_DIR/stylesheets.js" || ! rg -q 'hideAnimation' "$EXTENSION_DIR/dash-to-dock/docking.js"; then
    echo 'Overview-grid theming and dock hide animation must remain independently controllable.' >&2
    exit 1
fi

if ! rg -q 'autotheme-active-tile-color' "$EXTENSION_DIR/prefs.js" || ! rg -q 'autotheme-active-tile-color' "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.bar-enhanced.gschema.xml" || rg -U -q 'app-folder-dialog \.folder-name-container \.edit-folder-button,\s*\.quick-settings-tile' "$EXTENSION_DIR/stylesheets.js"; then
    echo 'Quick Settings active-tile colors must remain user-controlled and free of duplicate grid selectors.' >&2
    exit 1
fi

if ! rg -q "colorKeys\[i\] == 'mscolor' && !obar\._settings\.get_boolean\('autotheme-active-tile-color'\)" "$EXTENSION_DIR/autothemes.js" ||
    ! rg -q 'sliderHandleOverride \? sliderHandleRGB' "$EXTENSION_DIR/stylesheets.js" ||
    ! rg -q '#dashtodockContainer \.notification-badge' "$EXTENSION_DIR/stylesheets.js" ||
    rg -q '^\.(overview-tile|icon-grid) \.(notification-badge|number-overlay|progress-bar)' "$EXTENSION_DIR/dash-to-dock/dash-to-dock.css"; then
    echo 'Popup colours and dock badge styles must remain independent and dock-scoped.' >&2
    exit 1
fi

if ! rg -q 'windowActor\?\.meta_window' "$EXTENSION_DIR/extension.js" || ! rg -q 'if \(!this\._windowSignals\)' "$EXTENSION_DIR/extension.js"; then
    echo 'Window-Max must tolerate late actor teardown and avoid duplicate signal registries.' >&2
    exit 1
fi

if ! rg -q '_lifecycleGeneration !== lifecycleGeneration' "$EXTENSION_DIR/extension.js" || ! rg -q 'if \(!this\._settings \|\| !box \|\| !btn\)' "$EXTENSION_DIR/extension.js"; then
    echo 'Deferred Fitts setup must not run after the extension has been disabled.' >&2
    exit 1
fi

while IFS= read -r schema_file; do
    schema_id="$(sed -nE 's/.*<schema[^>]* id="([^"]+)".*/\1/p' "$schema_file" | head -n1)"
    schema_name="$(basename "$schema_file" .gschema.xml)"
    if [ -z "$schema_id" ] || [ "$schema_id" != "$schema_name" ]; then
        echo "GSettings schema filename must match its ID: $schema_file" >&2
        exit 1
    fi
done < <(find "$EXTENSION_DIR/schemas" -maxdepth 1 -type f -name '*.gschema.xml' | sort)

if rg -q '<summary>TODO</summary>|<description>TODO</description>' "$EXTENSION_DIR/schemas"; then
    echo 'GSettings schemas must not ship placeholder documentation.' >&2
    exit 1
fi

if ! rg -q 'busyDelta / totalDelta' "$EXTENSION_DIR/vitals/sensors.js" || ! rg -Fq 'split(/\s+/)' "$EXTENSION_DIR/vitals/sensors.js" || ! rg -q 'swapTotal > 0 \? swapUsed / swapTotal : 0' "$EXTENSION_DIR/vitals/sensors.js" || ! rg -q 'previousValue && dwell > 0' "$EXTENSION_DIR/vitals/values.js"; then
    echo 'Vitals must calculate CPU, swap, and network readings from valid samples.' >&2
    exit 1
fi

if ! rg -q 'const location = this.location' "$EXTENSION_DIR/dash-to-dock/locations.js" || ! rg -q 'this\.location !== location' "$EXTENSION_DIR/dash-to-dock/locations.js" || rg -q 'delete this\._updateTrashCancellable' "$EXTENSION_DIR/dash-to-dock/locations.js"; then
    echo 'Trash updates must retain a valid location snapshot and release their own cancellable.' >&2
    exit 1
fi

if ! rg -q 'requestState = \{ generation: 0, destroyed: false \}' "$EXTENSION_DIR/prefs.js" || ! rg -q 'requestState\?\.destroyed' "$EXTENSION_DIR/prefs.js"; then
    echo 'Theme store requests must not update a destroyed preferences window.' >&2
    exit 1
fi

if rg -q 'selectedWallpaperPath|welcomeTextSafe|bar-enhanced-gdm.*, wallPath' "$EXTENSION_DIR/prefs.js" || ! rg -q 'module\.openGdmCenter' "$EXTENSION_DIR/prefs.js"; then
    echo 'Preferences must use only the modular GDM Center, without the retired dialog.' >&2
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
ARCHIVE_CONTENTS="$RUNTIME_DIR/package-contents.txt"
unzip -Z1 "$ARCHIVE" > "$ARCHIVE_CONTENTS"
if ! rg -qx 'LICENSE' "$ARCHIVE_CONTENTS"; then
    printf '%s\n' 'Package validation failed: root GPL LICENSE is missing.' >&2
    exit 1
fi
if ! rg -qx 'THIRD_PARTY_NOTICES.md' "$ARCHIVE_CONTENTS"; then
    printf '%s\n' 'Package validation failed: third-party notices are missing.' >&2
    exit 1
fi
if grep -q '^graphify-out/' "$ARCHIVE_CONTENTS"; then
    echo 'Development graph cache must not be packaged.' >&2
    exit 1
fi
if rg -q '\.(po|pot)$' "$ARCHIVE_CONTENTS"; then
    echo 'Translation source catalogues must not be packaged.' >&2
    exit 1
fi
if rg -q '(^|/)po/' "$ARCHIVE_CONTENTS"; then
    echo 'Translation source directories must not be packaged.' >&2
    exit 1
fi
for required_file in \
    dynamic-music-pill/controller.js \
    dash-to-dock/docking.js \
    vitals/extension.js \
    schemas/gschemas.compiled \
    media/assets/menu.svg; do
    grep -Fxq "$required_file" "$ARCHIVE_CONTENTS"
done

printf '%s\n' 'Validation passed: schemas, JavaScript syntax, secure downloads, and package contents.'
