#!/usr/bin/env bash
# Exercise the Bar Enhanced core without its optional modules in an isolated GNOME Shell.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'if [[ "${BAR_ENHANCED_TEST_KEEP_DIR:-0}" == 1 ]]; then echo "Core Devkit logs: $TEST_DIR"; else rm -rf "$TEST_DIR"; fi' EXIT

EXTENSION_DIR="$TEST_DIR/data/gnome-shell/extensions/bar-enhanced@mrvanguardia"
mkdir -p "$EXTENSION_DIR" "$TEST_DIR/config" "$TEST_DIR/cache" "$TEST_DIR/run"
chmod 700 "$TEST_DIR/run"
bash "$ROOT_DIR/tools/package-extension.sh" "$TEST_DIR" > "$TEST_DIR/package.log"
unzip -oq "$TEST_DIR/bar-enhanced@mrvanguardia.shell-extension.zip" -d "$EXTENSION_DIR"

export XDG_DATA_HOME="$TEST_DIR/data"
export XDG_CONFIG_HOME="$TEST_DIR/config"
export XDG_CACHE_HOME="$TEST_DIR/cache"
export XDG_RUNTIME_DIR="$TEST_DIR/run"
export GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas"

if ! dbus-run-session -- bash -c '
    set -euo pipefail
    schema=org.gnome.shell.extensions.bar-enhanced
    uuid=bar-enhanced@mrvanguardia
    css="$2/run/io.github.mrvanguardia.barEnhanced/bar-enhanced.css"
    gnome-shell --headless --devkit --virtual-monitor=1280x720 > "$2/shell.log" 2>&1 &
    shell_pid=$!
    trap "kill $shell_pid 2>/dev/null || true; wait $shell_pid 2>/dev/null || true" EXIT
    for attempt in {1..30}; do
        if gnome-extensions list | grep -Fxq "$uuid"; then break; fi
        sleep 0.5
    done
    gnome-extensions list | grep -Fxq "$uuid"
    for key in dash-to-dock-enabled music-pill-enabled vitals-enabled bluetooth-battery-enabled notif-icons-enabled hydro-widgets-enabled hydro-media-enabled; do
        gsettings set "$schema" "$key" false
    done
    for cycle in 1 2 3; do
        gnome-extensions enable "$uuid"
        for attempt in {1..30}; do
            if gnome-extensions info "$uuid" 2>/dev/null | grep -q "State: ACTIVE" && [[ -s "$css" ]]; then break; fi
            sleep 0.25
        done
        gnome-extensions info "$uuid" | grep -q "State: ACTIVE"
        [[ -s "$css" ]]
        gsettings set "$schema" bartype Floating
        gsettings set "$schema" bgcolor "[\"0.12\", \"0.34\", \"0.56\"]"
        gsettings set "$schema" mbgcolor "[\"0.18\", \"0.28\", \"0.38\"]"
        gsettings set "$schema" apply-menu-shell true
        for attempt in {1..40}; do
            if rg -Fq "rgba(30,86,142," "$css"; then break; fi
            sleep 0.1
        done
        rg -Fq "rgba(30,86,142," "$css"
        gnome-extensions disable "$uuid"
        for attempt in {1..20}; do
            if ! gnome-extensions info "$uuid" 2>/dev/null | grep -q "State: ACTIVE"; then break; fi
            sleep 0.25
        done
        ! gnome-extensions info "$uuid" 2>/dev/null | grep -q "State: ACTIVE"
    done
' _ "$ROOT_DIR" "$TEST_DIR" > "$TEST_DIR/session.log" 2>&1; then
    tail -40 "$TEST_DIR/session.log" >&2
    tail -40 "$TEST_DIR/shell.log" >&2
    exit 1
fi

if rg -n 'BarEnhanced: failed|JS ERROR|St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log"; then
    echo 'Core Devkit smoke test found a runtime error.' >&2
    exit 1
fi
echo 'Bar Enhanced core Devkit smoke test passed (optional modules off, 3 enable/disable cycles, live bar and menu settings).'
