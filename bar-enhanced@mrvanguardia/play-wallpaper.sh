#!/bin/bash

# Simple wrapper to play video wallpapers on GNOME (Wayland/X11)

VIDEO_PATH="$1"
CMD_FILE="/tmp/bar_enhanced_wp_cmd"

# Kill any existing player
pkill -f "mpvpaper.*bar-enhanced"
pkill -f "xwinwrap.*bar-enhanced"
killall mpvpaper 2>/dev/null
killall xwinwrap 2>/dev/null

if [ "$VIDEO_PATH" == "stop" ]; then
    exit 0
fi

if [ ! -f "$VIDEO_PATH" ]; then
    echo "Video file not found: $VIDEO_PATH"
    exit 1
fi

if [ "$XDG_SESSION_TYPE" == "wayland" ]; then
    if command -v mpvpaper >/dev/null 2>&1; then
        # mpvpaper runs mpv under the hood and places it behind icons on Wayland
        mpvpaper -o "loop --hwdec=auto --no-audio --input-ipc-server=/tmp/mpv-wp-socket" "*" "$VIDEO_PATH" &
    else
        echo "Please install mpvpaper for Wayland video wallpapers."
        # Notify user (basic fallback)
        notify-send "Bar Enhanced" "Please install 'mpvpaper' to play video wallpapers on Wayland."
    fi
else
    # X11
    if command -v xwinwrap >/dev/null 2>&1 && command -v mpv >/dev/null 2>&1; then
        xwinwrap -fs -fdt -ni -b -nf -- mpv --hwdec=auto --no-audio -wid WID --loop "$VIDEO_PATH" &
    else
        echo "Please install xwinwrap and mpv for X11 video wallpapers."
        notify-send "Bar Enhanced" "Please install 'xwinwrap' and 'mpv' for video wallpapers."
    fi
fi
