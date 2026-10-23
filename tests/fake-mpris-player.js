// Local-only MPRIS fixture for an isolated GNOME Shell smoke test.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Soup from 'gi://Soup?version=3.0';

const connection = Gio.bus_get_sync(Gio.BusType.SESSION, null);
const artMode = GLib.getenv('BAR_ENHANCED_TEST_ART_MODE') || 'file';
const artFile = Gio.File.new_for_path(GLib.build_filenamev([
    GLib.get_user_cache_dir(), 'bar-enhanced-mpris-test-art.png',
]));
const pixbuf = new GdkPixbuf.Pixbuf({
    colorspace: GdkPixbuf.Colorspace.RGB,
    has_alpha: true,
    bits_per_sample: 8,
    width: 1,
    height: 1,
});
pixbuf.fill(0x3498dbff);
pixbuf.savev(artFile.get_path(), 'png', [], []);
let trackFile = null;
if (artMode === 'thumbnail' || artMode === 'thumbnail-rewrite' || artMode === 'thumbnail-stale' ||
    artMode === 'thumbnail-stale-cache') {
    trackFile = Gio.File.new_for_path(GLib.build_filenamev([
        GLib.get_user_cache_dir(), 'bar-enhanced-mpris-test-track.mp3',
    ]));
    GLib.file_set_contents(trackFile.get_path(), 'test track');
    const thumbDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'thumbnails', 'normal']);
    GLib.mkdir_with_parents(thumbDir, 0o700);
    const thumbHash = GLib.compute_checksum_for_string(
        GLib.ChecksumType.MD5, trackFile.get_uri(), -1);
    const modified = trackFile.query_info(Gio.FILE_ATTRIBUTE_TIME_MODIFIED,
        Gio.FileQueryInfoFlags.NONE, null)
        .get_attribute_uint64(Gio.FILE_ATTRIBUTE_TIME_MODIFIED).toString();
    pixbuf.savev(GLib.build_filenamev([thumbDir, `${thumbHash}.png`]), 'png',
        ['tEXt::Thumb::URI', 'tEXt::Thumb::MTime'],
        [trackFile.get_uri(), artMode === 'thumbnail' || artMode === 'thumbnail-rewrite' ? modified : '0']);
    if (artMode === 'thumbnail-stale-cache') {
        const artCacheDir = GLib.build_filenamev([
            GLib.get_user_cache_dir(), 'dynamic-music-pill', 'art',
        ]);
        GLib.mkdir_with_parents(artCacheDir, 0o700);
        const ownHash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5,
            trackFile.get_uri().replace('file://', ''), -1);
        pixbuf.savev(GLib.build_filenamev([artCacheDir, `${ownHash}.png`]), 'png', [], []);
    }
}
let httpArtUrl = null;
if (artMode === 'http' || artMode === 'http-switch' ||
    artMode === 'http-preseed' || artMode === 'http-cache-delete') {
    const [, imageBytes] = artFile.load_contents(null);
    const server = new Soup.Server();
    let requests = 0;
    server.add_handler('/art.png', (_server, message) => {
        print('MPRIS test artwork HTTP request');
        requests++;
        server.pause_message(message);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
            message.set_status(Soup.Status.OK, null);
            message.set_response('image/png', Soup.MemoryUse.COPY, imageBytes);
            server.unpause_message(message);
            return GLib.SOURCE_REMOVE;
        });
        if (artMode === 'http-switch' && requests === 1) {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1250, () => {
                httpArtUrl += '?variant=2';
                emitMetadataUpdate();
                print('MPRIS test artwork URL switched');
                return GLib.SOURCE_REMOVE;
            });
        }
    });
    server.listen_local(0, Soup.ServerListenOptions.IPV4_ONLY);
    httpArtUrl = server.get_uris()[0].to_string() + 'art.png';
    const artCacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'dynamic-music-pill', 'art']);
    GLib.mkdir_with_parents(artCacheDir, 0o700);
    const cacheHash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5,
        `${httpArtUrl}|Bar Enhanced Integration Track|Test Artist`, -1);
    GLib.file_set_contents(GLib.build_filenamev([artCacheDir, `${cacheHash}.png`]),
        artMode === 'http-preseed' || artMode === 'http-cache-delete'
            ? imageBytes : new Uint8Array());
}

const rootXml = `<node>
  <interface name="org.mpris.MediaPlayer2">
    <property name="Identity" type="s" access="read"/>
    <property name="DesktopEntry" type="s" access="read"/>
  </interface>
</node>`;
const playerXml = `<node>
  <interface name="org.mpris.MediaPlayer2.Player">
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="CanControl" type="b" access="read"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanPause" type="b" access="read"/>
    <property name="CanGoNext" type="b" access="read"/>
    <property name="CanGoPrevious" type="b" access="read"/>
  </interface>
</node>`;

const player = {
    get Identity() { return 'Bar Enhanced Test Player'; },
    get DesktopEntry() { return 'bar-enhanced-mpris-test'; },
    get PlaybackStatus() { return 'Playing'; },
    get Metadata() {
        const metadata = {
            'xesam:title': new GLib.Variant('s', 'Bar Enhanced Integration Track'),
            'xesam:artist': new GLib.Variant('as', ['Test Artist']),
        };
        if (artMode === 'file' || artMode === 'file-rewrite')
            metadata['mpris:artUrl'] = new GLib.Variant('s', artFile.get_uri());
        else if (artMode === 'http' || artMode === 'http-switch' ||
            artMode === 'http-preseed' || artMode === 'http-cache-delete')
            metadata['mpris:artUrl'] = new GLib.Variant('s', httpArtUrl);
        else if (artMode === 'data') {
            const [, imageBytes] = artFile.load_contents(null);
            metadata['mpris:artUrl'] = new GLib.Variant('s',
                `data:image/png;base64,${GLib.base64_encode(imageBytes)}`);
        }
        if (trackFile)
            metadata['xesam:url'] = new GLib.Variant('s', trackFile.get_uri());
        return metadata;
    },
    get CanControl() { return true; },
    get CanPlay() { return true; },
    get CanPause() { return true; },
    get CanGoNext() { return false; },
    get CanGoPrevious() { return false; },
};

function emitMetadataUpdate() {
    connection.emit_signal(null, '/org/mpris/MediaPlayer2',
        'org.freedesktop.DBus.Properties', 'PropertiesChanged',
        new GLib.Variant('(sa{sv}as)', [
            'org.mpris.MediaPlayer2.Player',
            {Metadata: new GLib.Variant('a{sv}', player.Metadata)},
            [],
        ]));
    print('MPRIS test property update');
}

const rootExport = Gio.DBusExportedObject.wrapJSObject(rootXml, player);
const playerExport = Gio.DBusExportedObject.wrapJSObject(playerXml, player);
rootExport.export(connection, '/org/mpris/MediaPlayer2');
playerExport.export(connection, '/org/mpris/MediaPlayer2');
Gio.bus_own_name_on_connection(connection,
    'org.mpris.MediaPlayer2.BarEnhancedIntegrationTest',
    Gio.BusNameOwnerFlags.NONE, null, null);
if (artMode === 'file-rewrite') {
    const artCacheDir = Gio.File.new_for_path(GLib.build_filenamev([
        GLib.get_user_cache_dir(), 'dynamic-music-pill', 'art',
    ]));
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
        let cacheReady = false;
        try {
            const enumerator = artCacheDir.enumerate_children('standard::name,standard::size',
                Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null))) {
                if (info.get_name().endsWith('.png') && !info.get_name().startsWith('hist_') &&
                    info.get_size() > 0) {
                    cacheReady = true;
                    break;
                }
            }
            enumerator.close(null);
        } catch (e) { }
        if (!cacheReady)
            return GLib.SOURCE_CONTINUE;

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            pixbuf.fill(0xe74c3cff);
            pixbuf.savev(artFile.get_path(), 'png', [], []);
            print('MPRIS test source art rewritten');
            return GLib.SOURCE_REMOVE;
        });
        return GLib.SOURCE_REMOVE;
    });
}
if (artMode === 'thumbnail-rewrite') {
    const ownHash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5,
        trackFile.get_uri().replace('file://', ''), -1);
    const ownArt = Gio.File.new_for_path(GLib.build_filenamev([
        GLib.get_user_cache_dir(), 'dynamic-music-pill', 'art', `${ownHash}.png`,
    ]));
    const thumbHash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5,
        trackFile.get_uri(), -1);
    const thumbPath = GLib.build_filenamev([
        GLib.get_user_cache_dir(), 'thumbnails', 'normal', `${thumbHash}.png`,
    ]);
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
        if (!ownArt.query_exists(null))
            return GLib.SOURCE_CONTINUE;
        GLib.file_set_contents(trackFile.get_path(), 'updated test track');
        const modified = trackFile.query_info(Gio.FILE_ATTRIBUTE_TIME_MODIFIED,
            Gio.FileQueryInfoFlags.NONE, null)
            .get_attribute_uint64(Gio.FILE_ATTRIBUTE_TIME_MODIFIED).toString();
        pixbuf.fill(0xffa500ff);
        pixbuf.savev(thumbPath, 'png',
            ['tEXt::Thumb::URI', 'tEXt::Thumb::MTime'],
            [trackFile.get_uri(), modified]);
        print('MPRIS test thumbnail rewritten');
        return GLib.SOURCE_REMOVE;
    });
}
if (artMode === 'http') {
    let updates = 0;
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
        emitMetadataUpdate();
        updates++;
        return updates < 20 ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE;
    });
}
print(`MPRIS test player ready: ${artFile.get_uri()}`);
new GLib.MainLoop(null, false).run();
