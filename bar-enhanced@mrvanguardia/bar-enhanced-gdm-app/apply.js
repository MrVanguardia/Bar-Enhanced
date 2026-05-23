import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

function getRgbaColor(colorStr, opacityPercent) {
    let opacity = (opacityPercent / 100.0).toFixed(2);
    let c = colorStr.replace(/\s+/g, '').toLowerCase();
    
    if (c.startsWith('#')) {
        let hex = c.slice(1);
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        let r = parseInt(hex.slice(0, 2), 16) || 0;
        let g = parseInt(hex.slice(2, 4), 16) || 0;
        let b = parseInt(hex.slice(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    let rgbMatch = c.match(/^rgba?\((\d+),(\d+),(\d+)(?:,[\d.]+)?\)$/);
    if (rgbMatch) {
        return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
    }
    
    return `rgba(0, 0, 0, ${opacity})`;
}

function getCss(appearance, topBar, misc, extensionPath, extension) {
    let css = "\n\n/* 'Bar Enhanced GDM' Custom CSS */\n";

    // Lock Screen Background CSS
    let bgType = appearance.get_string('background-type');
    let bgImg = appearance.get_string('background-image');

    if (bgType === 'image' && bgImg) {
        css += `#lockDialogGroup {\n  background-image: url('file:///usr/share/backgrounds/bar-enhanced-gdm-bg') !important;\n  background-size: cover;\n  background-repeat: no-repeat;\n}\n`;
        if (!misc.get_boolean('enable-custom-auth-box')) {
            css += `.login-dialog, .unlock-dialog, .modal-dialog {
  background-color: rgba(30, 30, 30, 0.6) !important;
}
.login-dialog-prompt-layout,
.login-dialog-user-selection-box,
.login-dialog > StBoxLayout,
.unlock-dialog > StBoxLayout,
.modal-dialog > StBoxLayout {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
`;
        }
    } else if (bgType === 'color') {
        let bgColor = appearance.get_string('background-color');
        css += `#lockDialogGroup {\n  background-image: none !important;\n  background-color: ${bgColor} !important;\n}\n`;
    }

    // Top Bar CSS tweaks
    let disableArrows = topBar.get_boolean('disable-arrows');
    let disableCorners = topBar.get_boolean('disable-rounded-corners');
    let changeTextColor = topBar.get_boolean('change-text-color');
    let textColor = topBar.get_string('text-color');
    let changeBgColor = topBar.get_boolean('change-background-color');
    let bgColorTop = topBar.get_string('background-color');

    const selectElem = (elem = '') => {
        if (elem) {
            return `#panel .${elem}, #panel.login-screen .${elem}, #panel.unlock-screen .${elem}`;
        } else {
            return `#panel, #panel.login-screen, #panel.unlock-screen`;
        }
    };

    if (disableArrows) {
        css += selectElem('popup-menu-arrow') + " { width: 0px !important; }\n";
    }
    if (disableCorners) {
        css += selectElem('panel-corner') + " { -panel-corner-opacity: 0 !important; }\n";
    }
    if (changeTextColor) {
        css += `#panel .panel-button,\n#panel .panel-button .clock,\n#panel .panel-button StLabel,\n#panel .panel-button StIcon {\n  color: ${textColor} !important;\n  -icon-color: ${textColor} !important;\n}\n`;
    }
    if (changeBgColor) {
        css += `#panel {\n  background-color: ${bgColorTop} !important;\n  background-image: none !important;\n}\n`;
        if (!disableCorners) {
            css += `#panel .panel-corner {\n  -panel-corner-opacity: 1 !important;\n  -panel-corner-background-color: ${bgColorTop} !important;\n}\n`;
        }
    }

    if (misc.get_boolean('enable-welcome-message') && misc.get_boolean('enlarge-welcome-message')) {
        css += ".login-dialog-banner {\n  font-size: 1.5em !important;\n  font-weight: bold !important;\n}\n";
    }

    if (misc.get_boolean('enable-custom-auth-box')) {
        let authColor = getRgbaColor(misc.get_string('auth-box-color'), misc.get_double('auth-box-opacity'));
        css += `.login-dialog, .login-dialog-card, .unlock-dialog, .unlock-dialog-card, .modal-dialog {
  background-color: ${authColor} !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
}

.login-dialog-prompt-layout,
.login-dialog-user-selection-box,
.login-dialog > StBoxLayout,
.unlock-dialog > StBoxLayout,
.modal-dialog > StBoxLayout,
.login-dialog-card > StBoxLayout,
.unlock-dialog-card > StBoxLayout {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* User Selection list items */
.login-dialog-user-list-item, .login-dialog-auth-list-item {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.login-dialog-user-list-item:hover, .login-dialog-auth-list-item:hover {
  background-color: rgba(255, 255, 255, 0.12) !important;
}

.login-dialog-user-list-item:selected, .login-dialog-user-list-item:focus,
.login-dialog-auth-list-item:selected, .login-dialog-auth-list-item:focus {
  background-color: rgba(255, 255, 255, 0.18) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
}

/* Password input entry */
.login-dialog-prompt-entry {
  background-color: rgba(0, 0, 0, 0.3) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

/* GDM Action Buttons (Cancel, Session list, Accessibility, Not listed) */
.login-dialog-button.a11y-button,
.login-dialog-button.cancel-button,
.login-dialog-button.switch-user-button,
.login-dialog-button.login-dialog-session-list-button,
.login-dialog-not-listed-button {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.login-dialog-button.a11y-button:hover,
.login-dialog-button.cancel-button:hover,
.login-dialog-button.switch-user-button:hover,
.login-dialog-button.login-dialog-session-list-button:hover,
.login-dialog-not-listed-button:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
}

.login-dialog-button.a11y-button:focus,
.login-dialog-button.cancel-button:focus,
.login-dialog-button.switch-user-button:focus,
.login-dialog-button.login-dialog-session-list-button:focus,
.login-dialog-not-listed-button:focus {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}
`;
    }

    let userTopBarStyle = "";
    if (extension) {
        try {
            let userRuntimeDir = GLib.get_user_runtime_dir();
            let pathsToTry = [
                `${userRuntimeDir}/io.github.mrvanguardia.barEnhanced/bar-enhanced.css`,
                `${userRuntimeDir}/io.github.mrvanguardia.barEnhanced/stylesheet.css`,
                `${extension.path}/stylesheet.css`
            ];
            let userStylesheetFile = null;
            for (let path of pathsToTry) {
                let f = Gio.File.new_for_path(path);
                if (f.query_exists(null)) {
                    userStylesheetFile = f;
                    break;
                }
            }
            if (userStylesheetFile && userStylesheetFile.query_exists(null)) {
                let [success, contentBytes] = userStylesheetFile.load_contents(null);
                if (success) {
                    let content = new TextDecoder().decode(contentBytes);
                    
                    // Get user's session settings
                    const userSettings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced');
                    let bartype = userSettings.get_string('bartype');
                    let candybar = userSettings.get_boolean('candybar');
                    
                    // Post-process the CSS to apply it to GDM panel directly
                    content = content.replace(/\.barEnhanced/g, '');
                    
                    if (bartype === 'Trilands') {
                        content = content.replace(/\.trilands/g, '');
                    }
                    
                    if (candybar) {
                        content = content.replace(/\.candybar/g, '');
                    }
                    
                    userTopBarStyle = "\n/* --- Logged-in User Session Top Bar Styles --- */\n" + content + "\n";
                }
            }
        } catch (e) {
            console.log("Error reading user session top bar stylesheet: " + e);
        }
    }

    return css + userTopBarStyle;
}

export function generateDconfScript(extension) {
    const appearance = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.appearance');
    const fonts = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.fonts');
    const misc = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.misc');
    const mouse = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.mouse');
    const nightLight = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.night-light');
    const pointing = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.pointing');
    const power = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.power');
    const sound = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.sound');
    const topBar = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.top-bar');
    const touchpad = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.touchpad');
    const a11y = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.accessibility');

    function formatDouble(val) {
        let s = val.toString();
        return s.includes('.') ? s : `${s}.0`;
    }

    let hasAccentColor = false;
    try {
        let s = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        hasAccentColor = s.settings_schema.list_keys().includes('accent-color');
    } catch (e) {}

    let accentColorLine = hasAccentColor ? `accent-color='${appearance.get_string('accent-color')}'` : '';

    let hasUserTheme = true;
    let userThemeDconf = '';
    if (hasUserTheme) {
        userThemeDconf = `
[org/gnome/shell]
disable-user-extensions=false
enabled-extensions=['user-theme@gnome-shell-extensions.gcampax.github.com']

[org/gnome/shell/extensions/user-theme]
name='BarEnhancedGdm'
`;
    }

    let dconf = `[org/gnome/desktop/interface]
${accentColorLine}
color-scheme='${appearance.get_boolean('light-mode') ? 'prefer-light' : 'prefer-dark'}'
cursor-theme='${appearance.get_string('cursor-theme')}'
cursor-size=${pointing.get_int('cursor-size')}
icon-theme='${appearance.get_string('icon-theme')}'
clock-show-date=${topBar.get_boolean('show-date')}
clock-show-seconds=${topBar.get_boolean('show-seconds')}
clock-show-weekday=${topBar.get_boolean('show-weekday')}
clock-format='${topBar.get_string('time-format')}'
show-battery-percentage=${topBar.get_boolean('show-battery-percentage')}
font-name='${fonts.get_string('font')}'
font-antialiasing='${fonts.get_string('antialiasing')}'
font-hinting='${fonts.get_string('hinting')}'
text-scaling-factor=${formatDouble(fonts.get_double('scaling-factor'))}
shell-theme='BarEnhancedGdm'

[org/gnome/desktop/background]
picture-uri='${appearance.get_string('background-type') === 'image' && appearance.get_string('background-image') ? 'file:///usr/share/backgrounds/bar-enhanced-gdm-bg' : ''}'
picture-uri-dark='${appearance.get_string('background-type') === 'image' && appearance.get_string('background-image') ? 'file:///usr/share/backgrounds/bar-enhanced-gdm-bg' : ''}'
picture-options='zoom'

[org/gnome/desktop/a11y]
always-show-universal-access-status=${a11y.get_boolean('always-show-accessibility-menu')}

[org/gnome/desktop/sound]
theme-name='${sound.get_string('theme')}'
event-sounds=${sound.get_boolean('event-sounds')}
input-feedback-sounds=${sound.get_boolean('feedback-sounds')}
allow-volume-above-100-percent=${sound.get_boolean('over-amplification')}

[org/gnome/desktop/peripherals/mouse]
accel-profile='${mouse.get_string('pointer-acceleration')}'
natural-scroll=${mouse.get_boolean('natural-scrolling')}
speed=${formatDouble(mouse.get_double('speed'))}

[org/gnome/desktop/peripherals/touchpad]
speed=${formatDouble(touchpad.get_double('speed'))}
tap-to-click=${touchpad.get_boolean('tap-to-click')}
natural-scroll=${touchpad.get_boolean('natural-scrolling')}
two-finger-scrolling-enabled=${touchpad.get_boolean('two-finger-scrolling')}
disable-while-typing=${touchpad.get_boolean('disable-while-typing')}
send-events='${!touchpad.get_boolean('enable') ? 'disabled' : (touchpad.get_boolean('disable-on-external-mouse') ? 'disabled-on-external-mouse' : 'enabled')}'

[org/gnome/settings-daemon/plugins/power]
power-button-action='${power.get_string('power-button-action')}'
power-saver-profile-on-low-battery=${power.get_boolean('auto-power-saver')}
idle-dim=${power.get_boolean('dim-screen')}
sleep-inactive-ac-type='${power.get_boolean('suspend-on-ac') ? 'suspend' : 'nothing'}'
sleep-inactive-ac-timeout=${Math.round(power.get_double('suspend-on-ac-delay') * 60)}
sleep-inactive-battery-type='${power.get_boolean('suspend-on-battery') ? 'suspend' : 'nothing'}'
sleep-inactive-battery-timeout=${Math.round(power.get_double('suspend-on-battery-delay') * 60)}

[org/gnome/desktop/session]
idle-delay=uint32 ${power.get_boolean('blank-screen') ? Math.round(power.get_double('idle-delay') * 60) : 0}

[org/gnome/settings-daemon/plugins/color]
night-light-enabled=${nightLight.get_boolean('enabled')}
night-light-temperature=uint32 ${nightLight.get_value('temperature').unpack()}
night-light-schedule-automatic=${nightLight.get_boolean('schedule-automatic')}
night-light-schedule-from=${formatDouble(nightLight.get_int('start-hour') + nightLight.get_int('start-minute')/60)}
night-light-schedule-to=${formatDouble(nightLight.get_int('end-hour') + nightLight.get_int('end-minute')/60)}

[org/gnome/login-screen]
logo='${misc.get_boolean('enable-logo') && misc.get_string('logo') ? 'file:///usr/share/backgrounds/bar-enhanced-gdm-logo' : ''}'
banner-message-enable=${misc.get_boolean('enable-welcome-message')}
banner-message-text='${misc.get_string('welcome-message').replace(/'/g, "\\'")}'
disable-restart-buttons=${misc.get_boolean('disable-restart-buttons')}
disable-user-list=${misc.get_boolean('disable-user-list')}
${userThemeDconf}`;

    let customCss = getCss(appearance, topBar, misc, extension.path, extension);
    let rawBgImage = appearance.get_string('background-image');
    let safeBgPath = rawBgImage.startsWith('file://') ? decodeURIComponent(rawBgImage.substring(7)) : rawBgImage;
    let bgImage = safeBgPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let bgType = appearance.get_string('background-type');
    let blurBg = appearance.get_boolean('blur-background');
    let blurBgValue = appearance.get_int('blur-background-value');

    let rawLogoImage = misc.get_string('logo');
    let safeLogoPath = rawLogoImage.startsWith('file://') ? decodeURIComponent(rawLogoImage.substring(7)) : rawLogoImage;
    let logoImage = safeLogoPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    let enableLogo = misc.get_boolean('enable-logo');

    return `#!/bin/bash
# Write settings
cat << 'EOF' > /tmp/95-gdm-settings
${dconf}
EOF

# Profile configuration
cat << 'EOF' > /tmp/gdm-profile
user-db:user
system-db:gdm
file-db:/usr/share/gdm/greeter-dconf-defaults
EOF

# Install settings to GDM database (99- prefix ensures it overrides all other system profiles)
install -Dm644 /tmp/95-gdm-settings -T /etc/dconf/db/gdm.d/99-bar-enhanced-gdm
install -Dm644 /tmp/gdm-profile -T /etc/dconf/profile/gdm

# Cleanup any obsolete configuration files to prevent conflicts
rm -f /etc/dconf/db/gdm.d/95-gdm-settings
rm -f /etc/dconf/db/gdm.d/01-bar-enhanced
# Compile GDM database directly to avoid broadcasting D-Bus signals that crash active GNOME sessions
dconf compile /etc/dconf/db/gdm /etc/dconf/db/gdm.d

# ----------------- ENSURE USER-THEME IS INSTALLED SYSTEM-WIDE -----------------
UT_DIR="/usr/share/gnome-shell/extensions/user-theme@gnome-shell-extensions.gcampax.github.com"
if [ ! -d "$UT_DIR" ]; then
    echo "user-theme extension not found. Installing..."
    if command -v dnf &>/dev/null; then
        dnf install -y gnome-shell-extension-user-theme
    elif command -v apt-get &>/dev/null; then
        apt-get update && apt-get install -y gnome-shell-extension-user-theme
    elif command -v pacman &>/dev/null; then
        pacman -Sy --noconfirm gnome-shell-extensions
    fi
fi

# Patch user-theme extension to support GDM mode
UT_META="$UT_DIR/metadata.json"
if [ -f "$UT_META" ]; then
    python3 -c "import json; f='$UT_META'; d=json.load(open(f)); d['session-modes']=list(set(d.get('session-modes',[])+['gdm','unlock-dialog'])); json.dump(d,open(f,'w'),indent=2)"
fi

# ----------------- CUSTOM THEME GENERATION -----------------
THEME_DIR="/usr/share/themes/BarEnhancedGdm/gnome-shell"
mkdir -p "$THEME_DIR"

# ----------------- BACKGROUND & LOGO COPYING -----------------
# We copy wallpaper and logo to /usr/share/backgrounds/ to ensure they are 100% readable by GDM user (SELinux and chmod-safe)
mkdir -p /usr/share/backgrounds

# Apply background image if present and type is image (using install -Dm644 to set correct SELinux context)
BG_IMG="${bgImage}"
BG_TYPE="${bgType}"
BLUR_BG="${blurBg}"
BLUR_RADIUS="${blurBgValue}"
if [ "$BG_TYPE" = "image" ] && [ -n "$BG_IMG" ] && [ -f "$BG_IMG" ]; then
    if [ "$BLUR_BG" = "true" ]; then
        python3 -c '
import sys
try:
    from PIL import Image, ImageFilter
    img = Image.open(sys.argv[1])
    blurred = img.filter(ImageFilter.GaussianBlur(radius=int(sys.argv[2])))
    blurred.save("/usr/share/backgrounds/bar-enhanced-gdm-bg")
    sys.exit(0)
except Exception as e:
    sys.exit(1)
' "\$BG_IMG" "\$BLUR_RADIUS" || convert "\$BG_IMG" -blur 0x"\$BLUR_RADIUS" /usr/share/backgrounds/bar-enhanced-gdm-bg || install -Dm644 "\$BG_IMG" /usr/share/backgrounds/bar-enhanced-gdm-bg
        chmod 644 /usr/share/backgrounds/bar-enhanced-gdm-bg
    else
        install -Dm644 "\$BG_IMG" /usr/share/backgrounds/bar-enhanced-gdm-bg
    fi
else
    rm -f /usr/share/backgrounds/bar-enhanced-gdm-bg
fi

# Apply logo if enabled (using install -Dm644 to set correct SELinux context)
ENABLE_LOGO="${enableLogo}"
LOGO_IMG="${logoImage}"
if [ "$ENABLE_LOGO" = "true" ] && [ -n "$LOGO_IMG" ] && [ -f "$LOGO_IMG" ]; then
    install -Dm644 "$LOGO_IMG" /usr/share/backgrounds/bar-enhanced-gdm-logo
else
    rm -f /usr/share/backgrounds/bar-enhanced-gdm-logo
fi

# Append custom CSS
cat << 'EOF' > "$THEME_DIR/gnome-shell.css"
@import url("resource:///org/gnome/shell/theme/gnome-shell.css");
${customCss}
EOF

chmod 755 /usr/share/themes/BarEnhancedGdm
chmod 755 "$THEME_DIR"
chmod 644 "$THEME_DIR/gnome-shell.css"

if command -v restorecon >/dev/null 2>&1; then
    restorecon -R /usr/share/themes/BarEnhancedGdm || true
    restorecon /usr/share/backgrounds/bar-enhanced-gdm-bg || true
    restorecon /usr/share/backgrounds/bar-enhanced-gdm-logo || true
    restorecon /usr/share/gnome-shell/extensions/user-theme@gnome-shell-extensions.gcampax.github.com/metadata.json || true
    restorecon -R /etc/dconf || true
fi
`;
}
