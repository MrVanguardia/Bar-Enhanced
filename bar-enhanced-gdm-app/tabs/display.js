import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

export function buildDisplayTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Display') : 'Display',
        icon_name: 'video-display-symbolic'
    });

    const group = new Adw.PreferencesGroup({
        title: T ? T('Monitors Configuration') : 'Monitors Configuration',
        description: T ? T('Apply your current display configuration (resolution, scaling, layout) to the GDM login screen.') : 'Apply your current display configuration (resolution, scaling, layout) to the GDM login screen.'
    });
    page.add(group);

    const applyMonitorsBtn = new Gtk.Button({
        label: T ? T('Apply Current Display Settings to GDM') : 'Apply Current Display Settings to GDM',
        css_classes: ['suggested-action'],
        margin_top: 12,
        margin_bottom: 12,
        halign: Gtk.Align.CENTER
    });
    group.add(applyMonitorsBtn);

    // Attach to page for main.js to connect
    page._applyMonitorsBtn = applyMonitorsBtn;

    return page;
}
