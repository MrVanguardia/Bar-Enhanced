# Bar Enhanced v4.8.0

This release brings the recent stability, live-update and visual work together in one installable package.

## Highlights

- Quick Settings arrow-button colors can be **shared** or set **per expandable pill** on GNOME Shell **50**. In Preferences, go to **Menus → Quick Settings Arrow Colors → Per Tile**, open Quick Settings once, then use the color picker shown for each detected pill. The main pill color still follows the existing menu palette.
- Fixed the Quick Settings open signal callback and detection of GNOME 50 side buttons, which previously left the per-pill color controls empty.
- Included the GNOME 51 compatibility changes (pointer watcher, widget orientation and popup-menu API adaptations). GNOME 51 is declared in metadata but has **not** received the same runtime verification as GNOME 50.
- Refreshed visual assets across the extension, embedded dock, Pixel widgets and Vitals. Improved wallpaper/theming updates, widgets, integrated dock isolation, module cleanup, Vitals readings and package/schema validation.

## Validation and limits

- `bash tests/validate-extension.sh` and `unzip -t` pass for the release archive. An isolated GNOME 50.6 Devkit smoke test passed three enable/disable cycles with live bar and menu style changes while optional modules were off.
- Local GNOME 50 testing covered installation and the Quick Settings color workflow. This does **not** prove every hardware, third-party-extension or GNOME 51 combination.
- The per-pill color option is documented for GNOME 50. GNOME 51 behavior should be confirmed separately before promising full parity.

## Install

Download `bar-enhanced@mrvanguardia.shell-extension.zip` from this release, then run:

```bash
gnome-extensions install --force ./bar-enhanced@mrvanguardia.shell-extension.zip
gnome-extensions enable bar-enhanced@mrvanguardia
```

If Shell is already running an older version, log out and back in before evaluating JavaScript changes; a simple extension toggle may keep cached module code in the current GNOME session.
