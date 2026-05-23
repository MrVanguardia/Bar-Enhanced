import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { buildAppearanceTab } from './tabs/appearance.js';
import { buildFontsTab } from './tabs/fonts.js';
import { buildLoginScreenTab } from './tabs/loginScreen.js';
import { buildPointingTab } from './tabs/pointing.js';
import { buildPowerTab } from './tabs/power.js';
import { buildSoundTab } from './tabs/sound.js';
import { buildDisplayTab } from './tabs/display.js';
import { buildAccessibilityTab } from './tabs/accessibility.js';
import { buildNightLightTab } from './tabs/nightLight.js';
import { buildToolsTab } from './tabs/tools.js';
import { generateDconfScript } from './apply.js';

export function openGdmCenter(parentWindow, extension, extensionPath, T) {
    const win = new Adw.PreferencesWindow({
        title: T ? T('Bar Enhanced GDM Center') : 'Bar Enhanced GDM Center',
        search_enabled: true,
        modal: true,
        transient_for: parentWindow,
        default_width: 850,
        default_height: 700,
    });

    // Add all tabs
    const appearancePage = buildAppearanceTab(extension, extensionPath, T);
    win.add(appearancePage);

    const loginScreenPage = buildLoginScreenTab(extension, extensionPath, T);
    win.add(loginScreenPage);

    const fontsPage = buildFontsTab(extension, extensionPath, T);
    win.add(fontsPage);

    const pointingPage = buildPointingTab(extension, extensionPath, T);
    win.add(pointingPage);

    const powerPage = buildPowerTab(extension, extensionPath, T);
    win.add(powerPage);

    const soundPage = buildSoundTab(extension, extensionPath, T);
    win.add(soundPage);

    const displayPage = buildDisplayTab(extension, extensionPath, T);
    win.add(displayPage);

    const accessibilityPage = buildAccessibilityTab(extension, extensionPath, T);
    win.add(accessibilityPage);

    const nightLightPage = buildNightLightTab(extension, extensionPath, T);
    win.add(nightLightPage);

    const toolsPage = buildToolsTab(extension, extensionPath, T);
    win.add(toolsPage);

    // Apply Button Setup
    // Since Adw.PreferencesWindow headers are internally managed, we can add a custom button inside a Gtk.HeaderBar 
    // if we access it, but in Libadwaita the easiest, cleanest cross-version way is to add a Floating action group 
    // or a group inside the visual tabs.
    // However, to keep it extremely intuitive, we will add an "Apply Settings" group at the top of the Appearance page 
    // and Login Screen page, or a global header button if possible.
    // Let's create an "Apply Changes" group and add it to EVERY page to make it extremely accessible.
    
    const pages = [appearancePage, loginScreenPage, fontsPage, pointingPage, powerPage, soundPage, displayPage, nightLightPage, accessibilityPage, toolsPage];
    
    const applyAction = () => {
        // Show "working" toast immediately so user knows button was pressed
        let workingToast = new Adw.Toast({ title: T ? T('Applying settings... please authenticate.') : 'Applying settings... please authenticate.' });
        win.add_toast(workingToast);

        let script;
        try {
            script = generateDconfScript(extension);
        } catch(e) {
            log("BarEnhanced: Error generating GDM script:", e);
            let errToast = new Adw.Toast({ title: `❌ Script error: ${e.message || e}` });
            win.add_toast(errToast);
            return;
        }

        try {
            // Pass script inline via bash -c (same as prefs.js working implementation)
            // pkexec cannot execute scripts from /tmp on Fedora/SELinux systems
            let proc = Gio.Subprocess.new(
                ['pkexec', 'bash', '-c', script],
                Gio.SubprocessFlags.NONE
            );

            proc.wait_async(null, (p, res) => {
                try {
                    p.wait_finish(res);
                    const exitStatus = p.get_exit_status();
                    if (exitStatus === 0) {
                        let successToast = new Adw.Toast({ title: T ? T('Settings applied successfully!') : '✅ Settings applied successfully!' });
                        win.add_toast(successToast);
                    } else {
                        let errToast = new Adw.Toast({ title: `❌ ${T ? T('Authentication failed or declined.') : 'Authentication failed or declined.'} (code ${exitStatus})` });
                        win.add_toast(errToast);
                    }
                } catch(e) {
                    let errToast = new Adw.Toast({ title: `❌ Wait error: ${e.message || e}` });
                    win.add_toast(errToast);
                    log("BarEnhanced: Error waiting GDM apply process:", e);
                }
            });
        } catch(e) {
            log("BarEnhanced: Error launching pkexec:", e);
            let errToast = new Adw.Toast({ title: `❌ Launch error: ${e.message || e}` });
            win.add_toast(errToast);
        }
    };

    pages.forEach(page => {
        const applyGroup = new Adw.PreferencesGroup({
            title: T ? T('Actions') : 'Actions',
            description: T ? T('Apply all configured settings to GDM (requires root authentication).') : 'Apply all configured settings to GDM.'
        });
        
        const applyBtn = new Gtk.Button({
            label: T ? T('Apply to GDM Login Screen') : 'Apply to GDM Login Screen',
            css_classes: ['suggested-action', 'pill'],
            margin_top: 6,
            margin_bottom: 6,
            halign: Gtk.Align.CENTER
        });
        applyBtn.connect('clicked', applyAction);
        applyGroup.add(applyBtn);
        
        // Add at the beginning of the page
        page.add(applyGroup);
    });

    // Wire display tab specific button as well
    if (displayPage._applyMonitorsBtn) {
        displayPage._applyMonitorsBtn.connect('clicked', () => {
            try {
                // Dynamic Monitor copying logic supporting gdm and Debian-gdm dynamically
                let userMonitorsXml = GLib.build_filenamev([GLib.get_user_config_dir(), 'monitors.xml']);
                let script = `#!/bin/bash
USER_MONITORS="${userMonitorsXml}"
if [ -f "$USER_MONITORS" ]; then
    GDM_USER="gdm"
    if id "Debian-gdm" &>/dev/null; then
        GDM_USER="Debian-gdm"
    fi
    GDM_HOME=$(getent passwd "$GDM_USER" | cut -d: -f6)
    mkdir -p "$GDM_HOME/.config"
    install -Dm644 -o "$GDM_USER" "$USER_MONITORS" "$GDM_HOME/.config/monitors.xml"
    # Set monitor scale experimental features under GDM user
    machinectl shell "$GDM_USER"@ /usr/bin/env gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer']" &>/dev/null
    echo "Monitors applied successfully"
else
    echo "No monitors.xml found"
    exit 1
fi
`;
                let file = Gio.File.new_for_path('/tmp/gdm-monitors.sh');
                try { file.delete(null); } catch(e) {}
                let outStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                let dataStream = new Gio.DataOutputStream({ base_stream: outStream });
                dataStream.put_string(script, null);
                dataStream.close(null);
                
                file.set_attribute_uint32('unix::mode', 0o755, Gio.FileQueryInfoFlags.NONE, null);
                
                let proc = Gio.Subprocess.new(
                    ['pkexec', 'bash', '/tmp/gdm-monitors.sh'],
                    Gio.SubprocessFlags.NONE
                );
                
                let toast = new Adw.Toast({ title: T ? T('Applying monitor layout...') : 'Applying monitor layout...' });
                win.add_toast(toast);
                
                proc.wait_async(null, (p, res) => {
                    try {
                        p.wait_finish(res);
                        let successToast = new Adw.Toast({ title: T ? T('Monitor layout applied!') : 'Monitor layout applied!' });
                        win.add_toast(successToast);
                    } catch(e) {
                        let errToast = new Adw.Toast({ title: T ? T('Failed to apply monitor layout.') : 'Failed to apply monitor layout.' });
                        win.add_toast(errToast);
                    }
                });
            } catch(e) {
                log(e);
            }
        });
    }

    // Wire Restore GDM button in Tools Page
    if (toolsPage._restoreBtn) {
        toolsPage._restoreBtn.connect('clicked', () => {
            try {
                let script = `#!/bin/bash
# Remove all GDM custom dconf databases and profiles
rm -f /etc/dconf/db/gdm.d/99-bar-enhanced-gdm
rm -f /etc/dconf/db/gdm.d/95-gdm-settings
rm -f /etc/dconf/db/gdm.d/01-bar-enhanced
rm -f /etc/dconf/profile/gdm
# Remove compiled database and re-compile if there are other files in gdm.d
rm -f /etc/dconf/db/gdm
if [ -d /etc/dconf/db/gdm.d ]; then
    dconf compile /etc/dconf/db/gdm /etc/dconf/db/gdm.d || true
fi

# Remove our custom shell theme
rm -rf /usr/share/themes/BarEnhancedGdm

# Remove copied backgrounds/logos
rm -f /usr/share/backgrounds/bar-enhanced-gdm-bg
rm -f /usr/share/backgrounds/bar-enhanced-gdm-logo

# Remove GDM monitors config
GDM_USER="gdm"
if id "Debian-gdm" &>/dev/null; then
    GDM_USER="Debian-gdm"
fi
GDM_HOME=$(getent passwd "$GDM_USER" | cut -d: -f6)
rm -f "$GDM_HOME/.config/monitors.xml"

echo "GDM restored successfully"
`;
                let file = Gio.File.new_for_path('/tmp/gdm-restore.sh');
                try { file.delete(null); } catch(e) {}
                let outStream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                let dataStream = new Gio.DataOutputStream({ base_stream: outStream });
                dataStream.put_string(script, null);
                dataStream.close(null);
                
                file.set_attribute_uint32('unix::mode', 0o755, Gio.FileQueryInfoFlags.NONE, null);
                
                let proc = Gio.Subprocess.new(
                    ['pkexec', 'bash', '/tmp/gdm-restore.sh'],
                    Gio.SubprocessFlags.NONE
                );
                
                let toast = new Adw.Toast({ title: T ? T('Restoring GDM to default... please authenticate.') : 'Restoring GDM to default... please authenticate.' });
                win.add_toast(toast);
                
                proc.wait_async(null, (p, res) => {
                    try {
                        p.wait_finish(res);
                        let successToast = new Adw.Toast({ title: T ? T('GDM restored to system default!') : 'GDM restored to system default!' });
                        win.add_toast(successToast);
                    } catch(e) {
                        let errToast = new Adw.Toast({ title: T ? T('Failed to restore GDM.') : 'Failed to restore GDM.' });
                        win.add_toast(errToast);
                    }
                });
            } catch(e) {
                log(e);
            }
        });
    }

    win.present();
    return win;
}
