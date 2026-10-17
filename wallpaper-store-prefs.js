import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Soup from 'gi://Soup';
import GdkPixbuf from 'gi://GdkPixbuf';

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
        description: T('Animated (Pling) and 4K Static (4kwallpapers.com).')
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
    const finishCheck = () => {
        completed++;
        if (completed === 2 && !requestState.destroyed && generation === requestState.generation) {
            allWp.sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
            renderWallpaperList(container, loadingLabel, allWp, soupSession, T, settings, requestState);
        }
    };

    const urlPling = `https://api.pling.com/ocs/v1/content/data?search=${encodeURIComponent(term)}&categories=312&sort=rating&pagesize=50&format=json`;
    const msgPling = Soup.Message.new_from_uri('GET', GLib.Uri.parse(urlPling, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msgPling, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            const response = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
            const rawData = response?.data;
            if (rawData) allWp = [...allWp, ...(Array.isArray(rawData) ? rawData : [rawData])];
        } catch (e) { }
        finishCheck();
    });

    const url4k = `https://4kwallpapers.com/?s=${encodeURIComponent(term)}`;
    const msg4k = Soup.Message.new_from_uri('GET', GLib.Uri.parse(url4k, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msg4k, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            const html = new TextDecoder('utf-8').decode(bytes.get_data());
            const regex = /<a[^>]*href="([^"]+\.html)"[^>]*>[\s\S]*?<img itemprop="thumbnail" src="([^"]+)"[^>]*alt="([^"]+)"/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                let pageUrl = match[1];
                let thumb = match[2];
                if (!thumb.startsWith('http')) thumb = 'https://4kwallpapers.com' + thumb;
                let title = match[3].split(',')[0].trim();
                allWp.push({
                    id: pageUrl,
                    name: title,
                    previewpic1: thumb,
                    typeid: 'static-4k',
                    downloadlink1: pageUrl
                });
            }
        } catch (e) { }
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
    const finishCheck = () => {
        completed++;
        if (completed === 2 && !requestState.destroyed && generation === requestState.generation) {
            allWp.sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
            renderWallpaperList(container, loadingLabel, allWp, soupSession, T, settings, requestState);
        }
    };

    const urlPling = `https://api.pling.com/ocs/v1/content/data?categories=312&sort=rating&pagesize=20&format=json`;
    const msgPling = Soup.Message.new_from_uri('GET', GLib.Uri.parse(urlPling, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msgPling, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            const response = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
            const rawData = response?.data;
            if (rawData) allWp = [...allWp, ...(Array.isArray(rawData) ? rawData : [rawData])];
        } catch (e) { }
        finishCheck();
    });

    const url4k = `https://4kwallpapers.com/`;
    const msg4k = Soup.Message.new_from_uri('GET', GLib.Uri.parse(url4k, GLib.UriFlags.NONE));
    soupSession.send_and_read_async(msg4k, GLib.PRIORITY_DEFAULT, null, (s, res) => {
        try {
            const bytes = s.send_and_read_finish(res);
            const html = new TextDecoder('utf-8').decode(bytes.get_data());
            const regex = /<a[^>]*href="([^"]+\.html)"[^>]*>[\s\S]*?<img itemprop="thumbnail" src="([^"]+)"[^>]*alt="([^"]+)"/g;
            let match;
            let count = 0;
            while ((match = regex.exec(html)) !== null && count < 30) {
                let pageUrl = match[1];
                let thumb = match[2];
                if (!thumb.startsWith('http')) thumb = 'https://4kwallpapers.com' + thumb;
                let title = match[3].split(',')[0].trim();
                allWp.push({
                    id: pageUrl,
                    name: title,
                    previewpic1: thumb,
                    typeid: 'static-4k',
                    downloadlink1: pageUrl
                });
                count++;
            }
        } catch (e) { }
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

function renderWallpaperList(container, loadingLabel, data, soupSession, T, settings, requestState) {
    try {
        if (loadingLabel && loadingLabel.get_parent()) container.remove(loadingLabel);
    } catch (e) { }

    if (!data || data.length === 0) {
        const noRes = new Gtk.Label({ label: T('No results found.'), margin_top: 20 });
        container.append(noRes);
        return;
    }

    data.forEach((item) => {
        const name = item.name;
        const link = item.downloadlink1;
        const preview = item.previewpic1 || item.previewpic2;
        if (!item.id && !link) return;

        const typeid = String(item.typeid || '');
        const isAnimated = typeid === '312' || (item.typename && item.typename.toLowerCase().includes('video'));
        const typeLabelText = isAnimated ? T('Animated Video') : T('Static 4K');
        
        let currentUri = settings.get_string('hydro-wallpaper-uri');
        let isApplied = false;
        
        if (typeid === 'static-4k') {
            const fileId = item.id.split('-').pop().replace('.html', '');
            isApplied = currentUri.includes(fileId);
        } else {
            isApplied = currentUri.includes(item.id);
        }

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
            sensitive: !isApplied
        });

        btn.connect('clicked', () => {
            btn.set_sensitive(false);
            btn.set_label(T('Downloading...'));
            const markFailed = () => {
                if (requestState?.destroyed) return;
                btn.set_label(T('Failed'));
                btn.set_sensitive(true);
            };

            const performDownloadAndApply = (downloadUrl, fileIdOverride) => {
                if (!/^https:\/\//i.test(downloadUrl || '')) {
                    markFailed();
                    return;
                }
                let ext = '.jpg';
                if (downloadUrl.includes('.mp4')) ext = '.mp4';
                else if (downloadUrl.includes('.webm')) ext = '.webm';
                else if (downloadUrl.includes('.png')) ext = '.png';
                else if (isAnimated) ext = '.mp4';

                const fileId = String(fileIdOverride || item.id || 'wallpaper')
                    .replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
                const wpDir = GLib.get_home_dir() + '/.local/share/backgrounds/bar-enhanced';
                GLib.mkdir_with_parents(wpDir, 0o755);
                
                const finalFile = `${wpDir}/${fileId}_${name.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;

                if (Gio.File.new_for_path(finalFile).query_exists(null)) {
                    applyWallpaper(finalFile, isAnimated ? 'video' : 'image', settings, btn, T);
                    return;
                }

                const partialFile = `${finalFile}.part`;
                const partial = Gio.File.new_for_path(partialFile);
                try { partial.delete(null); } catch (e) {}
                const proc = Gio.Subprocess.new(
                    ['curl', '--fail', '--location', '--output', partialFile, downloadUrl],
                    Gio.SubprocessFlags.NONE
                );

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
                        applyWallpaper(finalFile, isAnimated ? 'video' : 'image', settings, btn, T);
                    } catch (e) {
                        try { partial.delete(null); } catch (deleteError) {}
                        markFailed();
                    }
                });
            };

            if (typeid === 'static-4k') {
                const msg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(link, GLib.UriFlags.NONE));
                soupSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                    try {
                        const bytes = s.send_and_read_finish(res);
                        const html = new TextDecoder('utf-8').decode(bytes.get_data());
                        const dlRegex = /<a[^>]*href="(\/images\/wallpapers\/[^"]+)"[^>]*id="resolution"/;
                        const match = dlRegex.exec(html);
                        
                        if (match && match[1]) {
                            let finalLink = match[1];
                            if (!finalLink.startsWith('http')) finalLink = 'https://4kwallpapers.com' + finalLink;
                            const fileId = item.id.split('-').pop().replace('.html', '');
                            performDownloadAndApply(finalLink, fileId);
                        } else {
                            markFailed();
                        }
                    } catch (err) {
                        markFailed();
                    }
                });
            } else if (item.id) {
                const downloadApiUrl = `https://api.pling.com/ocs/v1/content/download/${item.id}/1?format=json`;
                const msg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(downloadApiUrl, GLib.UriFlags.NONE));
                soupSession.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                    try {
                        const bytes = s.send_and_read_finish(res);
                        const resp = JSON.parse(new TextDecoder('utf-8').decode(bytes.get_data()));
                        let realLink = resp?.data?.[0]?.downloadlink || resp?.data?.downloadlink;
                        if (!realLink && resp?.ocs?.data) {
                            realLink = resp.ocs.data.downloadlink || resp.ocs.data.link;
                        }
                        if (realLink) performDownloadAndApply(realLink);
                        else performDownloadAndApply(link || `https://www.pling.com/p/${item.id}/dw/`);
                    } catch (err) {
                        performDownloadAndApply(link || `https://www.pling.com/p/${item.id}/dw/`);
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
