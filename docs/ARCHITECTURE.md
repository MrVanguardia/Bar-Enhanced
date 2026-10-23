# Bar Enhanced architecture and verification

Bar Enhanced is a GNOME Shell extension whose main entry point is
`bar-enhanced@mrvanguardia/extension.js`. The extension creates runtime
objects only from `enable()` and tears them down from `disable()`.

## Runtime modules

| Module | Entry point | Enabled by | Cleanup owner |
| --- | --- | --- | --- |
| Core panel and stylesheet engine | `extension.js`, `stylesheets.js` | Always | `BarEnhanced.disable()` |
| Embedded Dash to Dock | `dash-to-dock/docking.js` | `dash-to-dock-enabled` | `DockManager.destroy()` |
| Dynamic Music Pill | `dynamic-music-pill/controller.js` | `music-pill-enabled` or `hydro-media-enabled` | `MusicController.disable()` |
| Vitals | `vitals/extension.js` | `vitals-enabled` | `VitalsExtension.disable()` |
| Bluetooth battery | `bluetooth-battery.js` | `bluetooth-battery-enabled` | `BluetoothBattery.destroy()` |
| Hydro widgets | `hydro-widgets.js` | `hydro-widgets-enabled` | `HydroWidgetsManager.disable()` |
| Wallpaper | `wallpaper-manager.js` | Core lifecycle; behavior is controlled by Hydro wallpaper settings | `WallpaperManager.disable()` |

Each module must be safe to enable, disable, and enable again in the same
GNOME Shell session. Timers, GLib sources, signal IDs, injected methods, and
actors belong to the module that created them and must be removed on teardown.

## Styling boundaries

`stylesheets.js` produces the runtime stylesheet. It must not style another
extension merely because it uses shared GNOME Shell class names.

- Embedded Dash to Dock selectors are emitted only when
  `dash-to-dock-enabled` is true.
- The overview application-grid layer is opt-in through `theme-app-grid`.
  Keep it disabled when V-Shell or another overview extension owns the grid.
- Quick Settings active tiles use `mscolor`; their surface is separate from
  the secondary menu-arrow color.
- `autotheme-active-tile-color` controls whether automatic palettes may update
  the active-tile color. Disable it to preserve a manual tile color.
- The individual Quick Settings control editor and its actor scanning/CSS were
  removed. `quick-settings-control-colors` and
  `quick-settings-control-registry` remain inert in the schema only so older
  profiles can still be imported. Shared menu colors remain available.
- `menu-surface-colors` is retained in the schema only so old profiles remain
  importable. It no longer contributes CSS or appears in Preferences.

## Settings and schemas

Schemas are in `bar-enhanced@mrvanguardia/schemas`. Every XML filename equals
its schema ID and is compiled into `gschemas.compiled` only for packaging or
local installation. The embedded dock uses the private schema ID
`org.gnome.shell.extensions.bar-enhanced.dash-to-dock` and path
`/org/gnome/shell/extensions/bar-enhanced/dash-to-dock/`; it never reads or
writes Dash to Dock's public settings namespace.

## System integration and permissions

Normal panel modules operate through GNOME Shell and GSettings. GTK/Flatpak
theme output is opt-in. The separate GDM Center performs privileged operations
only after an explicit user action and authentication; it is not run by merely
enabling the extension.

`apply-flatpak` adds read-only GTK configuration permissions to the user's
`flatpak/overrides/global` file. When switched off during the same extension
session, Bar Enhanced removes only the permissions it added and preserves
other groups and permissions, including changes made by another program in
the meantime. It does not claim or remove matching permissions that were
already present when it started.

Runtime dependencies are GNOME Shell's GJS APIs (`Gio`, `GLib`, `Clutter`,
`St`, `Meta`, and Shell UI modules). Vitals reads standard local kernel data
such as `/proc`; the music module talks to available MPRIS players over the
session bus. Neither module needs a network service to render its basic UI.
Optional online theme, wallpaper, and lyrics features make network requests
only when the user opens or enables those features.
Vitals can also contact `https://ipv4.corecoding.com` to display the public IP
and country flag. This lookup is disabled by default and runs only when the
user enables **Include public IP address** in Vitals preferences. Changing its
refresh interval takes effect on the next sensor update.

The music spectrum is optional and starts only when `cava` is installed. Video
wallpaper playback is optional too: it requires `mpvpaper` on Wayland or
`xwinwrap` plus `mpv` on X11. Missing optional programs must leave the rest of
the extension functional.

## Verification

From the repository root:

```bash
bash tests/validate-extension.sh
bash tools/package-extension.sh dist
```

The validation script checks GSettings compilation and contracts, JavaScript
syntax, package contents, critical lifecycle guards, and known regression
conditions, including an isolated Flatpak-global override test. Test a built archive in a fresh GNOME 50 session after logging out
and in again; Wayland does not support the Xorg shell-reload shortcut.

Minimum manual regression set:

1. Enable and disable every optional module twice.
2. Toggle embedded Dash to Dock while Ubuntu Dock or Dash to Dock is active;
   their appearance must not change while the embedded module is off.
3. Change active-tile and secondary-surface colors, then apply an automatic
   palette with tile synchronization both enabled and disabled.
4. Enable Window-Max, open and close several windows, then disable it.
5. Change wallpaper, display layout, and light/dark mode without logging out.
6. Toggle Flatpak support on and off; verify an existing global Flatpak override
   retains all unrelated permissions and keys.

## Per-module smoke tests

Run these in a freshly logged-in GNOME 50 session, changing one setting at a
time. After every *off* step, confirm that the actor disappears and the Shell
does not report an error in `journalctl --user -b -f /usr/bin/gnome-shell`.

| Module | Test |
| --- | --- |
| Core panel | Switch every bar type, then toggle panel/menu styling and light/dark mode. Changes must be visible immediately. |
| Dash to Dock | Toggle it on/off twice; test auto-hide and intelligent hide separately; keep Ubuntu Dock or Dash to Dock enabled and verify its CSS never changes while this module is off. |
| Music Pill | Start and stop an MPRIS-capable player; test play/pause, artwork fallback, hide/show, and disabling the module while playback continues. |
| Vitals | Compare CPU, memory, and network values with a trusted local tool during idle and load; disable/re-enable and confirm no duplicate indicator appears. |
| Bluetooth battery | Connect and disconnect a device, check a valid 0% reading and an unavailable reading separately, change its battery value if available, then disable the module. |
| Hydro widgets | Enable each widget, drag it, move between monitors, enter/leave overview, and disable it while a timer/widget animation is active. |
| Wallpaper | Enable an image wallpaper, move the pointer, change monitors, and confirm it remains fixed. Test video mode only with a local file. |

The pointer-following wallpaper effect was removed: selecting a static image
still updates GNOME's background settings, but Bar Enhanced no longer scales
or translates Shell's background actor. Set `BAR_ENHANCED_TEST_WALLPAPER=1`
when running the isolated devkit smoke test to verify image selection without
changing the daily desktop session. A real pointer/monitor visual check remains
necessary before a release.
| Quick Settings styles | Assign different secondary-surface, active-tile, and arrow colors. Apply a palette with active-tile synchronization on and off. |

## Preferences audit status (2026-10-20)

All ten page builders were inspected against their GSettings bindings. The
automated schema-contract test covers literal preference keys in the main,
private dock, and notification-icon schemas. This is a static contract check,
not proof that every UI control works in a real session.

| Page | Verified in this pass | Still needs live verification |
| --- | --- | --- |
| Top Bar | Page keys and stylesheet contracts | Bar variants, panel positioning, and immediate visual updates |
| Efficiency | Page keys and lifecycle smoke | Window-Max and module interactions under real windows |
| Aesthetics | Page keys, palette/settings paths | Wallpaper palette accuracy and light/dark transitions |
| Highlights | Page keys and style generation | Every highlight state in Shell |
| Borders | Page keys and style generation | Every border variant on all monitor layouts |
| Menus | Page keys; per-control CSS generation and deprecated surface-key isolation in isolated GNOME devkit | Visual color/contrast review, each applicable control and popup in a fresh real session |
| Dash & Dock | Private-schema keys; enable/disable smoke | Auto-hide, intelligent hide, other-dock coexistence; off-stage theme-node warnings below |
| System | Page keys and opt-in integration paths | Real system menu, GTK and GDM effects |
| Applications | Page keys; Flatpak override preservation unit test | App-grid coexistence with V-Shell and desktop application behavior |
| Admin | Page keys and package validation | Interactive import/export and privileged GDM workflow |

With `BAR_ENHANCED_TEST_STYLE_KEYS=1`, the isolated devkit changes `bartype`,
`bgcolor`, `hcolor`, `bwidth`, `mbgcolor`, `dashdock-style`,
`apply-menu-shell`, and `theme-app-grid` one by one through GSettings and
requires a fresh stylesheet write after each change. It checks the live
settings-to-CSS path, not visual appearance or each control's full behavior.
Preference combo rows and individual menu/control color pickers now also
refresh after external setting changes or profile imports.

The isolated GNOME 50 devkit recorded 214 `St-CRITICAL` messages involving
`st_widget_get_theme_node` on off-stage actors with the embedded dock enabled
during a two-cycle run, versus zero with that dock disabled. The dock is thus
the confirmed source in that test; the precise call site and fix remain open.
The smoke test currently does not fail on these GTK/St critical messages.
Do not treat a passing static/headless suite as full graphical or GDM acceptance.

For an isolated Music Pill history test, start `gjs -m tests/fake-mpris-player.js`
on the same temporary session bus as the GNOME 50 devkit, then enable the
extension. The `playback-history` setting must contain the test track and its
`hist_` artwork URI must refer to an existing file under that session's cache
directory. Stop the fixture and disable the extension before ending the bus.
The repository automates that sequence with `bash tests/devkit-mpris-smoke.sh`;
it uses temporary XDG directories and does not alter the daily desktop session.
Set `BAR_ENHANCED_TEST_CYCLES=50` to repeat enable/disable 50 times while the
test player remains available and check the isolated Shell log for errors.
Set `BAR_ENHANCED_TEST_DOCK_TOGGLES=20` to toggle the embedded Dock Manager
off and on while Bar Enhanced remains active; this checks its normal teardown
and reconstruction path without touching another installed dock.
Use `bash tests/devkit-mpris-smoke.sh dock-schema-missing` to remove only the
private dock schema from the temporary test copy. It verifies that three
intentional constructor failures do not leave the Dock Manager singleton stuck.
Pass `file`, `file-rewrite`, `data`, `http`, `http-preseed`,
`http-cache-delete`, `http-switch`, `thumbnail`, `thumbnail-rewrite`,
`thumbnail-stale`, `thumbnail-stale-cache`, `none`, or `fallback` to exercise
local artwork, replacement of an existing local source, embedded image data,
a delayed loopback HTTP image with repeated MPRIS updates, a changed HTTP
artwork URL with the same title, generated fallback artwork, or a live change
from generated to user-selected fallback artwork. The HTTP case
asserts that repeated updates produce only one request and an empty cached
file is replaced; the switch case asserts a separate request and cache entry.
The preseeded HTTP case asserts that a valid cache entry avoids a network
request; the cache-delete case checks that an externally deleted cache file is
fetched again. The local rewrite case asserts that the two cached images differ
in content. The thumbnail cases cover GIO's valid/invalid metadata, a stale
pre-existing extension cache entry, and replacement of a thumbnail while the
player remains active.
