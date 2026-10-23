import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Soup from 'gi://Soup';
import GdkPixbuf from 'gi://GdkPixbuf';

// Pling's typeid is a category number (312 currently includes JPGs, archives,
// and videos), not a media type. Only apply formats our wallpaper manager can
// handle, based on the actual download URL.
export function wallpaperMediaFromUrl(url) {
    if (!/^https:\/\//i.test(url || ''))
        return null;
    let path;
    try {
        path = GLib.Uri.parse(url, GLib.UriFlags.NONE).get_path().toLowerCase();
    } catch (e) {
        return null;
    }
    const match = /\.(jpe?g|png|webp|mp4|webm)$/.exec(path);
    if (!match)
        return null;
    return {
        type: ['mp4', 'webm'].includes(match[1]) ? 'video' : 'image',
        extension: `.${match[1]}`,
    };
}

export function openWallpaperStoreModal(parent, settings, T, soupSession) {
    const storeWindow = new Adw.Window({
        title: T('Wallpaper Store'),
        modal: true,
        transient_for: parent,
        default_width: 780,
        default_height: 650
    });
    const toolbarView = new Adw.ToolbarView();
    const header = new Adw.HeaderBar();
    toolbarView.add_top_bar(header);

    const mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });

    const searchBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        margin_start: 24, margin_end: 24, margin_top: 12, margin_bottom: 6
    });
    const searchBar = new Gtk.SearchEntry({ placeholder_text: T('Search wallpapers...') });
    searchBox.append(searchBar);
    mainBox.append(searchBox);

    const scroll = new Gtk.ScrolledWindow({
        vexpand: true, hexpand: true, min_content_height: 500, propagate_natural_height: true
    });

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
        title: T('Featured Wallpapers'),
        description: T('Downloadable wallpapers from Pling. Unsupported formats are unavailable.')
    });

    const wpContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 });
    group.add(wpContainer);

    const loadingLabel = new Gtk.Label({ label: T('Loading wallpapers...'), margin_top: 20 });
    wpContainer.append(loadingLabel);

    let searchTimeoutId = null;
    // A search response may arrive after another search, or after this window
    // was destroyed. Only the newest request may mutate the GTK widget tree.
    const requestState = { generation: 0, destroyed: false };
    searchBar.connect('search-changed', () => {
        const term = searchBar.get_text();
        if (searchTimeoutId) GLib.Source.remove(searchTimeoutId);
        if (term.length === 0) {
            fetchOnlineWallpapers(wpContainer, loadingLabel, soupSession, T, settings, requestState);
        } else if (term.length > 2) {
            searchTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                searchOnlineWallpapers(wpContainer, term, soupSession, T, settings, requestState);
                searchTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    });

    searchBar.connect('activate', () => {
        const term = searchBar.get_text();
        if (term.length > 2) searchOnlineWallpapers(wpContainer, term, soupSession, T, settings, requestState);
    });

    page.add(group);
    scroll.set_child(page);
    mainBox.append(scroll);

    toolbarView.set_content(mainBox);
    storeWindow.set_content(toolbarView);

    storeWindow.connect('destroy', () => {
        requestState.destroyed = true;
        if (searchTimeoutId) {
            GLib.Source.remove(searchTimeoutId);
            searchTimeoutId = null;
        }
    });

    fetchOnlineWallpapers(wpContainer, loadingLabel, soupSession, T, settings, requestState);
    storeWindow.present();
}

function searchOnlineWallpapers(container, term, soupSession, T, settings, requestState) {
    const generation = ++requestState.generation;
    _clearContainer(container);
    const loadingLabel = new Gtk.Label({ label: T('Searching...') });
    container.append(loadingLabel);

    let allWp = [];
    let completed = 0;
    let loadFailed = false;
    const finishCheck = () => {
        completed++;
        if (completed === 1 && !requestState.destroyed && generation === requestState.generation) {
            allWp.sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
            renderWallpaperList(container, loadingLabel, allWp, soupSession, T, settings, requestState, loadFailed);
        }
    };

    const urlPling = `https://api.pling.com/ocs/v1/content/data?search=${encodeURIComponent(term)}&categories=312&sort=rating&pagesize=50&format=json`;
    const msgPling = Soup.Message.new_from_uri('GET', GLib.Uri.parse(urlPling, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msgPling, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            if (msgPling.get_status() !== Soup.Status.OK)
                throw new Error(`HTTP ${msgPling.get_status()}`);
            const response = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
            const rawData = response?.data;
            if (rawData) allWp = [...allWp, ...(Array.isArray(rawData) ? rawData : [rawData])];
        } catch (e) { loadFailed = true; console.warn(`Bar Enhanced wallpaper search failed: ${e}`); }
        finishCheck();
    });

}

function fetchOnlineWallpapers(container, loadingLabel, soupSession, T, settings, requestState) {
    const generation = ++requestState.generation;
    _clearContainer(container);
    if (loadingLabel && !loadingLabel.get_parent()) {
        container.append(loadingLabel);
        loadingLabel.set_label(T('Loading wallpapers...'));
    }

    let allWp = [];
    let completed = 0;
    let loadFailed = false;
    const finishCheck = () => {
        completed++;
        if (completed === 1 && !requestState.destroyed && generation === requestState.generation) {
            allWp.sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
            renderWallpaperList(container, loadingLabel, allWp, soupSession, T, settings, requestState, loadFailed);
        }
    };

    const urlPling = `https://api.pling.com/ocs/v1/content/data?categories=312&sort=rating&pagesize=20&format=json`;
    const msgPling = Soup.Message.new_from_uri('GET', GLib.Uri.parse(urlPling, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msgPling, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            if (msgPling.get_status() !== Soup.Status.OK)
                throw new Error(`HTTP ${msgPling.get_status()}`);
            const response = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
            const rawData = response?.data;
            if (rawData) allWp = [...allWp, ...(Array.isArray(rawData) ? rawData : [rawData])];
        } catch (e) { loadFailed = true; console.warn(`Bar Enhanced wallpaper catalog failed: ${e}`); }
        finishCheck();
    });

}

function _clearContainer(container) {
    let child = container.get_first_child();
    while (child) {
        let next = child.get_next_sibling();
        container.remove(child);
        child = next;
    }
}

function renderWallpaperList(container, loadingLabel, data, soupSession, T, settings, requestState, loadFailed = false) {
    try {
        if (loadingLabel && loadingLabel.get_parent()) container.remove(loadingLabel);
    } catch (e) { }

    if (!data || data.length === 0) {
        const noRes = new Gtk.Label({ label: loadFailed ? T('Wallpaper provider unavailable. Try again later.') : T('No results found.'), margin_top: 20 });
        container.append(noRes);
        return;
    }

    data.forEach((item) => {
        const name = item.name;
        const link = item.downloadlink1;
        const preview = item.previewpic1 || item.previewpic2;
        if (!item.id && !link) return;

        const listedMedia = wallpaperMediaFromUrl(link);
        const typeLabelText = listedMedia?.type === 'video' ? T('Animated Video') :
            listedMedia ? T('Static Image') : T('Unsupported format');
        
        let currentUri = settings.get_string('hydro-wallpaper-uri');
        let isApplied = false;
        
        isApplied = currentUri.includes(item.id);

        const row = new Adw.ActionRow({
            title: name,
            subtitle: `${typeLabelText} ${item.rating ? '• ⭐ ' + item.rating : ''}`
        });

        const picture = new Gtk.Image({
            pixel_size: 96, margin_end: 12, halign: Gtk.Align.START, valign: Gtk.Align.CENTER,
            icon_name: 'image-missing-symbolic'
        });
        row.add_prefix(picture);

        if (preview) {
            const imgMsg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(preview, GLib.UriFlags.NONE));
            soupSession.send_and_read_async(imgMsg, GLib.PRIORITY_DEFAULT, null, (s, r) => {
                try {
                    if (requestState?.destroyed) return;
                    const bytes = s.send_and_read_finish(r);
                    const stream = Gio.MemoryInputStream.new_from_bytes(bytes);
                    const pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale(stream, 128, 72, true, null);
                    const paintable = Gdk.Texture.new_for_pixbuf(pixbuf);
                    picture.set_from_paintable(paintable);
                } catch (e) { }
            });
        }

        const btn = new Gtk.Button({
            label: isApplied ? T('Applied') : T('Apply'),
            valign: Gtk.Align.CENTER,
            css_classes: isApplied ? ['pill', 'flat'] : ['pill', 'suggested-action'],
            sensitive: !isApplied && !!listedMedia
        });

        btn.connect('clicked', () => {
            btn.set_sensitive(false);
            btn.set_label(T('Downloading...'));
            const markFailed = (error) => {
                if (error)
                    console.warn(`Bar Enhanced wallpaper download failed: ${error}`);
                if (requestState?.destroyed) return;
                btn.set_label(T('Failed'));
                btn.set_tooltip_text(error ? String(error) : T('Download failed'));
                btn.set_sensitive(true);
            };

            const performDownloadAndApply = (downloadUrl, fileIdOverride) => {
                const media = wallpaperMediaFromUrl(downloadUrl);
                if (!media) {
                    markFailed(T('Unsupported wallpaper format or download link'));
                    return;
                }

                const fileId = String(fileIdOverride || item.id || 'wallpaper')
                    .replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
                const wpDir = GLib.get_home_dir() + '/.local/share/backgrounds/bar-enhanced';
                GLib.mkdir_with_parents(wpDir, 0o755);
                
                const finalFile = `${wpDir}/${fileId}_${name.replace(/[^a-zA-Z0-9]/g, '_')}${media.extension}`;

                if (Gio.File.new_for_path(finalFile).query_exists(null)) {
                    applyWallpaper(finalFile, media.type, settings, btn, T);
                    return;
                }

                const partialFile = `${finalFile}.part`;
                const partial = Gio.File.new_for_path(partialFile);
                try { partial.delete(null); } catch (e) {}
                let proc;
                try {
                    proc = Gio.Subprocess.new(
                        ['curl', '--fail', '--location', '--output', partialFile,
                            '--connect-timeout', '10', '--max-time', '120',
                            '--max-filesize', '524288000', '--silent', '--show-error', downloadUrl],
                        Gio.SubprocessFlags.NONE
                    );
                } catch (e) {
                    markFailed(e);
                    return;
                }

                proc.wait_async(null, (p, res) => {
                    try {
                        p.wait_finish(res);
                        if (!p.get_successful())
                            throw new Error(`curl exited with status ${p.get_exit_status()}`);
                        const info = partial.query_info(
                            Gio.FILE_ATTRIBUTE_STANDARD_SIZE,
                            Gio.FileQueryInfoFlags.NONE,
                            null
                        );
                        if (!info || info.get_size() === 0)
                            throw new Error('Downloaded wallpaper is empty');
                        partial.move(
                            Gio.File.new_for_path(finalFile),
                            Gio.FileCopyFlags.OVERWRITE,
                            null,
                            null
                        );
                        if (requestState?.destroyed) return;
                        applyWallpaper(finalFile, media.type, settings, btn, T);
                    } catch (e) {
                        try { partial.delete(null); } catch (deleteError) {}
                        markFailed(e);
                    }
                });
            };

            if (item.id) {
                const downloadApiUrl = `https://api.pling.com/ocs/v1/content/download/${item.id}/1?format=json`;
                let msg;
                try {
                    msg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(downloadApiUrl, GLib.UriFlags.NONE));
                } catch (e) {
                    markFailed(e);
                    return;
                }
                const cancellable = new Gio.Cancellable();
                let timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
                    timeoutId = 0;
                    cancellable.cancel();
                    return GLib.SOURCE_REMOVE;
                });
                soupSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, cancellable, (s, res) => {
                    if (timeoutId)
                        GLib.Source.remove(timeoutId);
                    try {
                        const bytes = s.send_and_read_finish(res);
                        const resp = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
                        let realLink = resp?.data?.[0]?.downloadlink || resp?.data?.downloadlink;
                        if (!realLink && resp?.ocs?.data) {
                            realLink = resp.ocs.data.downloadlink || resp.ocs.data.link;
                        }
                        performDownloadAndApply(realLink || link);
                    } catch (err) {
                        performDownloadAndApply(link);
                    }
                });
            } else {
                performDownloadAndApply(link);
            }
        });
        row.add_suffix(btn);
        container.append(row);
    });
}

function applyWallpaper(filePath, type, settings, btn, T) {
    settings.set_string('hydro-wallpaper-uri', filePath);
    settings.set_string('hydro-wallpaper-type', type);
    settings.set_boolean('hydro-wallpaper-enabled', true);
    
    if (type === 'image' || filePath.endsWith('.png') || filePath.endsWith('.jpg')) {
        const bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        const uri = Gio.File.new_for_path(filePath).get_uri();
        bgSettings.set_string('picture-uri', uri);
        bgSettings.set_string('picture-uri-dark', uri);
    }

    btn.set_label(T('Applied'));
    btn.add_css_class('flat');
}
