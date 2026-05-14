/* prefs.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Author: MrVanguardia
 * Based on Open Bar by neuromorph
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SCHEMA_PATH = '/org/gnome/shell/extensions/barEnhanced/';

// Automated translation fallback for Spanish
const ES_MAP = {
    'Welcome': 'Bienvenido', 'Auto Themes': 'Temas Automáticos', 'Top Bar': 'Barra Superior',
    'Efficiency': 'Eficiencia', 'Aesthetics': 'Estética', 'Highlights': 'Resaltados',
    'Borders': 'Bordes', 'Menus': 'Menús', 'Dash & Dock': 'Dash y Dock',
    'System': 'Sistema', 'Apps': 'Aplicaciones', 'Admin': 'Admin',
    'Architecture & Design': 'Arquitectura y Diseño',
    'Professional Shell Customization Suite': 'Suite Profesional de Personalización del Shell',
    'Open Bar allows you to theme the Top Bar, Pop-up Menus, Dash, Dock and the rest of the GNOME Shell environment.': 'Bar Enhanced te permite tematizar la Barra Superior, Menús Pop-up, Dash, Dock y el resto del entorno GNOME Shell.',
    'Adaptive Engine': 'Motor Adaptativo', 'Extracts color palettes from your wallpaper dynamically.': 'Extrae paletas de colores de tu fondo de pantalla dinámicamente.',
    'Layout Architecture': 'Arquitectura de Diseño', 'Support for Mainland, Floating, Trilands, and Island bar styles.': 'Soporte para estilos de barra Continental, Flotante, Trilands e Islas.',
    'Gtk Tunneling': 'Túnel Gtk', 'Experimental styling for Gtk3, Gtk4, and Flatpak applications.': 'Estilo experimental para aplicaciones Gtk3, Gtk4 y Flatpak.',
    'Visual Precision': 'Precisión Visual', 'Advanced control over borders, neon effects, and glassmorphism.': 'Control avanzado sobre bordes, efectos neón y glassmorphism.',
    'Quick Start Guide': 'Guía de Inicio Rápido', '1. Select Bar Type': '1. Selecciona Tipo de Barra',
    'Go to "Top Bar" and choose your preferred layout (e.g., Islands).': 'Ve a "Top Bar" y elige tu diseño preferido (ej. Islas).',
    '2. Apply Auto-Theme': '2. Aplicar Tema Automático', 'Go to "Auto Themes", select a base mode, and click Apply.': 'Ve a "Auto Themes", selecciona un modo base y haz clic en Aplicar.',
    '3. Refine Aesthetics': '3. Refinar Estética', 'Tweak individual colors, borders, and shadows in the following tabs.': 'Ajusta colores individuales, bordes y sombras en las siguientes pestañas.',
    'Daily Inspiration': 'Inspiración Diaria', 'Theming Engine Settings': 'Configuración del Motor de Temas',
    'Auto-Refresh on Wallpaper Change': 'Auto-Refrescar al cambiar Fondo', 'Dynamic Opacity Calculation': 'Cálculo de Opacidad Dinámica',
    'Auto-Set Bar Foreground': 'Auto-Ajustar Texto de Barra', 'Auto-Set Menu Foreground': 'Auto-Ajustar Texto de Menú',
    'Alternate Secondary Menu Color': 'Color Alternativo de Menú Secundario', 'Manual Accent Override': 'Sobrescribir Acento Manualmente',
    'Custom Accent Color': 'Color de Acento Personalizado', 'Apply Engine Configuration': 'Aplicar Configuración del Motor',
    'Dark Mode Base Theme': 'Tema Base Modo Oscuro', 'Light Mode Base Theme': 'Tema Base Modo Claro',
    'Apply Auto-Theme Engine': 'Aplicar Motor de Tema Automático', 'Extracted Color Palette': 'Paleta de Colores Extraída',
    'Update Palette Data': 'Actualizar Datos de Paleta', 'Architecture & Layout': 'Arquitectura y Diseño',
    'Bar Type': 'Tipo de Barra', 'Edge Alignment': 'Alineación de Borde', 'Sync Notification Position': 'Sincronizar Posición de Notificaciones',
    'Bar Vertical Height': 'Altura Vertical de Barra', 'Side Horizontal Margins': 'Márgenes Horizontales Laterales',
    'Custom Bottom Margin Override': 'Sobrescribir Margen Inferior', 'Bottom Margin Offset': 'Desplazamiento de Margen Inferior',
    'Visibility in Overview': 'Visibilidad en Vista General', 'Visibility in Fullscreen': 'Visibilidad en Pantalla Completa',
    'Fitts Law Compatibility': 'Compatibilidad con Ley de Fitts', 'Maximized State Optimization': 'Optimización en Estado Maximizado',
    'Enable Window-Max Bar Optimization': 'Activar Optimización Window-Max', 'Application Headerbar Color Sync': 'Sincronizar Color con Headerbar',
    'Override Maximized Bar Height': 'Sobrescribir Altura Maximizada', 'Preserve Button Backgrounds': 'Preservar Fondos de Botones',
    'Preserve Borders': 'Preservar Bordes', 'Primary Colors': 'Colores Primarios', 'Interface Foreground': 'Texto de la Interfaz',
    'Interface Background': 'Fondo de la Interfaz', 'Box / Sidebar Color': 'Color de Caja / Lateral', 'Enable Color Gradients': 'Activar Degradados de Color',
    'Direction': 'Dirección', 'Enable Panel Shadow': 'Activar Sombra del Panel', 'Shadow Color': 'Color de Sombra',
    'Shadow Intensity': 'Intensidad de Sombra', 'Candybar Configuration': 'Configuración Candybar', 'Enable Candybar Segments': 'Activar Segmentos Candybar',
    'Segment Transparency': 'Transparencia de Segmentos', 'Focus & Interaction': 'Enfoque e Interacción', 'Auto Contrast Calculation': 'Cálculo de Contraste Automático',
    'Interaction Color': 'Color de Interacción', 'Focus Opacity': 'Opacidad de Enfoque', 'Highlight Outline Effect': 'Efecto de Contorno Resaltado',
    'Horizontal Spacing': 'Espaciado Horizontal', 'Vertical Spacing': 'Espaciado Vertical', 'Geometric Parameters': 'Parámetros Geométricos',
    'Stroke Weight': 'Grosor del Borde', 'Apply Stroke to': 'Aplicar Grosor a', 'Corner Rounding': 'Redondeo de Esquinas',
    'Apply Rounding to': 'Aplicar Redondeo a', 'Border Stroke Color': 'Color del Borde', 'Stroke Transparency': 'Transparencia del Borde',
    'Neon Luminosity Glow': 'Brillo de Luminosidad Neón', 'System Popups Style': 'Estilo de Popups del Sistema',
    'Enable Specialized Popup Styles': 'Activar Estilos de Menú Especiales', 'Auto Menu Contrast': 'Contraste de Menú Automático',
    'Text Color': 'Color de Texto', 'Text Transparency': 'Transparencia de Texto', 'Background Color': 'Color de Fondo',
    'Background Transparency': 'Transparencia de Fondo', 'Surface Linear Gradient': 'Degradado Lineal de Superficie',
    'Override Secondary Menu Colors': 'Sobrescribir Menú Secundario', 'Secondary Surface': 'Superficie Secundaria',
    'Popups Geometry': 'Geometría de Popups', 'Outline Color': 'Color de Contorno', 'Outline Transparency': 'Transparencia de Contorno',
    'Dynamic Focus Calculation': 'Cálculo de Enfoque Dinámico', 'Focus Indicator': 'Indicador de Enfoque', 'Active Indicator': 'Indicador Activo',
    'Cast Shadow Color': 'Color de Sombra Proyectada', 'Cast Shadow Intensity': 'Intensidad de Sombra Proyectada',
    'Panel Edge Rounding': 'Redondeo de Bordes de Panel', 'Calendar Block Rounding': 'Redondeo de Bloques de Calendario',
    'Quick Settings Rounding': 'Redondeo de Ajustes Rápidos', 'Adjustment Sliders Verticality': 'Verticalidad de Deslizadores',
    'Docking Parameters': 'Parámetros de Dock', 'Color Synchronization': 'Sincronización de Color', 'System Default': 'Predeterminado del Sistema',
    'Sync with Popups': 'Sincronizar con Menús', 'Sync with Top Bar': 'Sincronizar con Barra Superior', 'Manual Color Specification': 'Especificación de Color Manual',
    'Manual Dock Surface': 'Superficie de Dock Manual', 'Dock Transparency': 'Transparencia del Dock', 'Perimeter Rounding': 'Redondeo Perimetral',
    'Forced Symbol Scale': 'Escala de Símbolos Forzada', 'Render Dock Outline': 'Mostrar Contorno del Dock', 'Render Dock Projection Shadow': 'Mostrar Sombra del Dock',
    'Shell Subsystem Customs': 'Personalización del Subsistema Shell', 'Theme Notifications Engine': 'Tematizar Motor de Notificaciones',
    'Theme System Popup Engine': 'Tematizar Motor de Popups', 'Propagate Accent to Shell Elements': 'Propagar Acento a Elementos del Shell',
    'Unified Shell Color Propagation': 'Propagación de Color Unificada del Shell', 'Apply Traffic Light Window Controls': 'Aplicar Controles "Traffic Light"',
    'Desktop App Integration': 'Integración de Apps de Escritorio', 'Gtk3 / Gtk4 Tunneling': 'Túnel Gtk3 / Gtk4',
    'Inject Theme into Gtk Ecosystem': 'Inyectar Tema en Ecosistema Gtk', 'Extend Support to Flatpak Sandbox': 'Extender Soporte a Flatpak',
    'Headerbar Luminosity Hint': 'Sugerencia de Brillo Headerbar', 'Sidebar Luminosity Hint': 'Sugerencia de Brillo Lateral',
    'Global Window Corner Rounding': 'Redondeo Global de Ventanas', 'Coordinate with Yaru System Palette': 'Coordinar con Paleta Yaru',
    'Maintenance Operations': 'Operaciones de Mantenimiento', 'Load Configuration Profile': 'Cargar Perfil de Configuración',
    'Deploy settings from an external source.': 'Desplegar ajustes desde una fuente externa.', 'Import': 'Importar',
    'Save Configuration Profile': 'Guardar Perfil de Configuración', 'Export current environment state.': 'Exportar estado actual del entorno.',
    'Export': 'Exportar', 'System Factory Reset': 'Restablecimiento de Fábrica', 'Revert to enterprise baseline defaults.': 'Revertir a los valores empresariales predeterminados.',
    'Factory Reset': 'Restablecer', 'Reset Environment?': '¿Restablecer Entorno?', 'All customizations will be purged.': 'Se perderán todas las personalizaciones.',
    'Apply': 'Aplicar', 'macOS Liquid': 'macOS Líquido', 'Cyberpunk Neon': 'Cyberpunk Neón', 'Pure Minimalist': 'Minimalista Puro',
    'Design Presets': 'Preajustes de Diseño', 'Apply premium styles in a single click.': 'Aplica estilos premium con un solo clic.',
    'macOS Style': 'Estilo macOS', 'Neon Style': 'Estilo Neón', 'Corporate Style': 'Estilo Corporativo',
    'Cancel': 'Cancelar', 'Reset': 'Restablecer', 'Open': 'Abrir', 'Save': 'Guardar', 'Professional Shell Customization Suite': 'Suite Profesional de Personalización del Shell',
    'System Style': 'Estilo del Sistema', 'Ecosystem': 'Ecosistema', 'Icon Theme': 'Tema de Iconos', 'GTK Theme': 'Tema de Ventanas (GTK)',
    'Install Theme from File': 'Instalar Tema desde Archivo', 'Select a .zip or .tar.gz archive': 'Selecciona un archivo .zip o .tar.gz',
    'Theme installed successfully!': '¡Tema instalado con éxito!', 'Error installing theme.': 'Error al instalar el tema.',
    'Theme Store': 'Tienda de Temas', 'Featured Icons': 'Iconos Destacados', 'Loading themes...': 'Cargando temas...',
    'Install': 'Instalar', 'Downloading...': 'Descargando...', 'Open Store': 'Abrir Tienda', 'Browse Online Themes': 'Explorar Temas Online',
    'Theme Sharing': 'Compartir Tema', 'Export to Code': 'Exportar a Código', 'Import from Code': 'Importar desde Código',
    'Paste theme code here:': 'Pega el código del tema aquí:', 'Copy this code:': 'Copia este código:',
    'Theme code is invalid.': 'El código del tema no es válido.', 'Theme applied successfully!': '¡Tema aplicado con éxito!',
    'Design Presets': 'Preajustes de Diseño'
};

const T = (text) => {
    const locale = GLib.get_language_names()[0];
    if (locale.startsWith('es')) return ES_MAP[text] || _(text);
    return _(text);
};

export default class BarEnhancedPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Professional corporate window sizing
        window.set_default_size(950, 880);
        window.can_maximize = true;
        window.can_minimize = true;

        const settings = this.getSettings();
        const interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        const prefs = new BarEnhancedPrefs(settings, interfaceSettings, this.path);
        prefs.fill(window);
    }
}

class BarEnhancedPrefs {
    constructor(settings, interfaceSettings, path) {
        this._settings = settings;
        this._interfaceSettings = interfaceSettings;
        this.path = path;
        this.timeoutId = null;
        this.quoteTimeoutId = null;
        this.quoteBlank = false;
        this.quoteIdx = 0;
        this.quotePause = false;
        this.quotes = [];
        this.colorButtons = [];
        this.paletteButtons = [];
    }

    fill(window) {
        this.loadQuotesFromFile();
        window.colorButtons = this.colorButtons;
        window.paletteButtons = this.paletteButtons;

        // --- WELCOME PAGE ---
        const welcomePage = new Adw.PreferencesPage({ title: T('Welcome'), icon_name: 'go-home-symbolic' });
        window.add(welcomePage);
        const welcomeGroup = new Adw.PreferencesGroup();
        welcomePage.add(welcomeGroup);

        const bannerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, margin_top: 24, margin_bottom: 24 });
        const logo = new Gtk.Image({ file: `${this.path}/media/openbar.svg`, pixel_size: 128, halign: Gtk.Align.CENTER });
        bannerBox.append(logo);
        const titleLabel = new Gtk.Label({
            label: `<span size="xx-large" weight="bold">Bar Enhanced</span>\n<span size="large" alpha="70%">${T('Professional Shell Customization Suite')}</span>`,
            use_markup: true, justify: Gtk.Justification.CENTER
        });
        bannerBox.append(titleLabel);
        const introGroup = new Adw.PreferencesGroup({ 
            title: T('Architecture & Design'),
            description: T('Open Bar allows you to theme the Top Bar, Pop-up Menus, Dash, Dock and the rest of the GNOME Shell environment.')
        });
        welcomePage.add(introGroup);

        const caps = [
            { title: T('Adaptive Engine'), desc: T('Extracts color palettes from your wallpaper dynamically.') },
            { title: T('Layout Architecture'), desc: T('Support for Mainland, Floating, Trilands, and Island bar styles.') },
            { title: T('Gtk Tunneling'), desc: T('Experimental styling for Gtk3, Gtk4, and Flatpak applications.') },
            { title: T('Visual Precision'), desc: T('Advanced control over borders, neon effects, and glassmorphism.') }
        ];

        caps.forEach(cap => {
            introGroup.add(new Adw.ActionRow({ title: cap.title, subtitle: cap.desc }));
        });

        const guideGroup = new Adw.PreferencesGroup({ title: T('Quick Start Guide') });
        welcomePage.add(guideGroup);
        guideGroup.add(new Adw.ActionRow({ title: T('1. Select Bar Type'), subtitle: T('Go to "Top Bar" and choose your preferred layout (e.g., Islands).') }));
        guideGroup.add(new Adw.ActionRow({ title: T('2. Apply Auto-Theme'), subtitle: T('Go to "Auto Themes", select a base mode, and click Apply.') }));
        guideGroup.add(new Adw.ActionRow({ title: T('3. Refine Aesthetics'), subtitle: T('Tweak individual colors, borders, and shadows in the following tabs.') }));

        const quoteGroup = new Adw.PreferencesGroup({ title: T('Daily Inspiration') });
        welcomePage.add(quoteGroup);
        const quoteLabel = new Gtk.Label({ label: '', use_markup: true, justify: Gtk.Justification.CENTER, wrap: true, margin_top: 10, margin_bottom: 10 });
        quoteGroup.header_widget = quoteLabel;
        this.setQuoteLabel(quoteLabel);

        // --- AUTO THEMES PAGE ---
        const autoPage = new Adw.PreferencesPage({ title: T('Auto Themes'), icon_name: 'color-select-symbolic' });
        window.add(autoPage);
        const engineGroup = new Adw.PreferencesGroup({ title: T('Theming Engine Settings') });
        autoPage.add(engineGroup);
        engineGroup.add(this.createSwitchRow('autotheme-refresh', T('Auto-Refresh on Wallpaper Change')));
        engineGroup.add(this.createSwitchRow('auto-bgalpha', T('Dynamic Opacity Calculation')));
        engineGroup.add(this.createSwitchRow('autofg-bar', T('Auto-Set Bar Foreground')));
        engineGroup.add(this.createSwitchRow('autofg-menu', T('Auto-Set Menu Foreground')));
        engineGroup.add(this.createSwitchRow('smbgoverride', T('Alternate Secondary Menu Color')));
        engineGroup.add(this.createSwitchRow('accent-override', T('Manual Accent Override')));
        const accentRow = new Adw.ActionRow({ title: T('Custom Accent Color') });
        accentRow.add_suffix(this.createColorButton(window, 'accent-color'));
        engineGroup.add(accentRow);

        const applyGroup = new Adw.PreferencesGroup({ title: T('Apply Engine Configuration') });
        autoPage.add(applyGroup);
        const applyBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10, margin_top: 10, margin_bottom: 10 });
        const darkRow = new Adw.ComboRow({ title: T('Dark Mode Base Theme') });
        const darkOptions = [['Select Theme', T('Select Theme')], ['Color', T('True Color')], ['Pastel', T('Pastel Theme')], ['Dark', T('Dark Theme')], ['Light', T('Light Theme')]];
        const darkModel = new Gtk.StringList(); darkOptions.forEach(opt => darkModel.append(opt[1])); darkRow.set_model(darkModel);
        darkRow.set_selected(darkOptions.findIndex(opt => opt[0] === this._settings.get_string('autotheme-dark')));
        darkRow.connect('notify::selected', () => this._settings.set_string('autotheme-dark', darkOptions[darkRow.get_selected()][0]));
        applyGroup.add(darkRow);

        const lightRow = new Adw.ComboRow({ title: T('Light Mode Base Theme') });
        const lightModel = new Gtk.StringList(); darkOptions.forEach(opt => lightModel.append(opt[1])); lightRow.set_model(lightModel);
        lightRow.set_selected(darkOptions.findIndex(opt => opt[0] === this._settings.get_string('autotheme-light')));
        lightRow.connect('notify::selected', () => this._settings.set_string('autotheme-light', darkOptions[lightRow.get_selected()][0]));
        applyGroup.add(lightRow);

        const autoBtn = new Gtk.Button({ 
            label: T('Apply Auto-Theme Engine'), 
            halign: Gtk.Align.CENTER, 
            margin_top: 20,
            margin_bottom: 20,
            css_classes: ['suggested-action', 'pill'] 
        });
        autoBtn.connect('clicked', () => this.triggerAutoTheme());
        applyGroup.add(autoBtn);

        const paletteGroup = new Adw.PreferencesGroup({ title: T('Extracted Color Palette') });
        autoPage.add(paletteGroup);
        const paletteBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin_top: 10, margin_bottom: 10 });
        const pBox1 = new Gtk.Box({ spacing: 6, halign: Gtk.Align.CENTER });
        const pBox2 = new Gtk.Box({ spacing: 6, halign: Gtk.Align.CENTER });
        this.createPaletteDisplay(window, pBox1, pBox2);
        paletteBox.append(pBox1); paletteBox.append(pBox2);
        const refreshBtn = new Gtk.Button({ label: T('Update Palette Data'), halign: Gtk.Align.CENTER });
        refreshBtn.connect('clicked', () => this.triggerBackgroundPalette(window));
        paletteBox.append(refreshBtn);
        paletteGroup.header_widget = paletteBox;

        // --- TOP BAR PAGE ---
        const barPage = new Adw.PreferencesPage({ title: T('Top Bar'), icon_name: 'view-paged-symbolic' });
        window.add(barPage);
        const layoutGroup = new Adw.PreferencesGroup({ title: T('Architecture & Layout') });
        barPage.add(layoutGroup);
        layoutGroup.add(this.createComboRow('bartype', T('Bar Type'), [['Mainland', T('Mainland')], ['Floating', T('Floating')], ['Trilands', T('Trilands')], ['Islands', T('Islands')]]));
        layoutGroup.add(this.createComboRow('position', T('Edge Alignment'), [['Top', T('Top')], ['Bottom', T('Bottom')]]));
        layoutGroup.add(this.createSwitchRow('set-notif-position', T('Sync Notification Position')));
        layoutGroup.add(this.createScaleRow('height', T('Bar Vertical Height'), 10, 100));
        layoutGroup.add(this.createScaleRow('margin', T('Side Horizontal Margins'), 0, 30, 0.2));
        layoutGroup.add(this.createSwitchRow('set-bottom-margin', T('Custom Bottom Margin Override')));
        layoutGroup.add(this.createScaleRow('bottom-margin', T('Bottom Margin Offset'), 0, 30, 0.2));
        layoutGroup.add(this.createSwitchRow('set-overview', T('Visibility in Overview')));
        layoutGroup.add(this.createSwitchRow('set-fullscreen', T('Visibility in Fullscreen')));
        layoutGroup.add(this.createSwitchRow('fitts-widgets', T('Fitts Law Compatibility')));

        // --- EFFICIENCY (WINDOW-MAX) ---
        const effPage = new Adw.PreferencesPage({ title: T('Efficiency'), icon_name: 'view-fullscreen-symbolic' });
        window.add(effPage);
        const wmaxGroup = new Adw.PreferencesGroup({ title: T('Maximized State Optimization') });
        effPage.add(wmaxGroup);
        wmaxGroup.add(this.createSwitchRow('wmaxbar', T('Enable Window-Max Bar Optimization')));
        wmaxGroup.add(this.createSwitchRow('wmax-hbarhint', T('Application Headerbar Color Sync')));
        wmaxGroup.add(this.createSwitchRow('cust-margin-wmax', T('Override Maximized Bar Height')));
        wmaxGroup.add(this.createScaleRow('margin-wmax', T('Maximized Bar Height'), 0, 30, 0.2));
        wmaxGroup.add(this.createSwitchRow('buttonbg-wmax', T('Preserve Button Backgrounds')));
        wmaxGroup.add(this.createSwitchRow('border-wmax', T('Preserve Borders')));

        // --- AESTHETICS (COLORS & CANDYBAR) ---
        const aesPage = new Adw.PreferencesPage({ title: T('Aesthetics'), icon_name: 'applications-graphics-symbolic' });
        window.add(aesPage);
        const cGroup = new Adw.PreferencesGroup({ title: T('Primary Colors') });
        aesPage.add(cGroup);
        const fgRow = new Adw.ActionRow({ title: T('Interface Foreground') }); fgRow.add_suffix(this.createColorButton(window, 'fgcolor')); cGroup.add(fgRow);
        cGroup.add(this.createScaleRow('fgalpha', T('Foreground Opacity'), 0, 1, 0.01));
        const bgRow = new Adw.ActionRow({ title: T('Interface Background') }); bgRow.add_suffix(this.createColorButton(window, 'bgcolor')); cGroup.add(bgRow);
        cGroup.add(this.createScaleRow('bgalpha', T('Background Opacity'), 0, 1, 0.01));
        const boxRow = new Adw.ActionRow({ title: T('Box / Sidebar Color') }); boxRow.add_suffix(this.createColorButton(window, 'boxcolor')); cGroup.add(boxRow);
        
        const gGroup = new Adw.PreferencesGroup({ title: T('Gradients & Shadows') });
        aesPage.add(gGroup);
        gGroup.add(this.createSwitchRow('gradient', T('Enable Color Gradients')));
        gGroup.add(this.createComboRow('gradient-direction', T('Direction'), [['horizontal', T('Horizontal')], ['vertical', T('Vertical')]]));
        gGroup.add(this.createSwitchRow('shadow', T('Enable Panel Shadow')));
        const shRow = new Adw.ActionRow({ title: T('Shadow Color') }); shRow.add_suffix(this.createColorButton(window, 'shcolor')); gGroup.add(shRow);
        gGroup.add(this.createScaleRow('shalpha', T('Shadow Intensity'), 0, 1, 0.01));

        const candyGroup = new Adw.PreferencesGroup({ title: T('Candybar Configuration') });
        aesPage.add(candyGroup);
        candyGroup.add(this.createSwitchRow('candybar', T('Enable Candybar Segments')));
        candyGroup.add(this.createScaleRow('candyalpha', T('Segment Transparency'), 0, 1, 0.01));
        const candyBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin_top: 10 });
        const cBox1 = new Gtk.Box({ spacing: 4, halign: Gtk.Align.CENTER });
        const cBox2 = new Gtk.Box({ spacing: 4, halign: Gtk.Align.CENTER });
        for(let i=1; i<=16; i++) { (i<=8?cBox1:cBox2).append(this.createColorButton(window, 'candy'+i)); }
        candyBox.append(cBox1); candyBox.append(cBox2);
        candyGroup.header_widget = candyBox;

        // --- HIGHLIGHTS PAGE ---
        const highPage = new Adw.PreferencesPage({ title: T('Highlights'), icon_name: 'preferences-desktop-wallpaper-symbolic' });
        window.add(highPage);
        const hGroup = new Adw.PreferencesGroup({ title: T('Focus & Interaction') });
        highPage.add(hGroup);
        hGroup.add(this.createSwitchRow('autohg-bar', T('Auto Contrast Calculation')));
        const hRow = new Adw.ActionRow({ title: T('Interaction Color') }); hRow.add_suffix(this.createColorButton(window, 'hcolor')); hGroup.add(hRow);
        hGroup.add(this.createScaleRow('halpha', T('Focus Opacity'), 0, 1, 0.01));
        hGroup.add(this.createSwitchRow('heffect', T('Highlight Outline Effect')));
        hGroup.add(this.createScaleRow('hpad', T('Horizontal Spacing'), 0, 30, 0.5));
        hGroup.add(this.createScaleRow('vpad', T('Vertical Spacing'), 0, 20, 0.5));

        // --- BORDERS PAGE ---
        const bordPage = new Adw.PreferencesPage({ title: T('Borders'), icon_name: 'border-all-symbolic' });
        window.add(bordPage);
        const bGroup = new Adw.PreferencesGroup({ title: T('Geometric Parameters') });
        bordPage.add(bGroup);
        bGroup.add(this.createScaleRow('bwidth', T('Stroke Weight'), 0, 10, 0.1));
        const sideBox = new Gtk.Box({ spacing: 5, halign: Gtk.Align.END });
        sideBox.append(this.createToggleButton('T', 'width-top')); sideBox.append(this.createToggleButton('B', 'width-bottom'));
        sideBox.append(this.createToggleButton('L', 'width-left')); sideBox.append(this.createToggleButton('R', 'width-right'));
        const sideRow = new Adw.ActionRow({ title: T('Apply Stroke to') }); sideRow.add_suffix(sideBox); bGroup.add(sideRow);

        bGroup.add(this.createScaleRow('bradius', T('Corner Rounding'), 0, 50));
        const radBox = new Gtk.Box({ spacing: 5, halign: Gtk.Align.END });
        radBox.append(this.createToggleButton('TL', 'radius-topleft')); radBox.append(this.createToggleButton('TR', 'radius-topright'));
        radBox.append(this.createToggleButton('BL', 'radius-bottomleft')); radBox.append(this.createToggleButton('BR', 'radius-bottomright'));
        const radRow = new Adw.ActionRow({ title: T('Apply Rounding to') }); radRow.add_suffix(radBox); bGroup.add(radRow);
        
        const bColRow = new Adw.ActionRow({ title: T('Border Stroke Color') }); bColRow.add_suffix(this.createColorButton(window, 'bcolor')); bGroup.add(bColRow);
        bGroup.add(this.createScaleRow('balpha', T('Stroke Transparency'), 0, 1, 0.01));
        bGroup.add(this.createSwitchRow('neon', T('Neon Luminosity Glow')));

        // --- POPUP MENUS PAGE ---
        const menuPage = new Adw.PreferencesPage({ title: T('Menus'), icon_name: 'open-menu-symbolic' });
        window.add(menuPage);
        const mGroup = new Adw.PreferencesGroup({ title: T('System Popups Style') });
        menuPage.add(mGroup);
        mGroup.add(this.createSwitchRow('menustyle', T('Enable Specialized Popup Styles')));
        mGroup.add(this.createSwitchRow('autofg-menu', T('Auto Foreground Contrast')));
        const mfgRow = new Adw.ActionRow({ title: T('Text Color') }); mfgRow.add_suffix(this.createColorButton(window, 'mfgcolor')); mGroup.add(mfgRow);
        mGroup.add(this.createScaleRow('mfgalpha', T('Text Transparency'), 0, 1, 0.01));
        const mbgRow = new Adw.ActionRow({ title: T('Background Color') }); mbgRow.add_suffix(this.createColorButton(window, 'mbgcolor')); mGroup.add(mbgRow);
        mGroup.add(this.createScaleRow('mbgalpha', T('Background Transparency'), 0, 1, 0.01));
        mGroup.add(this.createSwitchRow('mbg-gradient', T('Surface Linear Gradient')));
        mGroup.add(this.createSwitchRow('smbgoverride', T('Secondary Palette Override')));
        const smRow = new Adw.ActionRow({ title: T('Secondary Surface') }); smRow.add_suffix(this.createColorButton(window, 'smbgcolor')); mGroup.add(smRow);
        const tileDivRow = new Adw.ActionRow({ title: T('Tile Division Color') }); tileDivRow.add_suffix(this.createColorButton(window, 'qtile-border')); mGroup.add(tileDivRow);
        
        const mBordGroup = new Adw.PreferencesGroup({ title: T('Popups Geometry') });
        menuPage.add(mBordGroup);
        const mbColRow = new Adw.ActionRow({ title: T('Outline Color') }); mbColRow.add_suffix(this.createColorButton(window, 'mbcolor')); mBordGroup.add(mbColRow);
        mBordGroup.add(this.createScaleRow('mbalpha', T('Outline Transparency'), 0, 1, 0.01));
        mBordGroup.add(this.createSwitchRow('autohg-menu', T('Dynamic Focus Calculation')));
        const mhRow = new Adw.ActionRow({ title: T('Focus Indicator') }); mhRow.add_suffix(this.createColorButton(window, 'mhcolor')); mBordGroup.add(mhRow);
        const msRow = new Adw.ActionRow({ title: T('Active Indicator') }); msRow.add_suffix(this.createColorButton(window, 'mscolor')); mBordGroup.add(msRow);
        const mshRow = new Adw.ActionRow({ title: T('Cast Shadow Color') }); mshRow.add_suffix(this.createColorButton(window, 'mshcolor')); mBordGroup.add(mshRow);
        mBordGroup.add(this.createScaleRow('mshalpha', T('Cast Shadow Intensity'), 0, 1, 0.01));
        mBordGroup.add(this.createScaleRow('menu-radius', T('Panel Edge Rounding'), 0, 50));
        mBordGroup.add(this.createScaleRow('notif-radius', T('Calendar Block Rounding'), 0, 50));
        mBordGroup.add(this.createScaleRow('qtoggle-radius', T('Quick Settings Rounding'), 0, 50));
        mBordGroup.add(this.createScaleRow('slider-height', T('Adjustment Sliders Verticality'), 1, 20));

        // --- DASH & DOCK PAGE ---
        const dashPage = new Adw.PreferencesPage({ title: T('Dash & Dock'), icon_name: 'phone-symbolic' });
        window.add(dashPage);
        const dGroup = new Adw.PreferencesGroup({ title: T('Docking Parameters') });
        dashPage.add(dGroup);
        dGroup.add(this.createComboRow('dashdock-style', T('Color Synchronization'), [['Default', T('Native Theme')], ['Menu', T('Sync with Popups')], ['Bar', T('Sync with Top Bar')], ['Custom', T('Manual Color Specification')]]));
        const dbgRow = new Adw.ActionRow({ title: T('Manual Dock Surface') }); dbgRow.add_suffix(this.createColorButton(window, 'dbgcolor')); dGroup.add(dbgRow);
        dGroup.add(this.createScaleRow('dbgalpha', T('Dock Transparency'), 0, 1, 0.01));
        dGroup.add(this.createScaleRow('dbradius', T('Perimeter Rounding'), 0, 100));
        dGroup.add(this.createScaleRow('disize', T('Forced Symbol Scale'), 16, 96));
        dGroup.add(this.createSwitchRow('dborder', T('Render Dock Outline')));
        dGroup.add(this.createSwitchRow('dshadow', T('Render Dock Projection Shadow')));

        // --- SYSTEM INTEGRATION ---
        const sysPage = new Adw.PreferencesPage({ title: T('System'), icon_name: 'preferences-desktop-screensaver-symbolic' });
        window.add(sysPage);
        const sGroup = new Adw.PreferencesGroup({ title: T('Shell Subsystem Customs') });
        sysPage.add(sGroup);
        sGroup.add(this.createSwitchRow('apply-menu-notif', T('Theme Notifications Engine')));
        sGroup.add(this.createSwitchRow('apply-menu-shell', T('Theme System Popup Engine')));
        sGroup.add(this.createSwitchRow('apply-accent-shell', T('Propagate Accent to Shell Elements')));
        sGroup.add(this.createSwitchRow('apply-all-shell', T('Unified Shell Color Propagation')));
        sGroup.add(this.createSwitchRow('traffic-light', T('Apply Traffic Light Window Controls')));

        // --- APPS (EXPERIMENTAL) ---
        const appsPage = new Adw.PreferencesPage({ title: T('Apps'), icon_name: 'application-x-executable-symbolic' });
        window.add(appsPage);
        const appGroup = new Adw.PreferencesGroup({ title: T('Desktop App Integration') });
        appsPage.add(appGroup);
        appGroup.add(this.createSwitchRow('apply-gtk', T('Inject Theme into Gtk Ecosystem')));
        appGroup.add(this.createSwitchRow('apply-flatpak', T('Extend Support to Flatpak Sandbox')));
        appGroup.add(this.createScaleRow('headerbar-hint', T('Headerbar Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('sidebar-hint', T('Sidebar Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('winbradius', T('Global Window Corner Rounding'), 0, 25));
        appGroup.add(this.createSwitchRow('set-yarutheme', T('Coordinate with Yaru System Palette')));

        // --- ADMINISTRATION ---
        const adminPage = new Adw.PreferencesPage({ title: T('Admin'), icon_name: 'system-run-symbolic' });
        window.add(adminPage);

        // Assets Management (Moved from Ecosystem)
        const assetGroup = new Adw.PreferencesGroup({ title: T('System Style'), description: T('Manage your icons and window themes.') });
        adminPage.add(assetGroup);

        const iconRow = new Adw.ComboRow({ title: T('Icon Theme') });
        const icons = this.getInstalledAssets('icons');
        const iconModel = new Gtk.StringList(); icons.forEach(i => iconModel.append(i));
        iconRow.set_model(iconModel);
        iconRow.set_selected(icons.indexOf(this._interfaceSettings.get_string('icon-theme')));
        iconRow.connect('notify::selected', () => {
            this._interfaceSettings.set_string('icon-theme', icons[iconRow.get_selected()]);
        });
        assetGroup.add(iconRow);

        const gtkRow = new Adw.ComboRow({ title: T('GTK Theme') });
        const gtkThemes = this.getInstalledAssets('themes');
        const gtkModel = new Gtk.StringList(); gtkThemes.forEach(t => gtkModel.append(t));
        gtkRow.set_model(gtkModel);
        gtkRow.set_selected(gtkThemes.indexOf(this._interfaceSettings.get_string('gtk-theme')));
        gtkRow.connect('notify::selected', () => {
            this._interfaceSettings.set_string('gtk-theme', gtkThemes[gtkRow.get_selected()]);
        });
        assetGroup.add(gtkRow);

        const installRow = new Adw.ActionRow({ title: T('Install Theme from File'), subtitle: T('Select a .zip or .tar.gz archive.') });
        const installBtn = new Gtk.Button({ label: T('Open'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        installBtn.connect('clicked', () => this.installAssetDialog(window, iconRow, gtkRow));
        installRow.add_suffix(installBtn); assetGroup.add(installRow);

        // Theme Store Trigger (Moved to Modal)
        const storeRow = new Adw.ActionRow({ title: T('Theme Store'), subtitle: T('Browse Online Themes') });
        const storeBtn = new Gtk.Button({ label: T('Open Store'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        storeBtn.connect('clicked', () => this.openStoreModal(window, iconRow));
        storeRow.add_suffix(storeBtn); assetGroup.add(storeRow);

        const adminGroup = new Adw.PreferencesGroup({ title: T('Maintenance Operations') });
        adminPage.add(adminGroup);
        const impRow = new Adw.ActionRow({ title: T('Load Configuration Profile'), subtitle: T('Deploy settings from an external source.') });
        const impBtn = new Gtk.Button({ label: T('Import'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        impBtn.connect('clicked', () => this.importSettings(window)); impRow.add_suffix(impBtn); adminGroup.add(impRow);
        const expRow = new Adw.ActionRow({ title: T('Save Configuration Profile'), subtitle: T('Export current environment state.') });
        const expBtn = new Gtk.Button({ label: T('Export'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        expBtn.connect('clicked', () => this.exportSettings(window)); expRow.add_suffix(expBtn); adminGroup.add(expRow);

        const shareGroup = new Adw.PreferencesGroup({ title: T('Theme Sharing') });
        adminPage.add(shareGroup);
        const codeExpRow = new Adw.ActionRow({ title: T('Export to Code'), subtitle: T('Generate a shareable text string of your style.') });
        const codeExpBtn = new Gtk.Button({ label: T('Export'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        codeExpBtn.connect('clicked', () => this.exportToCode(window));
        codeExpRow.add_suffix(codeExpBtn); shareGroup.add(codeExpRow);
        const codeImpRow = new Adw.ActionRow({ title: T('Import from Code'), subtitle: T('Apply a style from a shared text string.') });
        const codeImpBtn = new Gtk.Button({ label: T('Import'), valign: Gtk.Align.CENTER, css_classes: ['pill'] });
        codeImpBtn.connect('clicked', () => this.importFromCode(window));
        codeImpRow.add_suffix(codeImpBtn); shareGroup.add(codeImpRow);

        const resRow = new Adw.ActionRow({ title: T('System Factory Reset'), subtitle: T('Revert to enterprise baseline defaults.') });
        const resBtn = new Gtk.Button({ label: T('Factory Reset'), valign: Gtk.Align.CENTER, css_classes: ['destructive-action', 'pill'] });
        resBtn.connect('clicked', () => this.resetSettingsDialog(window)); resRow.add_suffix(resBtn); adminGroup.add(resRow);

        window.connect('unrealize', () => {
            if (this.quoteTimeoutId) clearTimeout(this.quoteTimeoutId);
        });
    }

    // --- HELPER METHODS ---

    createSwitchRow(key, title, subtitle = '') {
        const row = new Adw.SwitchRow({ title, subtitle });
        this._settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        row.connect('notify::active', () => this.setTimeoutStyleReload());
        return row;
    }

    createScaleRow(key, title, lower, upper, step = 1) {
        const row = new Adw.ActionRow({ title });
        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({ lower, upper, step_increment: step }),
            digits: step < 1 ? 2 : 0, draw_value: true, value_pos: Gtk.PositionType.RIGHT, width_request: 180, valign: Gtk.Align.CENTER
        });
        this._settings.bind(key, scale.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        scale.connect('value-changed', () => this.setTimeoutStyleReload());
        row.add_suffix(scale);
        return row;
    }

    createComboRow(key, title, options) {
        const row = new Adw.ComboRow({ title });
        const model = new Gtk.StringList();
        options.forEach(opt => model.append(opt[1]));
        row.set_model(model);
        const currentId = this._settings.get_string(key);
        const currentIndex = options.findIndex(opt => opt[0] === currentId);
        if (currentIndex !== -1) row.set_selected(currentIndex);
        row.connect('notify::selected', () => {
            this._settings.set_string(key, options[row.get_selected()][0]);
            this.setTimeoutStyleReload();
        });
        return row;
    }

    createColorButton(window, key) {
        const btn = new Gtk.ColorButton({ valign: Gtk.Align.CENTER });
        const colorArray = this._settings.get_strv(key);
        if (colorArray.length >= 3) {
            btn.set_rgba(new Gdk.RGBA({ red: parseFloat(colorArray[0]), green: parseFloat(colorArray[1]), blue: parseFloat(colorArray[2]), alpha: 1.0 }));
        }
        btn.connect('color-set', () => {
            const r = btn.get_rgba();
            const vals = [r.red.toFixed(3), r.green.toFixed(3), r.blue.toFixed(3)];
            this._settings.set_strv(key, vals);
            const prefix = this._settings.get_string('color-scheme') === 'prefer-dark' ? 'dark-' : 'light-';
            this._settings.set_strv(`${prefix}${key}`, vals);
            this.triggerStyleReload();
        });
        this._settings.connect(`changed::${key}`, () => {
            const c = this._settings.get_strv(key);
            btn.set_rgba(new Gdk.RGBA({ red: parseFloat(c[0]), green: parseFloat(c[1]), blue: parseFloat(c[2]), alpha: 1.0 }));
        });
        btn.add_palette(Gtk.Orientation.VERTICAL, 5, this.createDefaultPaletteArray());
        btn.add_palette(Gtk.Orientation.HORIZONTAL, 6, this.createBgPaletteArray());
        window.colorButtons.push(btn);
        return btn;
    }

    createDefaultPaletteArray() {
        const hexs = ["99c1f1", "62a0ea", "3584e4", "1c71d8", "1a5fb4", "8ff0a4", "57e389", "33d17a", "2ec27e", "26a269", "f9f06b", "f8e45c", "f6d32d", "f5c211", "e5a50a", "ffbe6f", "ffa348", "ff7800", "e66100", "c64600", "f66151", "ed333b", "e01b24", "c01c28", "a51d2d", "dc8add", "c061cb", "9141ac", "813d9c", "613583", "cdab8f", "b5835a", "986a44", "865e3c", "63452c", "ffffff", "f6f5f4", "deddda", "c0bfbc", "9a9996", "77767b", "5e5c64", "3d3846", "241f31", "000000"];
        return hexs.map(h => {
            let b = parseInt(h, 16);
            return new Gdk.RGBA({ red: ((b >> 16) & 255) / 255, green: ((b >> 8) & 255) / 255, blue: (b & 255) / 255, alpha: 1.0 });
        });
    }

    createBgPaletteArray() {
        let arr = [];
        for (let i = 1; i <= 12; i++) {
            let p = this._settings.get_strv('palette' + i);
            arr.push(new Gdk.RGBA({ red: parseFloat(p[0]) / 255, green: parseFloat(p[1]) / 255, blue: parseFloat(p[2]) / 255, alpha: 1.0 }));
        }
        return arr;
    }

    createToggleButton(label, key, tooltip = '') {
        const btn = new Gtk.ToggleButton({ label, tooltip_text: tooltip, valign: Gtk.Align.CENTER });
        this._settings.bind(key, btn, 'active', Gio.SettingsBindFlags.DEFAULT);
        btn.connect('toggled', () => this.setTimeoutStyleReload());
        return btn;
    }

    createPaletteDisplay(window, box1, box2) {
        const clipboard = Gdk.Display.get_default().get_clipboard();
        for (let i = 1; i <= 12; i++) {
            const p = this._settings.get_strv('palette' + i);
            const hex = this.rgbToHex(p[0], p[1], p[2]);
            const label = new Gtk.Label({ label: `<span bgcolor="${hex}" font_size="150%">       </span>`, use_markup: true });
            const btn = new Gtk.Button({ child: label, tooltip_text: hex });
            btn.connect('clicked', () => clipboard.set(hex));
            (i <= 6 ? box1 : box2).append(btn);
            window.paletteButtons.push(btn);
        }
    }

    rgbToHex(r, g, b) { return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1); }

    triggerBackgroundPalette(window) {
        window.paletteButtons.forEach(b => b.child.label = '<span bgcolor="#7d7d7d" font_size="150%">       </span>');
        let p = this._settings.get_boolean('bgpalette');
        this._settings.set_boolean('bgpalette', !p);
        setTimeout(() => {
            let i = 1;
            window.paletteButtons.forEach(b => {
                const c = this._settings.get_strv('palette' + i++);
                b.child.label = `<span bgcolor="${this.rgbToHex(c[0], c[1], c[2])}" font_size="150%">       </span>`;
            });
        }, 500);
    }

    triggerAutoTheme() {
        let t = this._settings.get_boolean('trigger-autotheme');
        this._settings.set_boolean('trigger-autotheme', !t);
    }

    triggerStyleReload() {
        let r = this._settings.get_boolean('trigger-reload');
        this._settings.set_boolean('trigger-reload', !r);
    }

    setTimeoutStyleReload() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => { this.triggerStyleReload(); this.timeoutId = null; }, 400);
    }

    loadQuotesFromFile() {
        try {
            const f = Gio.File.new_for_path(this.path + '/media/BarEnhancedQuotes.txt');
            const [ok, c] = f.load_contents(null);
            const q = new TextDecoder('utf-8').decode(c);
            this.quotes = q.split('\n').map(x => x.split(/(?=~)/g));
            for (let i = this.quotes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.quotes[i], this.quotes[j]] = [this.quotes[j], this.quotes[i]];
            }
        } catch (e) { this.quotes = [["Welcome to Bar Enhanced", " - MrVanguardia"]]; }
    }

    setQuoteLabel(l) {
        if (this.quotePause) return;
        if (this.quoteBlank) l.label = '';
        else {
            if (this.quoteIdx >= this.quotes.length) this.quoteIdx = 0;
            l.label = `<span size="medium" allow_breaks="true">${this.quotes[this.quoteIdx][0]}\n${this.quotes[this.quoteIdx++][1]}</span>`;
        }
        const t = this.quoteBlank ? 500 : 10500;
        if (this.quoteTimeoutId) clearTimeout(this.quoteTimeoutId);
        this.quoteTimeoutId = setTimeout(() => this.setQuoteLabel(l), t);
        this.quoteBlank = !this.quoteBlank;
    }

    importSettings(window) {
        let f = new Gtk.FileChooserDialog({ title: T("Import Configuration"), action: Gtk.FileChooserAction.OPEN, transient_for: window });
        f.add_button(T("Cancel"), Gtk.ResponseType.CANCEL); f.add_button(T("Open"), Gtk.ResponseType.ACCEPT);
        f.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                // Force direct dconf load into the specific path to bypass schema strictness
                GLib.spawn_command_line_sync(`dconf load /org/gnome/shell/extensions/barEnhanced/ < "${f.get_file().get_path()}"`);
                this.setTimeoutStyleReload();
            }
            f.destroy();
        });
        f.show();
    }

    exportSettings(window) {
        let f = new Gtk.FileChooserDialog({ title: T("Export Configuration"), action: Gtk.FileChooserAction.SAVE, transient_for: window });
        f.add_button(T("Cancel"), Gtk.ResponseType.CANCEL); f.add_button(T("Save"), Gtk.ResponseType.ACCEPT);
        f.set_current_name("bar_enhanced_config"); // Nombre por defecto
        f.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                let path = f.get_file().get_path();
                // Export from the correct path to ensure the file is valid for future imports
                GLib.spawn_command_line_sync(`sh -c 'dconf dump /org/gnome/shell/extensions/barEnhanced/ > "${path}"'`);
            }
            f.destroy();
        });
        f.show();
    }

    applyPreset(id) {
        const p = {
            macos: {
                'bartype': 'Islands', 'bradius': 30.0, 'iscolor': ['1.0', '1.0', '1.0'], 'isalpha': 0.25,
                'bwidth': 1.0, 'bcolor': ['1.0', '1.0', '1.0'], 'balpha': 0.3,
                'margin': 10.0, 'height': 38.0, 'shadow': true, 'shalpha': 0.3,
                'heffect': true, 'halpha': 0.1, 'hcolor': ['1.0', '1.0', '1.0']
            },
            neon: {
                'bartype': 'Islands', 'bradius': 6.0, 'iscolor': ['0.05', '0.05', '0.1'], 'isalpha': 0.9,
                'bwidth': 3.0, 'bcolor': ['1.0', '0.0', '1.0'], 'balpha': 1.0, 'neon': true,
                'hcolor': ['0.0', '1.0', '1.0'], 'halpha': 0.8, 'heffect': true, 'margin': 5.0
            },
            minimal: {
                'bartype': 'Mainland', 'bradius': 0.0, 'bgalpha': 0.0, 'bwidth': 0.0, 'shadow': false,
                'heffect': false, 'margin': 10.0, 'height': 32.0
            }
        };
        const settings = p[id];
        if (settings) {
            Object.keys(settings).forEach(k => {
                const val = settings[k];
                if (Array.isArray(val)) this._settings.set_strv(k, val);
                else if (typeof val === 'string') this._settings.set_string(k, val);
                else if (typeof val === 'boolean') this._settings.set_boolean(k, val);
                else if (typeof val === 'number') {
                    if (Number.isInteger(val)) this._settings.set_int(k, val);
                    else this._settings.set_double(k, val);
                }
            });
            this.setTimeoutStyleReload();
        }
    }

    resetSettingsDialog(window) {
        let d = new Gtk.MessageDialog({ modal: true, text: T("Reset Environment?"), secondary_text: T("All customizations will be purged."), transient_for: window });
        d.add_button(T("Cancel"), Gtk.ResponseType.CANCEL); d.add_button(T("Reset"), Gtk.ResponseType.YES);
        d.connect("response", (d, r) => {
            if (r == Gtk.ResponseType.YES) {
                this._settings.list_keys().forEach(k => { if (!['import-export', 'default-font'].includes(k)) this._settings.reset(k); });
                this.setTimeoutStyleReload();
            }
            d.destroy();
        });
        d.show();
    }

    exportToCode(window) {
        let data = {};
        this._settings.list_keys().forEach(k => {
            if (['import-export', 'default-font'].includes(k)) return;
            data[k] = this._settings.get_value(k).deep_unpack();
        });
        const code = btoa(JSON.stringify(data));
        let d = new Gtk.MessageDialog({ modal: true, title: T('Export to Code'), transient_for: window });
        let entry = new Gtk.Entry({ text: code, editable: false, margin_top: 10 });
        d.get_content_area().append(new Gtk.Label({ label: T('Copy this code:'), halign: Gtk.Align.START }));
        d.get_content_area().append(entry);
        d.add_button(_("Close"), Gtk.ResponseType.CLOSE);
        d.show();
    }

    importFromCode(window) {
        let d = new Gtk.MessageDialog({ modal: true, title: T('Import from Code'), transient_for: window });
        let entry = new Gtk.Entry({ placeholder_text: T('Paste theme code here:'), margin_top: 10 });
        d.get_content_area().append(entry);
        d.add_button(T("Cancel"), Gtk.ResponseType.CANCEL);
        d.add_button(T("Import"), Gtk.ResponseType.ACCEPT);
        d.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                try {
                    let data = JSON.parse(atob(entry.text));
                    Object.keys(data).forEach(k => {
                        this._settings.set_value(k, new GLib.Variant(this._settings.get_settings_schema().get_key(k).get_value_type().dup_string(), data[k]));
                    });
                    this.setTimeoutStyleReload();
                } catch (e) { console.error(e); }
            }
            d.destroy();
        });
        d.show();
    }

    getInstalledAssets(type) {
        const dirs = [
            GLib.get_home_dir() + '/.local/share/' + type,
            '/usr/share/' + type
        ];
        let assets = [];
        dirs.forEach(path => {
            try {
                let dir = GLib.Dir.open(path, 0);
                let name;
                while ((name = dir.read_name())) {
                    if (name !== '.' && name !== '..' && !assets.includes(name)) assets.push(name);
                }
            } catch (e) {}
        });
        return assets.sort();
    }

    installAssetDialog(window, iconRow, gtkRow) {
        let f = new Gtk.FileChooserDialog({ title: T("Install Theme from File"), action: Gtk.FileChooserAction.OPEN, transient_for: window });
        f.add_button(T("Cancel"), Gtk.ResponseType.CANCEL); f.add_button(T("Open"), Gtk.ResponseType.ACCEPT);
        f.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                this.installAsset(f.get_file().get_path(), () => {
                    const icons = this.getInstalledAssets('icons');
                    const iconModel = new Gtk.StringList(); icons.forEach(i => iconModel.append(i));
                    iconRow.set_model(iconModel);
                    const gtkThemes = this.getInstalledAssets('themes');
                    const gtkModel = new Gtk.StringList(); gtkThemes.forEach(t => gtkModel.append(t));
                    gtkRow.set_model(gtkModel);
                });
            }
            f.destroy();
        });
        f.show();
    }

    downloadAndInstall(url, name, callback) {
        const tempPath = `/tmp/${name.replace(/\s+/g, '_')}.tar.gz`;
        const proc = Gio.Subprocess.new(
            ['curl', '-L', url, '-o', tempPath],
            Gio.SubprocessFlags.NONE
        );
        
        proc.wait_async(null, (p, res) => {
            try {
                p.wait_finish(res);
                this.installAsset(tempPath, callback);
            } catch (e) {
                console.error('Download failed:', e);
            }
        });
    }

    installAsset(filePath, callback) {
        const destDir = filePath.toLowerCase().includes('icon') 
            ? GLib.get_home_dir() + '/.local/share/icons' 
            : GLib.get_home_dir() + '/.local/share/themes';
        
        GLib.mkdir_with_parents(destDir, 0o755);
        
        const extractCmd = filePath.endsWith('.zip')
            ? ['unzip', '-o', filePath, '-d', destDir]
            : ['tar', '-xf', filePath, '-C', destDir];

        const proc = Gio.Subprocess.new(extractCmd, Gio.SubprocessFlags.NONE);
        proc.wait_async(null, (p, res) => {
            try {
                p.wait_finish(res);
                if (callback) callback();
            } catch (e) {
                console.error('Installation failed:', e);
            }
        });
    }

    openStoreModal(parent, iconRow) {
        const storeWindow = new Adw.Window({ 
            title: T('Theme Store'), 
            modal: true, 
            transient_for: parent, 
            default_width: 500, 
            default_height: 600 
        });
        const toolbarView = new Adw.ToolbarView();
        const header = new Adw.HeaderBar();
        toolbarView.add_top_bar(header);
        
        const scroll = new Gtk.ScrolledWindow({ vexpand: true });
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ 
            title: T('Featured Icons'), 
            description: T('Download community icons.') 
        });
        group.set_margin_start(24);
        group.set_margin_end(24);
        group.set_margin_top(12);
        
        page.add(group);
        scroll.set_child(page);
        toolbarView.set_content(scroll);
        storeWindow.set_content(toolbarView);

        const loadingLabel = new Gtk.Label({ label: T('Loading themes...'), margin_top: 20 });
        group.add(loadingLabel);
        
        this.fetchOnlineThemes(group, loadingLabel, iconRow);
        storeWindow.show();
    }

    fetchOnlineThemes(group, loadingLabel, iconRow) {
        const session = new Soup.Session();
        const url = 'https://www.pling.com/ocs/v1/content/data?categories=121&sort=rating&pagesize=100&format=json';
        const message = Soup.Message.new('GET', url);
        message.request_headers.append('User-Agent', 'Bar-Enhanced-Extension/1.0');
        
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, res) => {
            let data = null;
            try {
                const bytes = session.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const jsonText = decoder.decode(bytes.get_data());
                const response = JSON.parse(jsonText);
                data = response.ocs.data.content;
            } catch (e) {
                console.error('API Error, using fallback list:', e);
                data = [
                    { name: 'WhiteSur Icons', previewpic1: 'https://www.pling.com/img/d/7/4/1/f45a05b38d39369a4736f88f24a0d92f9f1b.png', downloadlink1: 'https://github.com/vinceliuice/WhiteSur-icon-theme/archive/refs/heads/master.tar.gz' },
                    { name: 'Tela Circle Icons', previewpic1: 'https://www.pling.com/img/5/0/0/2/026859e43673c6833b666a012c478a29b43d.png', downloadlink1: 'https://github.com/vinceliuice/Tela-circle-icon-theme/archive/refs/heads/master.tar.gz' },
                    { name: 'Papirus Icons', previewpic1: 'https://www.pling.com/img/7/2/6/4/d17a3a60a80e194a821e905d400269357494.png', downloadlink1: 'https://github.com/PapirusDevelopmentTeam/papirus-icon-theme/archive/refs/heads/master.tar.gz' },
                    { name: 'Fluent Icons', previewpic1: 'https://www.pling.com/img/6/0/4/b/e26859e43673c6833b666a012c478a29b43d.png', downloadlink1: 'https://github.com/vinceliuice/Fluent-icon-theme/archive/refs/heads/master.tar.gz' }
                ];
            }

            if (!data || (Array.isArray(data) && data.length === 0)) {
                loadingLabel.set_label(T('No themes found or API error.'));
                return;
            }

            group.remove(loadingLabel);
            const themes = Array.isArray(data) ? data : [data];
            const installedIcons = this.getInstalledAssets('icons');

            themes.forEach((item) => {
                const name = item.name;
                const link = item.downloadlink1;
                const preview = item.previewpic1 || item.previewpic2;
                if (!link || link.length < 10) return;
                
                // Check if already installed (simple name match)
                const isInstalled = installedIcons.some(i => name.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(name.toLowerCase()));

                const row = new Adw.ActionRow({ title: name });
                
                if (preview) {
                    const picture = new Gtk.Picture({ 
                        can_shrink: true, 
                        width_request: 64, 
                        height_request: 64,
                        margin_end: 12,
                        halign: Gtk.Align.START,
                        valign: Gtk.Align.CENTER,
                        file: Gio.File.new_for_uri(preview),
                        css_classes: ['store-preview']
                    });
                    row.add_prefix(picture);
                }

                const btn = new Gtk.Button({ 
                    label: isInstalled ? T('Installed') : T('Install'), 
                    valign: Gtk.Align.CENTER, 
                    css_classes: isInstalled ? ['pill', 'flat'] : ['pill', 'suggested-action'],
                    sensitive: !isInstalled
                });

                btn.connect('clicked', () => {
                    btn.set_sensitive(false);
                    btn.set_label(T('Downloading...'));
                    this.downloadAndInstall(link, name, () => {
                        btn.set_label(T('Installed'));
                        btn.add_css_class('flat');
                        const icons = this.getInstalledAssets('icons');
                        const iconModel = new Gtk.StringList(); icons.forEach(i => iconModel.append(i));
                        iconRow.set_model(iconModel);
                    });
                });
                row.add_suffix(btn);
                group.add(row);
            });
        });
    }

    // Remote image loading is now handled natively by Gtk.Picture.file

    downloadAndInstall(url, name, callback) {
        const tempPath = `/tmp/${name}.tar.gz`;
        GLib.spawn_command_line_async(`curl -L "${url}" -o "${tempPath}"`);
        setTimeout(() => {
            this.installAsset(tempPath, callback);
        }, 5000);
    }
}
