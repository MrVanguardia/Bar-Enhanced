
# Bar Enhanced (GNOME 50/51 Extension)

<p align="center">
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/stargazers">
    <img src="https://img.shields.io/github/stars/MrVanguardia/Bar-Enhanced?style=for-the-badge&color=4CAF50&logo=github" alt="Stars" />
  </a>
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/network/members">
    <img src="https://img.shields.io/github/forks/MrVanguardia/Bar-Enhanced?style=for-the-badge&color=2196F3&logo=github" alt="Forks" />
  </a>
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/issues">
    <img src="https://img.shields.io/github/issues/MrVanguardia/Bar-Enhanced?style=for-the-badge&color=F44336&logo=github" alt="Issues" />
  </a>
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/MrVanguardia/Bar-Enhanced?style=for-the-badge&color=FF9800" alt="License" />
  </a>
  <a href="https://extensions.gnome.org/">
    <img src="https://img.shields.io/badge/GNOME-50%20%7C%2051-4A154B?style=for-the-badge&logo=gnome" alt="GNOME Shell" />
  </a>
  <br/>
  <img src="https://img.shields.io/badge/Platform-Linux-000000?style=for-the-badge&logo=linux&logoColor=white" alt="Platform Linux" />
  <img src="https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/commits/main">
    <img src="https://img.shields.io/github/last-commit/MrVanguardia/Bar-Enhanced?style=for-the-badge&color=8E44AD" alt="Last Commit" />
  </a>
  <a href="https://github.com/MrVanguardia/Bar-Enhanced/pulls">
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge&logo=git" alt="PRs Welcome" />
  </a>
  <a>
    <img src="https://img.shields.io/badge/Translations-Spanish%20%7C%20English-FF9800?style=for-the-badge" alt="Spanish & English" />
  </a>
</p>


**Bar Enhanced** is a premium GNOME Shell extension designed for high-end desktop customization. It transforms the standard GNOME interface into a balanced, professional environment with modern visual controls, adaptive theming, and an intuitive user experience.

Developed and maintained by **MrVanguardia**, this project is an advanced evolution of the original **Open Bar** extension, preserving its legacy while introducing state-of-the-art features and a modern architectural approach.

## 🙏 Acknowledgments
This project is built upon the solid foundation of **Open Bar**, originally created by **neuromorph**. We express our deep gratitude to the original author for their innovative work which made this enhanced version possible.

We also incorporate and build upon the source code of **Dash to Dock**, an amazing project created by **Michele G (micheleg)** and its contributors. We thank them for their continuous work on the GNOME dock ecosystem. The Dash to Dock components included in this project retain their original GPL license.

We also incorporate and build upon the source code of **Dynamic Music Pill**, an awesome module created by **Andbal23**. We thank them for their work on creating an amazing MPRIS integration for GNOME. The Dynamic Music Pill components included in this project retain their original GPL license.

We also incorporate and build upon the source code of **Vitals**, a comprehensive system sensor monitor created by **corecoding**. We thank them for their fantastic work in tracking hardware statistics. The Vitals components included in this project retain their original GPL license.

## ✨ What's New in Bar Enhanced?

### v4.8.0 — Quick Settings, compatibility and visual polish

- Per-pill arrow background colors in Quick Settings on GNOME 50: choose **Menus → Quick Settings Arrow Colors → Per Tile**, open Quick Settings once, then set each detected arrow color. **Shared** keeps the existing secondary-surface color.
- Fixed discovery of arrow buttons when Quick Settings opens and recognition of GNOME 50 side buttons; preferences now explain when no expandable tile has been detected.
- GNOME 51 compatibility changes are included, but runtime verification on GNOME 51 is still pending. GNOME 50 was exercised locally.
- Refreshed extension, dock, pixel-widget and Vitals icons; improved live theme updates and bundled-module reliability.

### v4.7.0 — Stability and live-update release

- **Live visual updates:** Wallpaper colors, Hydro widget styles, shapes and custom colors now apply without logging out.
- **Complete Hydro widgets:** Finished calendar and battery styles, movable desktop widgets, correct analog-clock colors, battery state icons and efficient music visualizer lifecycle.
- **Desktop-safe widgets:** Widgets stay behind normal application windows instead of covering them.
- **Reliability hardening:** Static wallpapers no longer zoom or follow the pointer; palette extraction, GDM restore flow, music integration, Vitals and Bluetooth cleanup.

- **Modern Navigation UI:** Replaced the legacy sidebar with a clean, categorized top-tab layout inspired by V-Shell for faster access to settings.
- **Improved Theme Store:** A completely rebuilt online browser for community icon themes with live previews, download status, and better layout.
- **Enhanced Responsiveness:** Optimized preference window that adapts to different screen resolutions, ensuring no buttons or controls are cut off.
- **Clean Welcome Experience:** A new streamlined landing page with quick-start guides and daily inspiration.
- **Optimized Codebase:** Refactored and validated against GNOME Shell 50.

## 🚀 Key Features

- **Adaptive Theming Engine:** Extract color palettes from your wallpaper in real-time (Dark, Light, Pastel, and True-Color modes).
- **Advanced Geometry:** Precise control over corner rounding (from sharp to pill-shaped), border thickness, and neon luminosity glow.
- **Glassmorphism translúcido:** Premium dynamic transparency and frosted-glass blur effects applied across the Top Bar, Pop-up Menus, Notification Banners, overview Search Results, Dash/Dock, Vitals, Bluetooth Menu, and Dynamic Music Pill. It fully respects Light and Dark themes out of the box (rendering bright frosted glass or sleek dark glass accordingly) and automatically suspends the blur effect when background opacity is solid (`1.0`) for optimal rendering performance.
- **Efficiency Mode (Window-Max):** Intelligent optimization that adjusts the bar's appearance automatically when a window is maximized.
- **Application Tunneling:** Experimental CSS injection to sync your shell theme with GTK3, GTK4, and Flatpak applications.

## 🖥️ GDM Center (Login Screen Customizer)

<p align="center">
  <img src="https://img.shields.io/badge/GDM%20Center-Active-4CAF50?style=for-the-badge&logo=gnome&logoColor=white" alt="GDM Center Active" />
  <img src="https://img.shields.io/badge/Wayland-100%25%20Safe-8E44AD?style=for-the-badge&logo=wayland&logoColor=white" alt="Wayland Safe" />
  <img src="https://img.shields.io/badge/Translations-Spanish%20%7C%20English-FF9800?style=for-the-badge" alt="Spanish & English" />
  <img src="https://img.shields.io/badge/Sandboxed%20Safety-Enforced-2196F3?style=for-the-badge" alt="Sandboxed Safety" />
</p>

**Bar Enhanced GDM Center** is a state-of-the-art, system-integrated control center designed to customize your GNOME Login Screen safely. Unlike third-party applications that overwrite raw binary resources and brick display managers, our GDM Center uses a sandboxed architecture and modern injection pathways to deliver stunning visual customization with absolute stability.

> [!TIP]
> 🌌 **Elevate Your Greeter Experience with Premium Wallpapers**
> 
> A spectacular login screen deserves breathtaking artwork. Discover handpicked, stunning high-resolution backgrounds and visual assets curated specifically for modern lockscreens:
> 
> <a href="https://4kwallpapers.com/" target="_blank"><img src="https://img.shields.io/badge/4K%20Wallpapers-Explore%20Gallery-78E000?style=for-the-badge&logo=unsplash&logoColor=black" alt="4K Wallpapers Gallery" /></a>

---

### 🎨 Visual & Performance Control Panel

<table>
  <thead>
    <tr>
      <th align="left">🔧 GDM Panel Section</th>
      <th align="left">🌟 Visual & Performance Highlights</th>
      <th align="left">🛡️ Under-the-Hood Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>🎨 Appearance</b></td>
      <td>Synchronize custom Accent Colors, Light/Dark theme, and set custom Shell, Icon, and Cursor packages.</td>
      <td><code>Dynamic Folder Scanner</code></td>
    </tr>
    <tr>
      <td><b>🖼️ Login Screen</b></td>
      <td>Change GDM background wallpapers and logos with secure sandboxed permission handling.</td>
      <td><code>Gtk.FileDialog</code> & <code>universal 644 chmod</code></td>
    </tr>
    <tr>
      <td><b>🔒 Password Box</b></td>
      <td>Apply glassmorphic opacity scaling, solid background colors, and frosted-glass blur effects.</td>
      <td><code>-st-background-blur</code> engine</td>
    </tr>
    <tr>
      <td><b>🌗 Night Light</b></td>
      <td>Full color temperature adjustment scale, automatic schedules, and custom start/end hour timers.</td>
      <td><code>ColorManager Settings Bindings</code></td>
    </tr>
    <tr>
      <td><b>🔉 Auditory Alert</b></td>
      <td>Dynamic sound theme detector to automatically scan and apply system audio themes.</td>
      <td><code>Gio.File</code> folder enum loader</td>
    </tr>
    <tr>
      <td><b>🖱️ Peripherals</b></td>
      <td>Precise mouse speed curves, natural scrolling, touchpad gestures, and cursor scale multiplier.</td>
      <td><code>accel-profile</code> & <code>tap-to-click</code> GSettings</td>
    </tr>
    <tr>
      <td><b>🔋 Power & Sleep</b></td>
      <td>Fine-tune AC & battery suspension, idle screen dim timers, and physical power button actions.</td>
      <td><code>sleep-inactive-ac-timeout</code></td>
    </tr>
    <tr>
      <td><b>🕒 Clock & Top Bar</b></td>
      <td>Toggle seconds, dates, weekday, battery percentage, and select clock layouts (12h or 24h).</td>
      <td><code>clock-show-seconds</code> & <code>clock-format</code></td>
    </tr>
    <tr>
      <td><b>🖥️ Display Sync</b></td>
      <td>Mirror multi-monitor screen layouts, resolution coordinates, and experimental fractional scaling.</td>
      <td><code>monitors.xml</code> parser & Mutter DBus</td>
    </tr>
    <tr>
      <td><b>🚨 Safe Restoration</b></td>
      <td>A dedicated factory reset button to wipe GDM custom configs and cleanly return GDM to stock settings.</td>
      <td><code>pkexec</code> destructive cleanup shell script</td>
    </tr>
  </tbody>
</table>

> [!IMPORTANT]
> ⚠️ **GDM Custom Theme & Wallpaper Requirements**
> 
> To apply custom login backgrounds, accent colors, and custom card/password styles on GDM, your system needs the official GNOME Shell `user-theme` extension installed system-wide.
> 
> **The GDM Center checks for this prerequisite before applying changes**; it does not install system packages automatically.
> 
> Install it manually if it is missing:
> * **Fedora:** `sudo dnf install gnome-shell-extension-user-theme`
> * **Ubuntu / Debian:** `sudo apt install gnome-shell-extension-user-theme`
> * **Arch Linux:** `sudo pacman -S gnome-shell-extensions`

---

## 📥 Installation

To install **Bar Enhanced** correctly, you must clone the repository and then move the extension folder to your local GNOME extensions directory.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MrVanguardia/Bar-Enhanced.git
   ```
2. **Install the extension:**
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/
   cp -r Bar-Enhanced/bar-enhanced@mrvanguardia ~/.local/share/gnome-shell/extensions/
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/bar-enhanced@mrvanguardia/schemas
   ```
3. **Restart GNOME Shell:**
   - **Wayland:** Log out and log back in.
   - **Xorg:** Press `Alt+F2`, type `r`, and hit `Enter`.
4. **Enable the extension:** Use the *Extensions* app or *Extension Manager*.

### 🔄 Quick Update

If you already have the repository cloned, run this command from the parent folder to pull the latest changes, copy the extension files, compile the schemas, and prepare it for reload:
```bash
cd Bar-Enhanced && git pull && cp -r bar-enhanced@mrvanguardia ~/.local/share/gnome-shell/extensions/ && glib-compile-schemas ~/.local/share/gnome-shell/extensions/bar-enhanced@mrvanguardia/schemas
```

### 📦 Create a release package

Build a complete installable archive (including the dock, music, sensor, media,
and schema subdirectories) with:

```bash
bash tools/package-extension.sh
```

The resulting archive is written to `dist/bar-enhanced@mrvanguardia.shell-extension.zip`.

## 🎨 Professional Customization
- **Bar Styles:** Choose from Mainland, Floating, Trilands, or Island layouts.
- **System-Wide Sync:** Propagate accent colors across the entire shell ecosystem.
- **Profile Management:** Export deterministic, editable JSON or dconf-style TXT profiles, or generate a compact Base64 share code.

### Configuration, modules, and profiles

Bar Enhanced groups optional components under **Preferences → System → Integrated
Modules**. Dash to Dock, Dynamic Music Pill, Vitals, and Bluetooth Battery can be
disabled independently there; the configuration button beside a module opens its
component-specific options.

Use **Preferences → Admin → Save Configuration Profile** for an editable backup:

- **JSON** is the complete, portable profile format. Every section and nested
  key is alphabetically sorted, so two exports can be compared cleanly in a
  diff tool.
- **TXT** is a readable dconf-style alternative, also sorted within every
  section. Both JSON and TXT can be imported from the corresponding Admin
  action.
- **Compact share code** is Base64-encoded JSON for copying a theme in chat. It
  is not encryption and is intentionally not the only export path.

Auto-theme, Pywal/Material You, wallpaper palette refresh, and immersive music
theme are automation modes: while one is actively applying a theme, it can
replace manual colour choices. For a fully manual menu palette, disable the
automation mode you do not want, then enable **Secondary Palette Override** in
the Menus page before editing the secondary Quick Settings surface.

On GNOME 50, **Menus → Quick Settings Arrow Colors** lets you choose **Shared**
or **Per Tile** for the background of each expandable tile's arrow button.
With Per Tile selected, open Quick Settings once to discover the buttons;
their individual color pickers then appear automatically in preferences.
The main tile surface and its active/hover/text colors remain controlled by
the existing shared menu palette. The older "Individual Menu Surfaces" and
per-control color editors were removed because they duplicated and conflicted
with that palette; their stored profile keys remain importable but no longer
affect styling. Arrow overrides apply while Specialized Popup Styles are
enabled. Changing a menu color
does not change GNOME's desktop-wide accent unless **Use menu color as GNOME
system accent** is explicitly enabled.

The embedded Dash to Dock uses Bar Enhanced's own dconf namespace and its CSS
loads only while its module is enabled. It does not reuse or alter settings from
an independently installed Dash to Dock or Ubuntu Dock.

## 📸 Screenshots

*Preview of Bar Enhanced in action:*

![Main view of the bar](screens/b1.png)  
*Example of the Floating style with adaptive thematic.*

![Modern preferences window](screens/b2.png)  
*New navigation interface with top tabs.*

![Modern interface](screens/b3.png)  
*Example of the interface.*

![Modern Theme Store](screens/b4.png)  
*New community Theme Store with active compatibility checker.*

![Wallpaper Extraction Engine](screens/b5.png)  
*Real-time wallpaper palette extraction with live contrast-aware bar and menu sync.*

![Complete Desktop Customization](screens/b6b.png)  
*Complete aesthetic sync matching top bar, popups, and quick settings toggles.*


## 📜 License
This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License version 3 (GPL-3.0)**.
* **Bar Enhanced:** Copyright (C) 2024-2026 MrVanguardia.
* **Original core logic:** Copyright (C) neuromorph.
* **Dash to Dock components:** Copyright (C) Michele G.
* **Dynamic Music Pill components:** Copyright (C) Andbal23.
* **Vitals components:** Copyright (C) corecoding.

## 📄 Additional documentation

- [🧭 Architecture and verification](docs/ARCHITECTURE.md)
- [✅ EGO release audit](docs/EGO_RELEASE_AUDIT.md)
- [👥 Contributors](CONTRIBUTORS.md)
- [📢 Third-party notice](THIRD_PARTY_NOTICES.md)
- [📋 Theme Vanguard Gold](Vanguard%20Gold%20Theme.txt)

---
*Love the project? Give it a ⭐ on [GitHub](https://github.com/MrVanguardia/Bar-Enhanced) and share your rice!*
