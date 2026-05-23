import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';

function scanThemes(dirs, checkSubdir = null) {
    let list = ['Default'];
    for (let path of dirs) {
        try {
            let dir = Gio.File.new_for_path(path);
            if (!dir.query_exists(null)) continue;
            let enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                    let name = info.get_name();
                    if (name.startsWith('.') || name === 'Default') continue;
                    
                    if (checkSubdir) {
                        let sub = Gio.File.new_for_path(`${path}/${name}/${checkSubdir}`);
                        if (!sub.query_exists(null)) continue;
                    }
                    if (!list.includes(name)) {
                        list.push(name);
                    }
                }
            }
        } catch (e) {
            console.error(`BarEnhanced: Error scanning themes in ${path}:`, e);
        }
    }
    return list;
}

export function buildAppearanceTab(extension, extensionPath, T) {
    const page = new Adw.PreferencesPage({
        title: T ? T('Appearance') : 'Appearance',
        icon_name: 'preferences-desktop-wallpaper-symbolic'
    });

    const settings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.appearance');

    const themeGroup = new Adw.PreferencesGroup({ title: T ? T('Theme') : 'Theme' });
    page.add(themeGroup);

    // Accent Color
    const accents = ['blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'slate'];
    const accentModel = Gtk.StringList.new(accents);
    const accentRow = new Adw.ComboRow({
        title: T ? T('Accent Color') : 'Accent Color',
        model: accentModel
    });
    let activeAccent = settings.get_string('accent-color');
    let accentIdx = accents.indexOf(activeAccent);
    if (accentIdx !== -1) accentRow.selected = accentIdx;
    accentRow.connect('notify::selected', () => {
        settings.set_string('accent-color', accents[accentRow.selected]);
    });
    themeGroup.add(accentRow);

    // Light Mode
    const lightModeRow = new Adw.SwitchRow({ title: T ? T('Light Mode') : 'Light Mode' });
    settings.bind('light-mode', lightModeRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    themeGroup.add(lightModeRow);

    // Dynamic Theme Scanners
    const homeDir = GLib.get_home_dir();
    const dataDir = GLib.get_user_data_dir();

    const shellThemeDirs = [
        '/usr/share/themes',
        `${homeDir}/.themes`,
        `${dataDir}/themes`
    ];
    const shellThemes = scanThemes(shellThemeDirs, 'gnome-shell');

    const iconThemeDirs = [
        '/usr/share/icons',
        `${homeDir}/.icons`,
        `${dataDir}/icons`
    ];
    const iconThemes = scanThemes(iconThemeDirs);
    const cursorThemes = scanThemes(iconThemeDirs, 'cursors');

    // Shell Theme
    const shellThemeModel = Gtk.StringList.new(shellThemes);
    const shellThemeRow = new Adw.ComboRow({
        title: T ? T('Shell Theme') : 'Shell Theme',
        model: shellThemeModel
    });
    let activeShellTheme = settings.get_string('shell-theme') || 'Default';
    let shellIdx = shellThemes.indexOf(activeShellTheme);
    if (shellIdx !== -1) {
        shellThemeRow.selected = shellIdx;
    } else {
        shellThemes.push(activeShellTheme);
        shellThemeModel.append(activeShellTheme);
        shellThemeRow.selected = shellThemes.length - 1;
    }
    shellThemeRow.connect('notify::selected', () => {
        settings.set_string('shell-theme', shellThemes[shellThemeRow.selected]);
    });
    themeGroup.add(shellThemeRow);

    // Icon Theme
    const iconThemeModel = Gtk.StringList.new(iconThemes);
    const iconThemeRow = new Adw.ComboRow({
        title: T ? T('Icon Theme') : 'Icon Theme',
        model: iconThemeModel
    });
    let activeIconTheme = settings.get_string('icon-theme') || 'Default';
    let iconIdx = iconThemes.indexOf(activeIconTheme);
    if (iconIdx !== -1) {
        iconThemeRow.selected = iconIdx;
    } else {
        iconThemes.push(activeIconTheme);
        iconThemeModel.append(activeIconTheme);
        iconThemeRow.selected = iconThemes.length - 1;
    }
    iconThemeRow.connect('notify::selected', () => {
        settings.set_string('icon-theme', iconThemes[iconThemeRow.selected]);
    });
    themeGroup.add(iconThemeRow);

    // Cursor Theme
    const cursorThemeModel = Gtk.StringList.new(cursorThemes);
    const cursorThemeRow = new Adw.ComboRow({
        title: T ? T('Cursor Theme') : 'Cursor Theme',
        model: cursorThemeModel
    });
    let activeCursorTheme = settings.get_string('cursor-theme') || 'Default';
    let cursorIdx = cursorThemes.indexOf(activeCursorTheme);
    if (cursorIdx !== -1) {
        cursorThemeRow.selected = cursorIdx;
    } else {
        cursorThemes.push(activeCursorTheme);
        cursorThemeModel.append(activeCursorTheme);
        cursorThemeRow.selected = cursorThemes.length - 1;
    }
    cursorThemeRow.connect('notify::selected', () => {
        settings.set_string('cursor-theme', cursorThemes[cursorThemeRow.selected]);
    });
    themeGroup.add(cursorThemeRow);


    const bgGroup = new Adw.PreferencesGroup({ title: T ? T('Background') : 'Background' });
    page.add(bgGroup);

    // Background Type
    const bgTypes = ['default', 'image', 'color'];
    const bgTypeModel = Gtk.StringList.new(bgTypes);
    const bgTypeRow = new Adw.ComboRow({
        title: T ? T('Background Type') : 'Background Type',
        model: bgTypeModel
    });
    let activeBgType = settings.get_string('background-type');
    let bgTypeIdx = bgTypes.indexOf(activeBgType);
    if (bgTypeIdx !== -1) bgTypeRow.selected = bgTypeIdx;
    
    bgGroup.add(bgTypeRow);

    // Background Image
    const bgImageRow = new Adw.EntryRow({ title: T ? T('Background Image Path') : 'Background Image Path' });
    settings.bind('background-image', bgImageRow, 'text', Gio.SettingsBindFlags.DEFAULT);
    
    const selectWallBtn = new Gtk.Button({
        label: T ? T('Select Image...') : 'Select Image...',
        valign: Gtk.Align.CENTER,
        css_classes: ['flat']
    });
    selectWallBtn.connect('clicked', () => {
        const dialog = new Gtk.FileDialog({
            title: T ? T('Select Login Background Wallpaper') : 'Select Login Background Wallpaper',
            modal: true
        });
        const filters = new Gio.ListStore({ item_type: Gtk.FileFilter });
        const imgFilter = new Gtk.FileFilter();
        imgFilter.set_name(T ? T('Images') : 'Images');
        imgFilter.add_mime_type('image/*');
        filters.append(imgFilter);
        dialog.set_filters(filters);

        dialog.open(null, null, (d, res) => {
            try {
                let file = d.open_finish(res);
                if (file) {
                    bgImageRow.set_text(file.get_path());
                }
            } catch(e) {}
        });
    });
    bgImageRow.add_suffix(selectWallBtn);
    bgGroup.add(bgImageRow);

    // Background Adjustment
    const bgAdjs = ['zoom', 'repeat'];
    const bgAdjModel = Gtk.StringList.new(bgAdjs);
    const bgAdjRow = new Adw.ComboRow({
        title: T ? T('Image Adjustment') : 'Image Adjustment',
        model: bgAdjModel
    });
    let activeBgAdj = settings.get_string('bg-adjustment');
    let bgAdjIdx = bgAdjs.indexOf(activeBgAdj);
    if (bgAdjIdx !== -1) bgAdjRow.selected = bgAdjIdx;
    bgAdjRow.connect('notify::selected', () => {
        settings.set_string('bg-adjustment', bgAdjs[bgAdjRow.selected]);
    });
    bgGroup.add(bgAdjRow);

    // Background Color
    const bgColorBtn = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            title: T ? T('Select Background Color') : 'Select Background Color',
            modal: true
        }),
        valign: Gtk.Align.CENTER
    });
    let initColorStr = settings.get_string('background-color');
    let initColor = new Gdk.RGBA();
    if (initColor.parse(initColorStr)) {
        bgColorBtn.rgba = initColor;
    }
    bgColorBtn.connect('notify::rgba', (btn) => {
        settings.set_string('background-color', btn.rgba.to_string());
    });
    settings.connect('changed::background-color', () => {
        let currentVal = settings.get_string('background-color');
        let parsed = new Gdk.RGBA();
        if (parsed.parse(currentVal)) {
            bgColorBtn.rgba = parsed;
        }
    });

    const bgColorRow = new Adw.ActionRow({
        title: T ? T('Background Color') : 'Background Color',
        activatable_widget: bgColorBtn
    });
    bgColorRow.add_suffix(bgColorBtn);
    bgGroup.add(bgColorRow);

    // Background Blur
    const bgBlurRow = new Adw.SwitchRow({
        title: T ? T('Blur Background Image') : 'Blur Background Image',
        subtitle: T ? T('Applies a Gaussian blur to the GDM background image') : 'Applies a Gaussian blur to the GDM background image'
    });
    settings.bind('blur-background', bgBlurRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    bgGroup.add(bgBlurRow);

    const bgBlurValBtn = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 100, step_increment: 1, page_increment: 10 }),
        valign: Gtk.Align.CENTER,
        digits: 0
    });
    const bgBlurValRow = new Adw.ActionRow({
        title: T ? T('Blur Radius') : 'Blur Radius',
        subtitle: T ? T('Adjust the amount of background blur (0 to 100)') : 'Adjust the amount of background blur (0 to 100)',
        activatable_widget: bgBlurValBtn
    });
    bgBlurValRow.add_suffix(bgBlurValBtn);
    settings.bind('blur-background-value', bgBlurValBtn, 'value', Gio.SettingsBindFlags.DEFAULT);
    bgGroup.add(bgBlurValRow);

    // Helper visibility binds
    const updateBgRowVisibilities = () => {
        let selectedType = bgTypes[bgTypeRow.selected];
        let isImage = (selectedType === 'image');
        bgImageRow.visible = isImage;
        bgAdjRow.visible = isImage;
        bgBlurRow.visible = isImage;
        bgBlurValRow.visible = isImage && bgBlurRow.active;
        bgColorRow.visible = (selectedType === 'color');
    };
    bgTypeRow.connect('notify::selected', () => {
        settings.set_string('background-type', bgTypes[bgTypeRow.selected]);
        updateBgRowVisibilities();
    });
    bgBlurRow.connect('notify::active', () => {
        updateBgRowVisibilities();
    });
    updateBgRowVisibilities();

    // Password Dialog Card Customization
    const lockGroup = new Adw.PreferencesGroup({ title: T ? T('Password Dialog Card Customization') : 'Password Dialog Card Customization' });
    page.add(lockGroup);

    const miscSettings = extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.misc');

    const customAuthBoxRow = new Adw.SwitchRow({
        title: T ? T('Enable Custom Password Box Style') : 'Enable Custom Password Box Style',
        subtitle: T ? T('Make GDM password entry box transparent with custom color') : 'Make GDM password entry box transparent with custom color'
    });
    miscSettings.bind('enable-custom-auth-box', customAuthBoxRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    lockGroup.add(customAuthBoxRow);

    const authBoxColorBtn = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            title: T ? T('Select Password Box Color') : 'Select Password Box Color',
            modal: true
        }),
        valign: Gtk.Align.CENTER
    });
    let initAuthColorStr = miscSettings.get_string('auth-box-color');
    let initAuthColor = new Gdk.RGBA();
    if (initAuthColor.parse(initAuthColorStr)) {
        authBoxColorBtn.rgba = initAuthColor;
    }
    authBoxColorBtn.connect('notify::rgba', (btn) => {
        miscSettings.set_string('auth-box-color', btn.rgba.to_string());
    });
    miscSettings.connect('changed::auth-box-color', () => {
        let currentVal = miscSettings.get_string('auth-box-color');
        let parsed = new Gdk.RGBA();
        if (parsed.parse(currentVal)) {
            authBoxColorBtn.rgba = parsed;
        }
    });

    const authBoxColorRow = new Adw.ActionRow({
        title: T ? T('Password Box Color') : 'Password Box Color',
        activatable_widget: authBoxColorBtn
    });
    authBoxColorRow.add_suffix(authBoxColorBtn);
    customAuthBoxRow.bind_property('active', authBoxColorRow, 'sensitive', 0);
    lockGroup.add(authBoxColorRow);

    const authBoxOpacityRow = new Adw.ActionRow({
        title: T ? T('Password Box Opacity') : 'Password Box Opacity',
        subtitle: T ? T('Control transparency level (0% to 100%)') : 'Control transparency level (0% to 100%)'
    });
    const opacityScale = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: new Gtk.Adjustment({ lower: 0, upper: 100, step_increment: 1, page_increment: 10 }),
        valign: Gtk.Align.CENTER,
        hexpand: true,
        draw_value: true
    });
    opacityScale.set_size_request(150, -1);
    miscSettings.bind('auth-box-opacity', opacityScale.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);
    authBoxOpacityRow.add_suffix(opacityScale);
    customAuthBoxRow.bind_property('active', authBoxOpacityRow, 'sensitive', 0);
    lockGroup.add(authBoxOpacityRow);

    const blurRow = new Adw.SwitchRow({
        title: T ? T('Enable Background Blur') : 'Enable Background Blur',
        subtitle: T ? T('Apply dynamic frosted glass blur to GDM login card') : 'Apply dynamic frosted glass blur to GDM login card'
    });
    miscSettings.bind('auth-box-blur', blurRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    customAuthBoxRow.bind_property('active', blurRow, 'sensitive', 0);
    lockGroup.add(blurRow);

    return page;
}
