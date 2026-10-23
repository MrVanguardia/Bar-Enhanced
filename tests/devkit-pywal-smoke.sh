#!/usr/bin/env bash
# Pywal activation, late file creation, live updates, and opt-out in private GNOME.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v magick >/dev/null || { echo 'ImageMagick is required for wallpaper fixtures.' >&2; exit 2; }
TEST_DIR="$(mktemp -d)"
trap 'if [[ "${BAR_ENHANCED_TEST_KEEP_DIR:-0}" == 1 ]]; then echo "Pywal Devkit logs: $TEST_DIR"; else rm -rf -- "$TEST_DIR"; fi' EXIT
EXTENSION_DIR="$TEST_DIR/data/gnome-shell/extensions/bar-enhanced@mrvanguardia"
mkdir -p "$EXTENSION_DIR" "$TEST_DIR/config" "$TEST_DIR/cache" "$TEST_DIR/run" "$TEST_DIR/home/.cache"
chmod 700 "$TEST_DIR/run"
magick -size 256x256 'gradient:#843830-#304086' "$TEST_DIR/wallpaper-one.png"
magick -size 256x256 'gradient:#20a050-#c0b030' "$TEST_DIR/wallpaper-two.png"
bash "$ROOT_DIR/tools/package-extension.sh" "$TEST_DIR" > "$TEST_DIR/package.log"
unzip -oq "$TEST_DIR/bar-enhanced@mrvanguardia.shell-extension.zip" -d "$EXTENSION_DIR"
export HOME="$TEST_DIR/home"
export XDG_DATA_HOME="$TEST_DIR/data"
export XDG_CONFIG_HOME="$TEST_DIR/config"
export XDG_CACHE_HOME="$TEST_DIR/cache"
export XDG_RUNTIME_DIR="$TEST_DIR/run"
export GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas"

if ! dbus-run-session -- bash -c '
    set -euo pipefail
    schema=org.gnome.shell.extensions.bar-enhanced
    uuid=bar-enhanced@mrvanguardia
    css="$1/run/io.github.mrvanguardia.barEnhanced/bar-enhanced.css"
    gsettings set org.gnome.desktop.background picture-uri "file://$1/wallpaper-one.png"
    gsettings set org.gnome.desktop.background picture-uri-dark "file://$1/wallpaper-one.png"
    gsettings set "$schema" autotheme-dark Color
    gsettings set "$schema" autotheme-light Color
    gsettings set "$schema" autotheme-refresh true
    gnome-shell --headless --devkit --virtual-monitor=1280x720 > "$1/shell.log" 2>&1 &
    shell_pid=$!
    trap "kill $shell_pid 2>/dev/null || true; wait $shell_pid 2>/dev/null || true" EXIT
    for attempt in {1..30}; do
        if gnome-extensions list | grep -Fxq "$uuid"; then break; fi
        sleep 0.5
    done
    for key in dash-to-dock-enabled music-pill-enabled vitals-enabled bluetooth-battery-enabled notif-icons-enabled hydro-widgets-enabled hydro-media-enabled; do
        gsettings set "$schema" "$key" false
    done
    gnome-extensions enable "$uuid"
    for attempt in {1..40}; do
        if gnome-extensions info "$uuid" 2>/dev/null | grep -q "State: ACTIVE" && [[ -s "$css" ]]; then break; fi
        sleep 0.25
    done
    gnome-extensions info "$uuid" | grep -q "State: ACTIVE"
    [[ -s "$css" ]]
    gsettings set "$schema" pywal-sync true
    mkdir -p "$HOME/.cache/wal"
    cp "$2/tests/fixtures/pywal-colors-one.txt" "$HOME/.cache/wal/colors"
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" bgcolor)" == *0.063*0.125*0.188* ]] &&
            [[ "$(gsettings get "$schema" mbgcolor)" == *0.063*0.125*0.188* ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" bgcolor)" == *0.063*0.125*0.188* ]]
    [[ "$(gsettings get "$schema" mbgcolor)" == *0.063*0.125*0.188* ]]
    [[ "$(gsettings get "$schema" pause-reload)" == false ]]
    [[ "$(gsettings get "$schema" apply-gtk)" == false ]]
    gsettings set org.gnome.desktop.background picture-uri "file://$1/wallpaper-two.png"
    gsettings set org.gnome.desktop.background picture-uri-dark "file://$1/wallpaper-two.png"
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" dark-bguri)" == *wallpaper-two.png* ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" dark-bguri)" == *wallpaper-two.png* ]]
    sleep 0.5
    [[ "$(gsettings get "$schema" bgcolor)" == *0.063*0.125*0.188* ]]
    first_hash=$(sha256sum "$css" | cut -d " " -f 1)
    cp "$2/tests/fixtures/pywal-colors-two.txt" "$HOME/.cache/wal/colors"
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" bgcolor)" == *0.753*0.125*0.251* ]] &&
            [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$first_hash" ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" bgcolor)" == *0.753*0.125*0.251* ]]
    [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$first_hash" ]]
    second_color=$(gsettings get "$schema" bgcolor)
    cp "$2/tests/fixtures/pywal-colors-invalid.txt" "$HOME/.cache/wal/colors"
    sleep 1
    [[ "$(gsettings get "$schema" bgcolor)" == "$second_color" ]]
    [[ "$(gsettings get "$schema" pause-reload)" == false ]]
    cp "$2/tests/fixtures/pywal-colors-one.txt" "$HOME/.cache/wal/colors.new"
    mv -f "$HOME/.cache/wal/colors.new" "$HOME/.cache/wal/colors"
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" bgcolor)" == *0.063*0.125*0.188* ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" bgcolor)" == *0.063*0.125*0.188* ]]
    gsettings set "$schema" pywal-sync false
    second_color=$(gsettings get "$schema" bgcolor)
    cp "$2/tests/fixtures/pywal-colors-two.txt" "$HOME/.cache/wal/colors"
    sleep 1
    [[ "$(gsettings get "$schema" bgcolor)" == "$second_color" ]]
    [[ "$(gsettings get "$schema" pause-reload)" == false ]]
    gnome-extensions disable "$uuid"
' _ "$TEST_DIR" "$ROOT_DIR" > "$TEST_DIR/session.log" 2>&1; then
    tail -45 "$TEST_DIR/session.log" >&2
    tail -45 "$TEST_DIR/shell.log" >&2
    exit 1
fi

if rg -n 'BarEnhanced: failed to synchronize Pywal|JS ERROR|St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log"; then
    echo 'Pywal Devkit test found a runtime error.' >&2
    exit 1
fi
echo 'Pywal Devkit smoke passed: late palette, live and atomic updates, invalid palette, wallpaper precedence, disabled monitoring, GTK isolation.'
