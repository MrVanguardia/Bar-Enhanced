#!/usr/bin/env bash
# Requires GNOME Shell 50, gjs, dbus-run-session and permission to create a session bus.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_MODE="${1:-file}"
TEST_CYCLES="${BAR_ENHANCED_TEST_CYCLES:-1}"
DOCK_TOGGLES="${BAR_ENHANCED_TEST_DOCK_TOGGLES:-0}"
MODULE_TOGGLES="${BAR_ENHANCED_TEST_MODULE_TOGGLES:-0}"
QUICK_COLORS="${BAR_ENHANCED_TEST_QUICK_COLORS:-0}"
STYLE_KEYS="${BAR_ENHANCED_TEST_STYLE_KEYS:-0}"
WALLPAPER="${BAR_ENHANCED_TEST_WALLPAPER:-0}"
if [[ ! "$TEST_CYCLES" =~ ^[1-9][0-9]*$ || "$TEST_CYCLES" -gt 50 ]]; then
    echo 'BAR_ENHANCED_TEST_CYCLES must be an integer from 1 to 50.' >&2
    exit 2
fi
if [[ ! "$DOCK_TOGGLES" =~ ^(0|[1-9][0-9]*)$ || "$DOCK_TOGGLES" -gt 50 ]]; then
    echo 'BAR_ENHANCED_TEST_DOCK_TOGGLES must be an integer from 0 to 50.' >&2
    exit 2
fi
if [[ ! "$MODULE_TOGGLES" =~ ^(0|[1-9][0-9]*)$ || "$MODULE_TOGGLES" -gt 20 ]]; then
    echo 'BAR_ENHANCED_TEST_MODULE_TOGGLES must be an integer from 0 to 20.' >&2
    exit 2
fi
if [[ ! "$STYLE_KEYS" =~ ^[01]$ ]]; then
    echo 'BAR_ENHANCED_TEST_STYLE_KEYS must be 0 or 1.' >&2
    exit 2
fi
if [[ ! "$WALLPAPER" =~ ^[01]$ ]]; then
    echo 'BAR_ENHANCED_TEST_WALLPAPER must be 0 or 1.' >&2
    exit 2
fi
case "$ART_MODE" in
    file) HISTORY_PATTERN='hist_*.png' ;;
    file-rewrite) HISTORY_PATTERN='hist_*.png' ;;
    http) HISTORY_PATTERN='hist_*.png' ;;
    http-preseed) HISTORY_PATTERN='hist_*.png' ;;
    http-cache-delete) HISTORY_PATTERN='hist_*.png' ;;
    http-switch) HISTORY_PATTERN='hist_*.png' ;;
    data) HISTORY_PATTERN='hist_*.img' ;;
    none) HISTORY_PATTERN='hist_*.svg' ;;
    fallback) HISTORY_PATTERN='hist_*.png' ;;
    thumbnail) HISTORY_PATTERN='hist_*.png' ;;
    thumbnail-rewrite) HISTORY_PATTERN='hist_*.png' ;;
    thumbnail-stale) HISTORY_PATTERN='hist_*.svg' ;;
    thumbnail-stale-cache) HISTORY_PATTERN='hist_*.svg' ;;
    dock-schema-missing) HISTORY_PATTERN='hist_*'; DOCK_TOGGLES=2 ;;
    *) echo "Unsupported art mode: $ART_MODE" >&2; exit 2 ;;
esac
TEST_DIR="$(mktemp -d)"
trap 'if [[ "${BAR_ENHANCED_TEST_KEEP_DIR:-0}" == 1 ]]; then echo "Devkit logs: $TEST_DIR"; else rm -rf "$TEST_DIR"; fi' EXIT

EXTENSION_DIR="$TEST_DIR/data/gnome-shell/extensions/bar-enhanced@mrvanguardia"
mkdir -p "$EXTENSION_DIR" "$TEST_DIR/config" "$TEST_DIR/cache" "$TEST_DIR/run"
chmod 700 "$TEST_DIR/run"
bash "$ROOT_DIR/tools/package-extension.sh" "$TEST_DIR"
unzip -oq "$TEST_DIR/bar-enhanced@mrvanguardia.shell-extension.zip" -d "$EXTENSION_DIR"
if [[ "$ART_MODE" == dock-schema-missing ]]; then
    rm -- "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.bar-enhanced.dash-to-dock.gschema.xml"
    glib-compile-schemas --strict "$EXTENSION_DIR/schemas"
fi

export XDG_DATA_HOME="$TEST_DIR/data"
export XDG_CONFIG_HOME="$TEST_DIR/config"
export XDG_CACHE_HOME="$TEST_DIR/cache"
export XDG_RUNTIME_DIR="$TEST_DIR/run"
export GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas"
export BAR_ENHANCED_TEST_ART_MODE="$ART_MODE"

if ! dbus-run-session -- bash -c '
    set -euo pipefail
    gjs -m "$1/tests/fake-mpris-player.js" > "$2/player.log" 2>&1 &
    player_pid=$!
    gnome-shell --headless --devkit --virtual-monitor=1280x720 > "$2/shell.log" 2>&1 &
    shell_pid=$!
    trap "kill $player_pid $shell_pid 2>/dev/null || true; wait $player_pid $shell_pid 2>/dev/null || true" EXIT
    for attempt in {1..20}; do
        if gnome-extensions list | grep -q "bar-enhanced@mrvanguardia"; then break; fi
        sleep 1
    done
    if [[ "${BAR_ENHANCED_TEST_DISABLE_DOCK:-0}" == 1 ]]; then
        gsettings set org.gnome.shell.extensions.bar-enhanced dash-to-dock-enabled false
    fi
    gnome-extensions enable bar-enhanced@mrvanguardia
    if [[ "$4" == fallback ]]; then
        for attempt in {1..20}; do
            if find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                -name "hist_*.svg" -size +0c -print -quit 2>/dev/null | grep -q .; then
                break
            fi
            sleep 0.25
        done
        find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
            -name "hist_*.svg" -size +0c -print -quit | grep -q .
        gsettings set org.gnome.shell.extensions.dynamic-music-pill fallback-art-path \
            "$2/cache/bar-enhanced-mpris-test-art.png"
    fi
    active=false
    history=""
    for attempt in {1..20}; do
        if gnome-extensions info bar-enhanced@mrvanguardia 2>/dev/null | grep -q "State: ACTIVE"; then
            active=true
            history=$(gsettings get org.gnome.shell.extensions.dynamic-music-pill playback-history)
            if [[ "$history" == *"Bar Enhanced Integration Track"* && "$history" == *"hist_"* ]]; then
                break
            fi
        fi
        sleep 0.5
    done
    [[ "$active" == true && "$history" == *"Bar Enhanced Integration Track"* && "$history" == *"hist_"* ]]
    if [[ "${10}" == 1 ]]; then
        image="$2/cache/bar-enhanced-mpris-test-art.png"
        for attempt in {1..20}; do
            [[ -s "$image" ]] && break
            sleep 0.25
        done
        [[ -s "$image" ]]
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-wallpaper-uri "$image"
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-wallpaper-type image
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-wallpaper-enabled true
        for attempt in {1..20}; do
            if [[ "$(gsettings get org.gnome.desktop.background picture-uri)" == *"bar-enhanced-mpris-test-art.png"* ]]; then break; fi
            sleep 0.25
        done
        [[ "$(gsettings get org.gnome.desktop.background picture-uri)" == *"bar-enhanced-mpris-test-art.png"* ]]
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-wallpaper-enabled false
    fi
    if [[ "$9" == 1 ]]; then
        css="$2/run/io.github.mrvanguardia.barEnhanced/bar-enhanced.css"
        for attempt in {1..20}; do
            [[ -s "$css" ]] && break
            sleep 0.25
        done
        [[ -s "$css" ]]
        rg -q '\.privacy-indicators-accent-color \.privacy-indicator' "$css"
        check_style_reload() {
            local key="$1" value="$2" before original changed=false
            original=$(gsettings get org.gnome.shell.extensions.bar-enhanced "$key")
            before=$(stat -c %y "$css")
            gsettings set org.gnome.shell.extensions.bar-enhanced "$key" "$value"
            for attempt in {1..40}; do
                if [[ "$(stat -c %y "$css")" != "$before" ]]; then
                    changed=true
                    break
                fi
                sleep 0.1
            done
            if [[ "$changed" != true ]]; then
                echo "No live stylesheet reload for $key" >&2
                exit 1
            fi
            gsettings set org.gnome.shell.extensions.bar-enhanced "$key" "$original"
            sleep 0.15
        }
        check_style_reload bartype "Floating"
        check_style_reload bgcolor "[\"0.12\", \"0.34\", \"0.56\"]"
        check_style_reload hcolor "[\"0.23\", \"0.45\", \"0.67\"]"
        check_style_reload bwidth "2.5"
        check_style_reload mbgcolor "[\"0.18\", \"0.28\", \"0.38\"]"
        check_style_reload dashdock-style "Menu"
        check_style_reload dbradius 27
        check_style_reload disize 52
        check_style_reload apply-menu-shell true
        check_style_reload apply-menu-notif true
        check_style_reload apply-accent-shell true
        check_style_reload apply-all-shell true
        check_style_reload immersive-music-theme true
        check_style_reload theme-app-grid true
    fi
    if [[ "$8" == 1 ]]; then
        system_accent_before=$(gsettings get org.gnome.desktop.interface accent-color)
        gsettings set org.gnome.shell.extensions.bar-enhanced mscolor \
            "[\"0.1\", \"0.2\", \"0.3\"]"
        sleep 0.25
        [[ "$(gsettings get org.gnome.desktop.interface accent-color)" == "$system_accent_before" ]]
        registry=$(gsettings get org.gnome.shell.extensions.bar-enhanced quick-settings-control-registry)
        [[ "$registry" == "@a{ss} {}" || "$registry" == "{}" ]]
        gsettings set org.gnome.shell.extensions.bar-enhanced menu-surface-colors \
            "{\"quick:secondary\": \"#deadbe\"}"
        gsettings set org.gnome.shell.extensions.bar-enhanced quick-settings-control-colors \
            "{\"legacy-control-1:main\": \"#123456\"}"
        css="$2/run/io.github.mrvanguardia.barEnhanced/bar-enhanced.css"
        sleep 0.25
        ! rg -q "be-qs-|#123456|#deadbe" "$css"
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-media-enabled true
        gsettings set org.gnome.shell.extensions.bar-enhanced hydro-widgets-enabled true
        sleep 1
        ! rg -q "st_widget_get_theme_node.*Hydro(Clock|Media)Widget" "$2/shell.log"
    fi
    for attempt in {1..20}; do
        if find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name "$3" -size +0c -print -quit | grep -q .; then
            break
        fi
        sleep 0.25
    done
    if [[ "$4" == http-switch || "$4" == file-rewrite ]]; then
        for attempt in {1..20}; do
            request_count=$(rg -c "MPRIS test artwork HTTP request" "$2/player.log" || true)
            cache_count=$(find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name "*.png" ! -name "hist_*" -size +0c | wc -l)
            rewrite_count=$(rg -c "MPRIS test source art rewritten" "$2/player.log" || true)
            history_ready=true
            if [[ "$4" == file-rewrite ]]; then
                history_ready=false
                if find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                    -name "hist_*.png" -size +0c -print -quit | grep -q .; then
                    history_ready=true
                fi
            fi
            if [[ "$cache_count" -ge 2 &&
                "$history_ready" == true &&
                ( "$4" == http-switch && "${request_count:-0}" -ge 2 ||
                  "$4" == file-rewrite && "${rewrite_count:-0}" -ge 1 ) ]]; then
                break
            fi
            sleep 0.5
        done
    fi
    if [[ "$4" == http-cache-delete ]]; then
        for attempt in {1..20}; do
            if find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                -name "hist_*.png" -size +0c -print -quit | grep -q .; then
                break
            fi
            sleep 0.25
        done
        find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
            -name "hist_*.png" -size +0c -print -quit | grep -q .
        cache_file=$(find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
            -name "*.png" ! -name "hist_*" -print -quit)
        [[ -n "$cache_file" ]]
        rm -- "$cache_file"
        for attempt in {1..20}; do
            request_count=$(rg -c "MPRIS test artwork HTTP request" "$2/player.log" || true)
            restored_cache=$(find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                -name "*.png" ! -name "hist_*" -size +0c -print -quit)
            restored_history=$(find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                -name "hist_*.png" -size +0c -print -quit)
            if [[ "${request_count:-0}" -ge 1 && -n "$restored_cache" && -n "$restored_history" ]]; then
                break
            fi
            sleep 0.5
        done
    fi
    if [[ "$4" == thumbnail-rewrite ]]; then
        for attempt in {1..24}; do
            rewrite_count=$(rg -c "MPRIS test thumbnail rewritten" "$2/player.log" || true)
            copied_thumb=$(find "$2/cache/dynamic-music-pill/art" -maxdepth 1 -type f \
                -name "*.png" ! -name "hist_*" -size +0c -print -quit)
            source_thumb=$(find "$2/cache/thumbnails/normal" -maxdepth 1 -type f \
                -name "*.png" -size +0c -print -quit)
            if [[ "${rewrite_count:-0}" -ge 1 && -n "$copied_thumb" && -n "$source_thumb" &&
                "$(sha256sum "$copied_thumb" | cut -d " " -f 1)" == "$(sha256sum "$source_thumb" | cut -d " " -f 1)" ]]; then
                break
            fi
            sleep 0.5
        done
        [[ "${rewrite_count:-0}" -eq 1 && -n "$copied_thumb" && -n "$source_thumb" ]]
        [[ "$(sha256sum "$copied_thumb" | cut -d " " -f 1)" == "$(sha256sum "$source_thumb" | cut -d " " -f 1)" ]]
    fi
    for ((toggle = 0; toggle < "$6"; toggle++)); do
        gsettings set org.gnome.shell.extensions.bar-enhanced dash-to-dock-enabled false
        sleep 0.25
        gsettings set org.gnome.shell.extensions.bar-enhanced dash-to-dock-enabled true
        sleep 0.25
    done
    for ((toggle = 0; toggle < "$7"; toggle++)); do
        for key in vitals-enabled bluetooth-battery-enabled notif-icons-enabled hydro-widgets-enabled privacy-accent-enabled; do
            original=$(gsettings get org.gnome.shell.extensions.bar-enhanced "$key")
            if [[ "$original" == true ]]; then opposite=false; else opposite=true; fi
            gsettings set org.gnome.shell.extensions.bar-enhanced "$key" "$opposite"
            sleep 0.25
            gsettings set org.gnome.shell.extensions.bar-enhanced "$key" "$original"
            sleep 0.25
        done
    done
    for ((cycle = 1; cycle < "$5"; cycle++)); do
        gnome-extensions disable bar-enhanced@mrvanguardia
        gnome-extensions enable bar-enhanced@mrvanguardia
        for attempt in {1..20}; do
            if gnome-extensions info bar-enhanced@mrvanguardia 2>/dev/null | grep -q "State: ACTIVE"; then
                break
            fi
            sleep 0.25
        done
        gnome-extensions info bar-enhanced@mrvanguardia | grep -q "State: ACTIVE"
        sleep 0.25
    done
    gnome-extensions disable bar-enhanced@mrvanguardia
' _ "$ROOT_DIR" "$TEST_DIR" "$HISTORY_PATTERN" "$ART_MODE" "$TEST_CYCLES" "$DOCK_TOGGLES" "$MODULE_TOGGLES" "$QUICK_COLORS" "$STYLE_KEYS" "$WALLPAPER" > "$TEST_DIR/session.log" 2>&1; then
    tail -30 "$TEST_DIR/session.log" >&2
    tail -30 "$TEST_DIR/shell.log" >&2
    exit 1
fi

if ! find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name "$HISTORY_PATTERN" -size +0c -print -quit | grep -q .; then
    echo "MPRIS history artwork was not copied for mode $ART_MODE." >&2
    tail -30 "$TEST_DIR/shell.log" >&2
    tail -30 "$TEST_DIR/player.log" >&2
    find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 -type f -printf '%f %s bytes\n' >&2
    exit 1
fi

if [[ "$ART_MODE" == dock-schema-missing ]]; then
    failure_count=$(rg -c 'BarEnhanced: failed to initialize DockManager' "$TEST_DIR/shell.log" || true)
    if [[ "${failure_count:-0}" -lt 3 ]] ||
        rg -n 'DashToDock has been already initialized|DashToDock: failed to clean up partial initialization|JS ERROR' "$TEST_DIR/shell.log"; then
        echo "Expected three schema failures and no stuck DockManager singleton; got ${failure_count:-0} schema failures." >&2
        tail -50 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
elif rg -n 'BarEnhanced: failed|DashToDock: failed|Dynamic Music Pill: failed|JS ERROR' "$TEST_DIR/shell.log"; then
    echo 'Bar Enhanced emitted a runtime error during the MPRIS smoke test.' >&2
    exit 1
fi

if rg -q 'St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log"; then
    critical_count=$(rg -c 'St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log")
    rg -n -m 8 'St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log" >&2
    echo "$critical_count widgets requested a theme before they were attached to the stage." >&2
    exit 1
fi

if [[ "$ART_MODE" == http ]]; then
    update_count=$(rg -c 'MPRIS test property update' "$TEST_DIR/player.log" || true)
    request_count=$(rg -c 'MPRIS test artwork HTTP request' "$TEST_DIR/player.log" || true)
    if [[ "${update_count:-0}" -lt 4 || "$request_count" != 1 ]]; then
        echo "Expected repeated property updates and one artwork request, got ${update_count:-0} updates and ${request_count:-0} requests." >&2
        tail -30 "$TEST_DIR/player.log" >&2
        tail -30 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
fi

if [[ "$ART_MODE" == http-preseed ]]; then
    request_count=$(rg -c 'MPRIS test artwork HTTP request' "$TEST_DIR/player.log" || true)
    if [[ "${request_count:-0}" -ne 0 ]]; then
        echo "Expected a valid preseeded artwork cache entry without a network request, got $request_count requests." >&2
        tail -30 "$TEST_DIR/player.log" >&2
        exit 1
    fi
fi

if [[ "$ART_MODE" == http-cache-delete ]]; then
    request_count=$(rg -c 'MPRIS test artwork HTTP request' "$TEST_DIR/player.log" || true)
    if [[ "$request_count" != 1 ]]; then
        echo "Expected one artwork request after cache deletion, got ${request_count:-0}." >&2
        tail -30 "$TEST_DIR/player.log" >&2
        tail -30 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
fi

if [[ "$ART_MODE" == http-switch ]]; then
    request_count=$(rg -c 'MPRIS test artwork HTTP request' "$TEST_DIR/player.log" || true)
    cache_count=$(find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name '*.png' ! -name 'hist_*' -size +0c | wc -l)
    if [[ "$request_count" != 2 || "$cache_count" -lt 2 ]]; then
        echo "Expected two artwork requests and cached images after the URL changed; got ${request_count:-0} requests and $cache_count images." >&2
        tail -30 "$TEST_DIR/player.log" >&2
        tail -30 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
fi

if [[ "$ART_MODE" == file-rewrite ]]; then
    rewrite_count=$(rg -c 'MPRIS test source art rewritten' "$TEST_DIR/player.log" || true)
    cache_count=$(find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name '*.png' ! -name 'hist_*' -size +0c | wc -l)
    distinct_images=$(find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 -type f -name '*.png' ! -name 'hist_*' -size +0c -exec sha256sum {} + | cut -d ' ' -f 1 | sort -u | wc -l)
    if [[ "$rewrite_count" != 1 || "$cache_count" -lt 2 || "$distinct_images" -lt 2 ]]; then
        echo "Expected rewritten source art and two different cached images; got ${rewrite_count:-0} rewrites, $cache_count files and $distinct_images distinct images." >&2
        tail -30 "$TEST_DIR/player.log" >&2
        tail -30 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
fi

if [[ "$ART_MODE" == thumbnail || "$ART_MODE" == thumbnail-rewrite || "$ART_MODE" == thumbnail-stale ]]; then
    copied_thumbnails=$(find "$TEST_DIR/cache/dynamic-music-pill/art" -maxdepth 1 \
        -type f -name '*.png' ! -name 'hist_*' -size +0c | wc -l)
    if [[ ( "$ART_MODE" == thumbnail || "$ART_MODE" == thumbnail-rewrite ) && "$copied_thumbnails" -lt 1 ||
          "$ART_MODE" == thumbnail-stale && "$copied_thumbnails" -ne 0 ]]; then
        echo "Unexpected copied thumbnail count in $ART_MODE mode: $copied_thumbnails." >&2
        tail -30 "$TEST_DIR/shell.log" >&2
        exit 1
    fi
fi

echo "GNOME 50 MPRIS history smoke test passed ($ART_MODE, $TEST_CYCLES cycle(s), $DOCK_TOGGLES dock toggle(s), $MODULE_TOGGLES module toggle(s))."
