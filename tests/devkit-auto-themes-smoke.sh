#!/usr/bin/env bash
# Wallpaper palette and automatic-theme integration in a private GNOME session.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
command -v magick >/dev/null || { echo 'ImageMagick is required for fixture generation.' >&2; exit 2; }
TEST_DIR="$(mktemp -d)"
trap 'if [[ "${BAR_ENHANCED_TEST_KEEP_DIR:-0}" == 1 ]]; then echo "Auto-theme Devkit logs: $TEST_DIR"; else rm -rf -- "$TEST_DIR"; fi' EXIT
EXTENSION_DIR="$TEST_DIR/data/gnome-shell/extensions/bar-enhanced@mrvanguardia"
mkdir -p "$EXTENSION_DIR" "$TEST_DIR/config" "$TEST_DIR/cache" "$TEST_DIR/run"
chmod 700 "$TEST_DIR/run"
magick -size 256x256 'gradient:#b03040-#2030a0' "$TEST_DIR/wallpaper-one.png"
magick -size 256x256 'gradient:#30a060-#d0bc30' "$TEST_DIR/wallpaper-two.png"
bash "$ROOT_DIR/tools/package-extension.sh" "$TEST_DIR" > "$TEST_DIR/package.log"
unzip -oq "$TEST_DIR/bar-enhanced@mrvanguardia.shell-extension.zip" -d "$EXTENSION_DIR"
export XDG_DATA_HOME="$TEST_DIR/data"
export XDG_CONFIG_HOME="$TEST_DIR/config"
export XDG_CACHE_HOME="$TEST_DIR/cache"
export XDG_RUNTIME_DIR="$TEST_DIR/run"
export GSETTINGS_SCHEMA_DIR="$EXTENSION_DIR/schemas"

if ! dbus-run-session -- bash -c '
    set -euo pipefail
    set -x
    schema=org.gnome.shell.extensions.bar-enhanced
    uuid=bar-enhanced@mrvanguardia
    css="$1/run/io.github.mrvanguardia.barEnhanced/bar-enhanced.css"
    expect_double() {
        local actual expected
        actual=$(gsettings get "$schema" "$1")
        expected=$2
        awk -v a="$actual" -v b="$expected" "BEGIN { d = a - b; if (d < 0) d = -d; exit(d > 0.000001) }"
    }
    gsettings set org.gnome.desktop.background picture-uri "file://$1/wallpaper-one.png"
    gsettings set org.gnome.desktop.background picture-uri-dark "file://$1/wallpaper-one.png"
    gsettings set org.gnome.desktop.interface color-scheme prefer-dark
    for key in dash-to-dock-enabled music-pill-enabled vitals-enabled bluetooth-battery-enabled notif-icons-enabled hydro-widgets-enabled hydro-media-enabled; do
        gsettings set "$schema" "$key" false
    done
    gsettings set "$schema" autotheme-dark "Select Theme"
    gsettings set "$schema" autotheme-light "Select Theme"
    gsettings set "$schema" autotheme-refresh true
    gsettings set "$schema" autotheme-active-tile-color false
    gsettings set "$schema" mscolor "[\"0.1\", \"0.2\", \"0.3\"]"
    gsettings set "$schema" dark-mscolor "[\"0.1\", \"0.2\", \"0.3\"]"
    gnome-shell --headless --devkit --virtual-monitor=1280x720 > "$1/shell.log" 2>&1 &
    shell_pid=$!
    trap "kill $shell_pid 2>/dev/null || true; wait $shell_pid 2>/dev/null || true" EXIT
    for attempt in {1..30}; do
        if gnome-extensions list | grep -Fxq "$uuid"; then break; fi
        sleep 0.5
    done
    gnome-extensions enable "$uuid"
    for attempt in {1..80}; do
        if gnome-extensions info "$uuid" 2>/dev/null | grep -q "State: ACTIVE" &&
            [[ "$(gsettings get "$schema" dark-bguri)" == *wallpaper-one.png* ]] &&
            [[ "$(gsettings get "$schema" dark-palette1)" != *100*100*100* ]]; then break; fi
        sleep 0.25
    done
    gnome-extensions info "$uuid" | grep -q "State: ACTIVE"
    [[ -s "$css" ]]
    [[ "$(gsettings get "$schema" autotheme-dark)" == *Color* ]]
    [[ "$(gsettings get "$schema" autotheme-light)" == *Color* ]]
    gsettings set "$schema" autotheme-light Pastel
    [[ "$(gsettings get "$schema" dark-bguri)" == *wallpaper-one.png* ]]
    first_palette=$(gsettings get "$schema" dark-palette1)
    [[ "$first_palette" != *100*100*100* ]]
    [[ "$(gsettings get "$schema" light-palette1)" != *100*100*100* ]]
    gsettings set "$schema" trigger-autotheme true
    sleep 0.5
    for attempt in {1..40}; do
        if [[ "$(gsettings get "$schema" autotheme-font)" == true ]] &&
            [[ "$(gsettings get "$schema" pause-reload)" == false ]]; then break; fi
        sleep 0.1
    done
    [[ "$(gsettings get "$schema" autotheme-font)" == true ]]
    [[ "$(gsettings get "$schema" pause-reload)" == false ]]
    [[ "$(gsettings get "$schema" mscolor)" == *0.1*0.2*0.3* ]]
    gsettings set org.gnome.desktop.interface color-scheme default
    for attempt in {1..40}; do
        if [[ "$(gsettings get "$schema" bgcolor)" == "$(gsettings get "$schema" light-bgcolor)" ]]; then break; fi
        sleep 0.1
    done
    [[ "$(gsettings get "$schema" bgcolor)" == "$(gsettings get "$schema" light-bgcolor)" ]]
    first_bar_color=$(gsettings get "$schema" bgcolor)
    first_menu_color=$(gsettings get "$schema" mbgcolor)
    first_css_hash=$(sha256sum "$css" | cut -d " " -f 1)
    gsettings set org.gnome.desktop.background picture-uri "file://$1/wallpaper-two.png"
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" light-bguri)" == *wallpaper-two.png* ]] &&
            [[ "$(gsettings get "$schema" light-palette1)" != "$first_palette" ]] &&
            [[ "$(gsettings get "$schema" bgcolor)" != "$first_bar_color" ]] &&
            [[ "$(gsettings get "$schema" mbgcolor)" != "$first_menu_color" ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" light-bguri)" == *wallpaper-two.png* ]]
    [[ "$(gsettings get "$schema" light-palette1)" != "$first_palette" ]]
    [[ "$(gsettings get "$schema" bgcolor)" != "$first_bar_color" ]]
    [[ "$(gsettings get "$schema" mbgcolor)" != "$first_menu_color" ]]
    [[ "$(gsettings get "$schema" bgcolor)" == "$(gsettings get "$schema" light-bgcolor)" ]]
    [[ "$(gsettings get "$schema" mbgcolor)" == "$(gsettings get "$schema" light-mbgcolor)" ]]
    for attempt in {1..40}; do
        if [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$first_css_hash" ]]; then break; fi
        sleep 0.1
    done
    [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$first_css_hash" ]]
    [[ "$(gsettings get "$schema" pause-reload)" == false ]]
    expect_css_change() {
        local before="$1" key="$2"
        for attempt in {1..40}; do
            if [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$before" ]]; then return 0; fi
            sleep 0.1
        done
        echo "No live CSS change for $key" >&2
        return 1
    }
    gsettings set "$schema" fgcolor "[\"1\", \"0\", \"0\"]"
    gsettings set "$schema" autofg-bar false
    sleep 0.25
    before=$(sha256sum "$css" | cut -d " " -f 1)
    gsettings set "$schema" autofg-bar true
    expect_css_change "$before" autofg-bar
    gsettings set "$schema" mfgcolor "[\"1\", \"0\", \"0\"]"
    gsettings set "$schema" autofg-menu false
    sleep 0.25
    before=$(sha256sum "$css" | cut -d " " -f 1)
    gsettings set "$schema" autofg-menu true
    expect_css_change "$before" autofg-menu
    gsettings set "$schema" smbgcolor "[\"1\", \"0\", \"1\"]"
    gsettings set "$schema" smbgoverride false
    sleep 0.25
    before=$(sha256sum "$css" | cut -d " " -f 1)
    gsettings set "$schema" smbgoverride true
    expect_css_change "$before" smbgoverride
    gsettings set "$schema" bcolor "[\"0.1\", \"0.2\", \"0.3\"]"
    for attempt in {1..40}; do
        if rg -Fq "rgba(25,51,76," "$css"; then break; fi
        sleep 0.1
    done
    rg -Fq "rgba(25,51,76," "$css"
    manual_accent_hash=$(sha256sum "$css" | cut -d " " -f 1)
    gsettings set "$schema" system-accent-sync true
    gsettings set org.gnome.desktop.interface accent-color orange
    for attempt in {1..40}; do
        if rg -Fq "rgba(230,96,0," "$css"; then break; fi
        sleep 0.1
    done
    rg -Fq "rgba(230,96,0," "$css"
    [[ "$(sha256sum "$css" | cut -d " " -f 1)" != "$manual_accent_hash" ]]
    gsettings set "$schema" system-accent-sync false
    for attempt in {1..40}; do
        if [[ "$(sha256sum "$css" | cut -d " " -f 1)" == "$manual_accent_hash" ]]; then break; fi
        sleep 0.1
    done
    [[ "$(sha256sum "$css" | cut -d " " -f 1)" == "$manual_accent_hash" ]]
    gsettings set "$schema" auto-bgalpha false
    gsettings set "$schema" bgalpha 0.41
    gsettings set "$schema" bartype Floating
    expect_double bgalpha 0.41
    gsettings set "$schema" auto-bgalpha true
    expect_double bgalpha 0.95
    gsettings set "$schema" bartype Islands
    expect_double bgalpha 0
    expect_double isalpha 0.95
    gsettings set "$schema" auto-bgalpha false
    gsettings set "$schema" bgalpha 0.41
    gsettings set "$schema" bartype Mainland
    expect_double bgalpha 0.41
    gsettings set "$schema" autotheme-refresh false
    gsettings set "$schema" autotheme-dark "Select Theme"
    gsettings set "$schema" autotheme-light "Select Theme"
    gsettings set "$schema" bgcolor "[\"0.01\", \"0.02\", \"0.03\"]"
    gsettings set "$schema" mbgcolor "[\"0.03\", \"0.02\", \"0.01\"]"
    gsettings set "$schema" autotheme-refresh true
    for attempt in {1..80}; do
        if [[ "$(gsettings get "$schema" autotheme-dark)" == *Color* ]] &&
            [[ "$(gsettings get "$schema" autotheme-light)" == *Color* ]] &&
            [[ "$(gsettings get "$schema" bgcolor)" == "$(gsettings get "$schema" light-bgcolor)" ]] &&
            [[ "$(gsettings get "$schema" mbgcolor)" == "$(gsettings get "$schema" light-mbgcolor)" ]]; then break; fi
        sleep 0.25
    done
    [[ "$(gsettings get "$schema" autotheme-dark)" == *Color* ]]
    [[ "$(gsettings get "$schema" autotheme-light)" == *Color* ]]
    [[ "$(gsettings get "$schema" bgcolor)" == "$(gsettings get "$schema" light-bgcolor)" ]]
    [[ "$(gsettings get "$schema" mbgcolor)" == "$(gsettings get "$schema" light-mbgcolor)" ]]
    gnome-extensions disable "$uuid"
' _ "$TEST_DIR" > "$TEST_DIR/session.log" 2>&1; then
    tail -35 "$TEST_DIR/session.log" >&2
    tail -35 "$TEST_DIR/shell.log" >&2
    exit 1
fi

if rg -n 'BarEnhanced: palette extraction failed|BarEnhanced: palette extraction returned no usable|JS ERROR|St-CRITICAL.*st_widget_get_theme_node' "$TEST_DIR/shell.log"; then
    echo 'Automatic theme Devkit test found a runtime error.' >&2
    exit 1
fi
echo 'Automatic theme Devkit smoke passed: two wallpapers, dark/light, auto-refresh, palette, active-tile preservation, automatic foregrounds, secondary menu, system accent.'
