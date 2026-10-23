# EGO release audit

This is the release gate for Bar Enhanced, not a substitute for testing the
actual GNOME Shell session that will run the extension.

## Automated evidence

Run from the repository root:

The validation script requires `xmllint` (from libxml2) in addition to the
GNOME/GJS and Node test tools.

```bash
glib-compile-schemas --strict bar-enhanced@mrvanguardia/schemas
bash tests/validate-extension.sh
bash tools/package-extension.sh dist
bash tools/update-translations.sh
unzip -t dist/bar-enhanced@mrvanguardia.shell-extension.zip
```

GNOME also provides this baseline pack command for a simple extension source
tree:

```bash
gnome-extensions pack --force --out-dir dist \
  --schema bar-enhanced@mrvanguardia/schemas/org.gnome.shell.extensions.bar-enhanced.gschema.xml \
  --podir bar-enhanced@mrvanguardia/po --gettext-domain bar-enhanced bar-enhanced@mrvanguardia
```

For Bar Enhanced, use `tools/package-extension.sh` for releases: it preserves
the complete nested module tree, compiles every bundled schema, and includes
the root GPL license. Do not replace it with the baseline command unless its
output has been inspected for those same files.

`tests/validate-extension.sh` rejects JavaScript syntax errors, legacy
`imports.*` APIs, synchronous GNOME-version probing in preferences, schema
filename/ID mismatches, placeholder schema documentation, known lifecycle
regressions, insecure downloads, and development artefacts in the package.

To install the exact generated archive:

```bash
gnome-extensions install --force dist/bar-enhanced@mrvanguardia.shell-extension.zip
gnome-extensions enable bar-enhanced@mrvanguardia
journalctl --user -b -f -o cat /usr/bin/gnome-shell
```

For GNOME 50 development isolation, use the Shell development kit available
on the target system rather than reloading a live Wayland Shell:

```bash
dbus-run-session -- gnome-shell --headless --devkit --virtual-monitor=1280x720
```

This starts an isolated compositor and virtual monitor, and was exercised
against GNOME Shell 50.5. It is a startup smoke test, not a substitute for a
normal graphical-session test. The availability and invocation details of
`--devkit` are distribution dependent. Do not run it inside the daily desktop
session; launch it from a separate terminal or test VM.

## Checklist

| Gate | Status | Evidence / limitation |
| --- | --- | --- |
| ESM entry points; no legacy `imports.*` | Pass with one documented GJS bridge | Static gate in `tests/validate-extension.sh`; workers now import `System` and Shell Signals as ESM modules. The embedded dock retains one exact `imports['_gi']` access in `dash-to-dock/utils.js`, because GNOME 50 does not expose `hook_up_vfunc_symbol` via `gi://GObject`; it is limited to restoring GObject vfuncs and guarded by a regression test. |
| Runtime UI separated from GTK/Adwaita preferences | Pass | Core Shell modules use Shell/Clutter/St APIs; GTK/Adwaita imports are in preference and standalone GDM-app files. |
| Dead historical patch copies | Pass | Unreferenced `patches/` snapshots and the unreachable legacy GDM-dialog body were removed. `openGdmCustomizerDialog()` now has exactly one route: the modular GDM Center. |
| GSettings file-name/ID contract | Pass | Every schema XML file is checked against its schema ID and compiled strictly. |
| Auto-theme preference choices | Static validation passed; GTK interaction pending | The light-theme selector now reads and writes `lightOptions` (including Vanguard Silver) instead of incorrectly reusing dark options (Vanguard Gold). Combo callbacks ignore invalid/no selection. The validation script pins the light-option wiring; interactive preferences still need a graphical test. |
| Private embedded-dock namespace | Pass | Uses `org.gnome.shell.extensions.bar-enhanced.dash-to-dock`, never the public Dash-to-Dock namespace. |
| Embedded Dock Manager teardown and recovery | Partially verified | A clean GNOME 50.5 devkit run passed 20 off/on toggles of only the dock while the extension stayed active. `destroy()` now attempts each cleanup independently, logs individual failures, always clears the singleton, and nulls destroyed references; it separately attempts to restore managed signals and method/vfunc/property overrides if another step fails. `bash tests/devkit-mpris-smoke.sh dock-schema-missing` removed the private schema only from a temporary package copy: three constructor attempts failed for that schema, without a stuck singleton or loss of the remaining extension. Faults injected during teardown and graphical behavior remain unverified. |
| CSS isolation from other docks | Pass in code | The generated embedded-dock CSS is conditional and scoped to `#dashtodockContainer`; manual testing with Ubuntu Dock remains required. |
| Timers, signals, actors and monitor cleanup | Partially verified | Core and known module guards are checked. `BAR_ENHANCED_TEST_CYCLES=50 bash tests/devkit-mpris-smoke.sh file` and the same command with `thumbnail` each completed 50 enable/disable cycles on GNOME 50.5 with an active MPRIS fixture, without a Bar Enhanced JavaScript error in the isolated Shell log. Music Pill cancels pending cache queries and both artwork/thumbnail monitors on disable. Hydro tracks and disconnects actor mapping/hover signals and defers layout until attachment. A normal graphical 50-cycle run is still required because the headless devkit cannot prove every Shell signal and visual path. |
| Live integrated-module toggles | Pass in isolated devkit; visual check pending | `BAR_ENHANCED_TEST_MODULE_TOGGLES=2 bash tests/devkit-mpris-smoke.sh file` changed Vitals, Bluetooth Battery, Notification Icons and Hydro Widgets off/on while the extension remained active. Partial initialization now tears down references for those modules and Music Pill; notification settings signals are disconnected individually. The headless devkit does not prove visual placement or interaction. |
| No main-thread synchronous shell-version process | Pass | Preferences use `Config.PACKAGE_VERSION`, not `spawn_command_line_sync`. |
| Vitals public-IP privacy and refresh setting | Static validation passed; live network check pending | Public-IP lookup is now opt-in by schema default, its third-party endpoint is disclosed, switching the interval resets the actual countdown, and late responses are ignored after opt-out. The schema contract checks the default; a real network/GTK session remains to be exercised. |
| Vitals memory unit accuracy | Pass in local unit test | `/proc/meminfo` is always converted from KiB to bytes before selecting decimal or binary display units; `tests/vitals-values.test.js` checks both modes. Live comparison with a system monitor remains part of graphical acceptance. |
| Vitals asynchronous teardown | Partially verified | Pending `nvidia-smi` reads are ignored after disable or process replacement, and late sysfs sensor discovery stops before adding actors/data. GNOME 50.5 devkit cycles exercise normal teardown; fault-injected GPU hardware behavior remains unverified. |
| No main-thread synchronous runtime I/O | Incomplete across the extension | Music Pill artwork selection now uses asynchronous Gio queries for source files, cached display URIs, and track thumbnails; its history operations and preferences cache controls are asynchronous too. The validation gate rejects synchronous `query_exists`/`query_info` in `dynamic-music-pill/controller.js`. Isolated GNOME 50.5 MPRIS tests pass for local artwork and same-URI rewrites, embedded `data:`, HTTP including preseeded/deleted caches, generated fallback, live custom fallback changes, and GIO thumbnails including stale/pre-existing cache and a same-URI rewrite. Other modules still need a full synchronous-I/O audit and live-session profiling. |
| No undeclared package artefacts | Pass | Package test rejects graph caches, patch folders, bytecode, `__pycache__`, and translation source `.po`/`.pot` files; it requires the root GPL `LICENSE` and retains compiled `.mo` catalogues in the ZIP. |
| Network and subprocess safety | Partially automated | HTTPS/download and selected process guards are tested. Cava configuration is written asynchronously and its startup is invalidated on disable; online themes, lyrics, video wallpaper and GDM tools still require manual acceptance testing. |
| Translatable strings and locale catalogues | Extracted gettext catalogue complete; full UI audit pending | `tools/update-translations.sh` extracts gettext calls across bundled JavaScript modules, imports 911 existing Spanish fallback strings and reuses Vitals/Dock translations without overwriting established PO entries. The remaining entries and incorrect fuzzy matches were translated/reviewed; `msgfmt --statistics` now reports 808 translated messages with no fuzzy or untranslated entries, enforced by `tests/validate-extension.sh`. This proves coverage of extracted gettext calls, not every raw visible string or the standalone GDM app; a full UI and language-quality review remains required. |
| GNOME Shell runtime compatibility | Pending graphical-session confirmation for 50 and runtime verification for 51 | Metadata declares GNOME 50 and 51; the isolated devkit tests run on GNOME 50 only. The headless backend cannot prove visual behavior, real Bluetooth/MPRIS devices, or live dock exercise. A normal logged-in graphical session is required before calling either major version fully verified. |
| Quick Settings individual colors | CSS generation passed; live visual check pending | On GNOME 50.6, a devkit run used a Shell-discovered control ID and verified separate scoped rules for the pill, arrow, active/hover and text states. It also verified that old `menu-surface-colors` values do not enter the CSS. An older live Shell process still generated `.quick-settings` selectors after source files were replaced; log out/in before the graphical check because toggling the extension did not reload its JavaScript module. |
| ESLint with GNOME Shell config | Not verified | No `eslint` executable or project-local ESLint installation is present. `node --check` covers syntax only; it does not establish a zero-warning lint result. A pinned lint toolchain and full clean run are required before claiming this gate. |

## Mandatory live release run

1. In a clean VM or separate GNOME 50 devkit session, install the ZIP.
2. Enable and disable the extension 50 times while watching the Shell journal.
3. Toggle every integrated module on and off twice; check that only one actor
   is present after each enable.
4. Test Dash to Dock alongside Ubuntu Dock or an external Dash to Dock.
5. Test a wallpaper change, monitor reconfiguration, lock/unlock, MPRIS
   player arrival/removal, Bluetooth device arrival/removal, and Vitals under
   both idle and load.
6. Record the GNOME version, distribution, command output and any Shell
   warnings before publishing.
