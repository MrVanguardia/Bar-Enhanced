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

import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import GdkPixbuf from 'gi://GdkPixbuf';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { fillMusicPillPreferences } from './dynamic-music-pill-prefs.js';
import { fillVitalsPreferences } from './vitals-prefs.js';
import { fillBluetoothBatteryPreferences } from './bluetooth-battery-prefs.js';

const SCHEMA_PATH = '/org/gnome/shell/extensions/bar-enhanced/';

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
    'Glassmorphism translúcido': 'Glassmorphism translúcido', 'Our custom transparency and background blur graphics engine.': 'Nuestro motor gráfico personalizado de transparencia y desenfoque de fondo.',
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
    'Design Presets': 'Preajustes de Diseño', 'Search themes...': 'Buscar temas...', 'Featured Themes & Icons': 'Iconos y Temas Destacados',
    'Download community styles.': 'Descarga estilos de la comunidad.', 'Searching for': 'Buscando', 'Search failed.': 'Búsqueda fallida.',
    'Interface Font': 'Fuente de la Interfaz', 'Select custom font for the shell.': 'Selecciona una fuente personalizada para el shell.',
    'Reset Font': 'Restablecer Fuente', 'Reset to default system font.': 'Restablecer a la fuente predeterminada del sistema.',
    'Auto-Set Bar foreground color': 'Auto-Ajustar Texto de Barra', 'Auto-Set Menu foreground color': 'Auto-Ajustar Texto de Menú',
    'True Color': 'Color Real', 'Pastel Theme': 'Tema Pastel', 'Dark Theme': 'Tema Oscuro', 'Light Theme': 'Tema Claro',
    'Select Theme': 'Seleccionar Tema', 'Export Format': 'Formato de Exportación',
    'Choose the format for your configuration profile:': 'Elige el formato para tu perfil de configuración:',
    'JSON (Modern/Full)': 'JSON (Moderno/Completo)', 'TXT (Legacy/Dconf)': 'TXT (Legado/Dconf)',
    'Export as JSON': 'Exportar como JSON', 'Export as TXT': 'Exportar como TXT',
    'Import Successful': 'Importación Exitosa', 'Import Failed': 'Importación Fallida',
    'The configuration profile has been applied correctly.': 'El perfil de configuración se ha aplicado correctamente.',
    'The configuration profile has been applied on a clean slate.': 'El perfil de configuración se ha aplicado sobre una base limpia.',
    'Sync with Fedora System Accent Color': 'Sincronizar con el color de acento de Fedora',
    'Show Customization Widget Center in Bar': 'Mostrar Centro de Control Personalizado en la Barra',
    'Pywal / Material You Sync': 'Sincronización con Pywal / Material You',
    'Sync Pywal Colors Manually': 'Sincronizar Paleta de Pywal',
    'Instantly extract and apply colors from your current Pywal palette.': 'Extrae y aplica de inmediato los colores de tu paleta activa de Pywal.',
    'Sync Now': 'Sincronizar',
    'Applied!': '¡Aplicado!',
    'Apply Palette to Bar': 'Aplicar Paleta a la Barra',
    'Pywal Palette Not Found': 'Paleta de Pywal no encontrada',
    'Please generate a Pywal color scheme first (e.g. run "wal -i wallpaper.jpg") before syncing.': 'Por favor, genera un esquema de colores de Pywal primero (ej. ejecutando "wal -i fondo.jpg") antes de sincronizar.',
    'OK': 'Aceptar',
    'Invalid Pywal Palette': 'Paleta de Pywal inválida',
    'The Pywal color file is invalid or contains too few colors.': 'El archivo de colores de Pywal no es válido o contiene muy pocos colores.',
    'Dynamic Focus Glow': 'Brillo Reactivo del Foco Dinámico',
    'Neon Glow Intensity': 'Intensidad del Brillo Neón',
    'The palette auto-refreshes when the desktop background changes. Click any color to copy its Hex code.': 'La paleta se actualiza automáticamente al cambiar el fondo de pantalla. Haz clic en un color para copiar su código Hex.',
    'Icon Pack': 'Paquete de Iconos',
    'GTK Theme': 'Tema de Ventana (GTK)',
    'Shell Theme': 'Tema del Shell (GNOME)',
    '100% Compatible': '100% Compatible',
    'Designed for ancient GNOME 3.x': 'Diseñado para GNOME 3.x antiguo',
    'Compatible with GNOME': 'Compatible con GNOME',
    'GTK4 & Libadwaita Support': 'Soporte GTK4 y Libadwaita',
    'Compatible with legacy apps': 'Compatible con apps antiguas',
    'Compatible': 'Compatible',
    'GRUB/Boot Theme': 'Tema de GRUB/Arranque',
    'Installed': 'Instalado',
    'GDM Login Screen Customizer': 'Personalizador de Inicio de Sesión GDM',
    'Personalize lock screen, GDM wallpaper, and top bar clock safely': 'Personaliza pantalla de bloqueo, fondo GDM y reloj de la barra de forma segura',
    'Customize GDM': 'Personalizar GDM',
    'Configure GDM Login & Lock Screen': 'Configurar Inicio de Sesión y Bloqueo GDM',
    'Changes require administrative privileges (auth prompt).': 'Los cambios requieren privilegios de administrador (solicitud de contraseña).',
    'Background & Layout': 'Fondo y Diseño',
    'Login Screen Background': 'Fondo de Pantalla de Inicio',
    'Not configured (GNOME Default)': 'No configurado (Predeterminado de GNOME)',
    'Select Image...': 'Seleccionar Imagen...',
    'Select Login Background Wallpaper': 'Seleccionar Fondo de Inicio de Sesión',
    'Use Desktop Wallpaper': 'Usar Fondo de Escritorio',
    'Automatically apply your active desktop wallpaper to login screen': 'Aplicar automáticamente tu fondo de escritorio activo al login',
    'Sync Wallpaper': 'Sincronizar Fondo',
    'Unsupported image type or empty': 'Tipo de imagen no compatible o vacío',
    'Password Dialog Card Customization': 'Personalización de Tarjeta de Contraseña',
    'Enable Custom Password Box Style': 'Activar Estilo de Caja de Contraseña',
    'Make GDM password entry box transparent with custom color': 'Hacer transparente y con color personalizado la caja de contraseña GDM',
    'Password Box Color': 'Color de Caja de Contraseña',
    'Choose custom background color for the password box': 'Elige el color de fondo personalizado para la caja de contraseña',
    'Password Box Opacity': 'Opacidad de Caja de Contraseña',
    'Control transparency level (0% to 100%)': 'Controlar nivel de transparencia (0% a 100%)',
    'GDM Interface Tweaks': 'Ajustes de Interfaz GDM',
    'Show Clock Seconds': 'Mostrar Segundos del Reloj',
    'Display seconds in GDM top bar clock': 'Mostrar segundos en el reloj de la barra superior de GDM',
    'Show Clock Date': 'Mostrar Fecha del Reloj',
    'Display date in GDM top bar clock': 'Mostrar fecha en el reloj de la barra superior de GDM',
    'Hide Power & Restart Buttons': 'Ocultar Botones de Apagado/Reinicio',
    'Prevent powering down from lock/login screen': 'Evitar apagar/reiniciar desde la pantalla de bloqueo',
    'Apply Changes to GDM': 'Aplicar Cambios a GDM',
    'Restore GNOME Default GDM': 'Restaurar GDM Predeterminado',
    'Please select a wallpaper or sync active background.': 'Por favor selecciona un fondo de pantalla o sincroniza el fondo activo.',
    'Authenticating and applying settings...': 'Autenticando y aplicando configuraciones...',
    'GDM customized successfully!': '¡GDM personalizado con éxito!',
    'Authentication failed or declined.': 'Autenticación fallida o rechazada.',
    'Error running customized GDM profile.': 'Error al ejecutar perfil GDM personalizado.',
    'Execution failed.': 'Ejecución fallida.',
    'Authenticating and restoring GNOME defaults...': 'Autenticando y restaurando valores por defecto...',
    'GDM restored to default successfully!': '¡GDM restaurado a valores por defecto con éxito!',
    'Error restoring default GDM profile.': 'Error al restaurar el perfil GDM por defecto.',
    'Images': 'Imágenes',
    'GDK Window Custom Styling': 'Personalización de Ventanas GDK',
    'Window Background Color': 'Color de Fondo de Ventanas',
    'Choose custom background color for GTK/GDK windows': 'Elige color de fondo personalizado para ventanas GTK/GDK',
    'GDK Window Opacity': 'Opacidad de Ventanas GDK',
    'GDK Window Border Customization': 'Personalización de Bordes de Ventana GDK',
    'Border Width': 'Grosor de Borde',
    'Border Transparency': 'Transparencia de Borde',
    'Window Border Color': 'Color de Borde de Ventanas',
    'Choose custom outline/border color for GTK/GDK windows': 'Elige color de contorno/borde personalizado para ventanas GTK/GDK',
    'Enable Custom Window Styling': 'Activar Estilo de Ventana Personalizado',

    // GDM Center translations
    'Bar Enhanced GDM Center': 'Centro GDM de Bar Enhanced',
    'Appearance': 'Apariencia',
    'Accent Color': 'Color de Acento',
    'Light Mode': 'Modo Claro',
    'Background Type': 'Tipo de Fondo',
    'GDM Background Image': 'Imagen de Fondo de GDM',
    'GDM Background Color': 'Color de Fondo de GDM',
    'Icons & Cursor': 'Iconos y Cursor',
    'Cursor Theme': 'Tema del Cursor',
    'Icon Theme': 'Tema de Iconos',
    'Login Screen': 'Pantalla de Inicio',
    'Authentication & Welcome': 'Autenticación y Bienvenida',
    'Disable User List': 'Desactivar Lista de Usuarios',
    'Require typing username manually': 'Requerir escribir el usuario manualmente',
    'Disable Power/Restart Buttons': 'Desactivar Botones de Apagado/Reinicio',
    'Show Welcome Message': 'Mostrar Mensaje de Bienvenida',
    'Message Text': 'Texto del Mensaje',
    'Fonts': 'Fuentes',
    'Font (e.g. Sans 11)': 'Fuente (ej. Sans 11)',
    'Scaling Factor': 'Factor de Escala',
    'Antialiasing (grayscale/rgba/none)': 'Antialiasing (grayscale/rgba/none)',
    'Antialiasing': 'Suavizado de contorno (Antialiasing)',
    'Hinting': 'Optimización de trazos (Hinting)',
    'Hinting (full/medium/slight/none)': 'Hinting (full/medium/slight/none)',
    'Pointing & Touchpad': 'Puntero y Touchpad',
    'Natural Scrolling': 'Desplazamiento Natural',
    'Pointer Speed': 'Velocidad del Puntero',
    'Acceleration Profile': 'Perfil de Aceleración',
    'Pointer Acceleration': 'Perfil de Aceleración del Puntero',
    'Tap to Click': 'Tocar para Hacer Clic',
    'Two Finger Scrolling': 'Desplazamiento con Dos Dedos',
    'Disable While Typing': 'Desactivar al Escribir',
    'Disable Touchpad on External Mouse': 'Desactivar Touchpad al Conectar Mouse',
    'Cursor Size': 'Tamaño del Cursor',
    'Power': 'Energía',
    'Power Button Action (suspend/nothing/interactive)': 'Acción del Botón de Encendido (suspend/nothing/interactive)',
    'Power Button Action': 'Acción del Botón de Encendido',
    'Auto Power Saver on Low Battery': 'Ahorro de Energía Automático en Batería Baja',
    'Dim Screen on Idle': 'Atenuar Pantalla al estar Inactivo',
    'Blank Screen': 'Apagar Pantalla',
    'Idle Delay (minutes)': 'Retraso de Inactividad (minutos)',
    'Automatic Suspend': 'Suspensión Automática',
    'Suspend on AC': 'Suspender con Corriente Alterna',
    'Suspend Delay (minutes)': 'Retraso de Suspensión (minutos)',
    'Suspend on Battery': 'Suspender con Batería',
    'Time Format': 'Formato de Hora',
    'Sound': 'Sonido',
    'Sound Preferences': 'Preferencias de Sonido',
    'Sound Theme': 'Tema de Sonido',
    'Over-amplification': 'Sobre-amplificación',
    'Event Sounds': 'Sonidos de Eventos',
    'Feedback Sounds': 'Sonidos de Comentarios',
    'Display': 'Pantalla',
    'Monitors Configuration': 'Configuración de Monitores',
    'Apply your current display configuration (resolution, scaling, layout) to the GDM login screen.': 'Aplica tu configuración de pantalla actual (resolución, escala, diseño) a la pantalla de inicio de sesión de GDM.',
    'Apply Current Display Settings to GDM': 'Aplicar Ajustes de Pantalla Actuales a GDM',
    'Night Light': 'Luz Nocturna',
    'Night Light Preferences': 'Preferencias de Luz Nocturna',
    'Enable Night Light': 'Activar Luz Nocturna',
    'Color Temperature (K)': 'Temperatura de Color (K)',
    'Schedule Automatic': 'Horario Automático',
    'Start Hour (0-23)': 'Hora de Inicio (0-23)',
    'End Hour (0-23)': 'Hora de Fin (0-23)',
    'Accessibility': 'Accesibilidad',
    'Always Show Accessibility Menu': 'Mostrar Siempre el Menú de Accesibilidad',
    'Tools': 'Herramientas',
    'Default Shell Theme': 'Tema de Shell por Defecto',
    'Include Top Bar Tweaks': 'Incluir Ajustes de Barra Superior',
    'Extract default shell theme': 'Extraer tema de shell predeterminado',
    'Extract': 'Extraer',
    'Extracting default theme...': 'Extrayendo tema predeterminado...',
    'Theme extracted to /tmp/default-theme!': '¡Tema extraído en /tmp/default-theme!',
    'Extraction failed.': 'Extracción fallida.',
    'Applying settings... please authenticate.': 'Aplicando configuraciones... por favor autentíquese.',
    'Settings applied successfully!': '¡Configuraciones aplicadas con éxito!',
    'Failed to apply settings.': 'Error al aplicar las configuraciones.',
    'Actions': 'Acciones',
    'Apply all configured settings to GDM (requires root authentication).': 'Aplicar todas las configuraciones a GDM (requiere autenticación de root).',
    'Apply to GDM Login Screen': 'Aplicar a la Pantalla de Inicio GDM',
    'Applying monitor layout...': 'Aplicando diseño de monitor...',
    'Monitor layout applied!': '¡Diseño de monitor aplicado!',
    'Failed to apply monitor layout.': 'Error al aplicar el diseño de monitor.',
    'Enable Fingerprint Authentication': 'Activar Autenticación por Huella Digital',
    'Enlarge Welcome Message': 'Agrandar Mensaje de Bienvenida',
    'Enable Logo': 'Activar Logo',
    'Logo Image Path': 'Ruta de Imagen del Logo',
    'Logo': 'Logo',
    'Select Image...': 'Seleccionar Imagen...',
    'Select Login Background Wallpaper': 'Seleccionar Fondo de Pantalla de GDM',
    'Select GDM Logo Image': 'Seleccionar Imagen del Logo para GDM',
    'Password Dialog Card Customization': 'Personalización de Tarjeta de Contraseña',
    'Enable Custom Password Box Style': 'Estilo Personalizado de Tarjeta',
    'Make GDM password entry box transparent with custom color': 'Caja de contraseña GDM transparente o translúcida',
    'Password Box Color (e.g. rgba(0,0,0,0.5))': 'Color de Fondo (ej. rgba(0,0,0,0.5))',
    'Password Box Opacity': 'Opacidad de Tarjeta',
    'Control transparency level (0% to 100%)': 'Ajustar nivel de opacidad (0% a 100%)',
    'Enable Background Blur': 'Activar Difuminado / Desenfoque',
    'Apply dynamic frosted glass blur to GDM login card': 'Efecto cristal esmerilado translúcido y desenfocado',
    'System Maintenance': 'Mantenimiento del Sistema',
    'Restore GDM to Default': 'Restaurar GDM al Estado Original',
    'Revert all customized GDM settings and styles back to the system default.': 'Revierte todas las configuraciones y estilos personalizados de GDM al estado original del sistema.',
    'Restore': 'Restaurar',
    'Restoring GDM to default... please authenticate.': 'Restaurando GDM al estado original... por favor, autentíquese.',
    'GDM restored to system default!': '¡GDM restaurado al estado original del sistema!',
    'Failed to restore GDM.': 'Fallo al restaurar GDM.',

    // Additional GDM Center translations
    'Theme': 'Tema',
    'Background': 'Fondo',
    'Background Image Path': 'Ruta de Imagen de Fondo',
    'Image Adjustment': 'Ajuste de Imagen',
    'Select Background Color': 'Seleccionar Color de Fondo',
    'Blur Background Image': 'Difuminar Imagen de Fondo',
    'Applies a Gaussian blur to the GDM background image': 'Aplica un desenfoque Gaussiano a la imagen de fondo de GDM',
    'Blur Radius': 'Radio de Desenfoque',
    'Adjust the amount of background blur (0 to 100)': 'Ajustar la cantidad de desenfoque del fondo (0 a 100)',
    'Select Password Box Color': 'Seleccionar Color de Caja de Contraseña',
    'General': 'General',
    'Clock & Status': 'Reloj y Estado',
    'Show Seconds': 'Mostrar Segundos',
    'Show Date': 'Mostrar Fecha',
    'Show Weekday': 'Mostrar Día de la Semana',
    'Show Battery Percentage': 'Mostrar Porcentaje de Batería',
    'Panel Visuals': 'Apariencia del Panel',
    'Change Background Color': 'Cambiar Color de Fondo',
    'Change Text Color': 'Cambiar Color de Texto',
    'Select Text Color': 'Seleccionar Color de Texto',
    'Mouse': 'Ratón',
    'Touchpad': 'Panel Táctil',
    'Enable Touchpad': 'Activar Panel Táctil',
    'Two-finger Scrolling': 'Desplazamiento con Dos Dedos',
    'Disable While Mouse Attached': 'Desactivar con Ratón Conectado',
    'Disable Arrows': 'Desactivar Flechas',
    'Disable Rounded Corners': 'Desactivar Esquinas Redondeadas',

    // Dash to Dock native settings translations
    'Dock Position & Layout': 'Posición y Diseño del Dock',
    'Screen Position': 'Posición en Pantalla',
    'Top': 'Arriba', 'Right': 'Derecha', 'Bottom': 'Abajo', 'Left': 'Izquierda',
    'Maximum Icon Size': 'Tamaño Máximo de Iconos',
    'Dock Size Percentage': 'Porcentaje de Tamaño del Dock',
    'Extend Dock to Full Screen Edge': 'Extender Dock al Borde de Pantalla',
    'Always Center Icons': 'Centrar Iconos Siempre',
    'Show Dock on All Monitors': 'Mostrar Dock en Todos los Monitores',
    'Fixed Icon Size': 'Tamaño de Icono Fijo',
    'Intelligent Behavior': 'Comportamiento Inteligente',
    'Always Visible (Fixed)': 'Siempre Visible (Fijo)',
    'Disable to enable smart autohide': 'Desactiva para habilitar auto-ocultar inteligente',
    'Autohide': 'Auto-Ocultar',
    'Intellihide (Dodge Windows)': 'Inteliocultar (Esquivar Ventanas)',
    'Intellihide Mode': 'Modo Inteliocultar',
    'All Windows': 'Todas las Ventanas',
    'Focus App Windows': 'Ventanas de App Enfocada',
    'Maximized Windows': 'Ventanas Maximizadas',
    'Always on Top': 'Siempre Encima',
    'Autohide in Fullscreen': 'Auto-Ocultar en Pantalla Completa',
    'Require Pressure to Show': 'Requerir Presión para Mostrar',
    'Pressure Threshold': 'Umbral de Presión',
    'Animation Duration': 'Duración de Animación',
    'Show Delay': 'Retraso al Mostrar',
    'Hide Delay': 'Retraso al Ocultar',
    'App Icons & Indicators': 'Iconos de Apps e Indicadores',
    'Show Running Apps': 'Mostrar Apps Ejecutándose',
    'Show Favorites': 'Mostrar Favoritos',
    'Show Trash': 'Mostrar Papelera',
    'Show Removable Drives': 'Mostrar Unidades Extraíbles',
    'Show Applications Button': 'Mostrar Botón de Aplicaciones',
    'Applications Button at Start': 'Botón de Aplicaciones al Inicio',
    'Isolate Workspaces': 'Aislar Espacios de Trabajo',
    'Isolate Monitors': 'Aislar Monitores',
    'Window Previews on Hover': 'Vista Previa de Ventanas al Pasar',
    'Preview Size Scale': 'Escala de Vista Previa',
    'Wiggle Urgent Apps': 'Agitar Apps Urgentes',
    'Show Dock on Urgent Notification': 'Mostrar Dock en Notificación Urgente',
    'Hide Tooltips': 'Ocultar Tooltips',
    'Show Icon Emblems': 'Mostrar Emblemas de Iconos',
    'Notifications Counter Badge': 'Insignia de Contador de Notificaciones',
    'Running Indicator Style': 'Estilo de Indicador de Ejecución',
    'Default': 'Predeterminado', 'Dots': 'Puntos', 'Squares': 'Cuadros', 'Dashes': 'Guiones',
    'Segmented': 'Segmentado', 'Solid': 'Sólido', 'Ciliora': 'Ciliora', 'Metro': 'Metro',
    'Use Dominant Color for Indicator': 'Usar Color Dominante para Indicador',
    'Unity Backlit Items': 'Retroiluminación Unity',
    'Glossy Effect': 'Efecto Brillante',
    'Click & Scroll Actions': 'Acciones de Clic y Scroll',
    'Click Action': 'Acción al Clic',
    'Raise': 'Elevar', 'Minimize': 'Minimizar', 'Launch': 'Lanzar', 'Cycle': 'Ciclar',
    'Min or Overview': 'Minimizar o Vista General', 'Show Previews': 'Mostrar Vistas Previas',
    'Min or Cycle': 'Minimizar o Ciclar', 'Show App Spread': 'Mostrar Expansión de Apps',
    'Scroll Action': 'Acción al Scroll',
    'Do Nothing': 'No Hacer Nada', 'Cycle Windows': 'Ciclar Ventanas', 'Switch Workspace': 'Cambiar Espacio de Trabajo',
    'Enable Keyboard Shortcuts': 'Activar Atajos de Teclado',
    'Scroll to Focused Application': 'Desplazar a App Enfocada',
    'Disable Overview on Startup': 'Desactivar Vista General al Iniciar',
    'Dock Appearance (Advanced)': 'Apariencia del Dock (Avanzado)',
    'Transparency Mode': 'Modo de Transparencia',
    'Adaptive': 'Adaptativo', 'Dynamic': 'Dinámico', 'Fixed': 'Fijo',
    'Background Opacity': 'Opacidad de Fondo',
    'Customize Min/Max Alpha': 'Personalizar Alpha Mín/Máx',
    'Minimum Alpha': 'Alpha Mínimo',
    'Maximum Alpha': 'Alpha Máximo',
    'Custom Background Color': 'Color de Fondo Personalizado',
    'Apply Custom Theme (shrink)': 'Aplicar Tema Personalizado (contraer)',
    'Force Straight Corners': 'Forzar Esquinas Rectas',

    // Notification Icons translations
    'Notification Icons in Top Bar': 'Iconos de Notificación en la Barra Superior',
    'Enable Notification Icons': 'Activar Iconos de Notificación',
    'Colored Icons': 'Iconos a Color',
    'Show colored icons instead of monochrome': 'Mostrar iconos a color en lugar de monocromáticos',
    'Count Badge': 'Insignia de Conteo',
    'Display number of unread notifications': 'Mostrar número de notificaciones sin leer',
    'Hide Single Count': 'Ocultar Conteo Individual',
    'Hide badge when only one notification': 'Ocultar insignia cuando solo hay una notificación',
    'Right Side of Clock': 'Lado Derecho del Reloj',
    'Show icons on the right side of the clock': 'Mostrar iconos al lado derecho del reloj',
    'Notification Icon Size': 'Tamaño de Iconos de Notificación',
    'Small (16px)': 'Pequeño (16px)',
    'Medium (18px)': 'Mediano (18px)',
    'Large (20px)': 'Grande (20px)',
    'Do Not Disturb Behavior': 'Comportamiento de No Molestar',
    'Urgent Only': 'Solo Urgentes',
    'Never Show': 'Nunca Mostrar',

    // Privacy Indicators translations
    'Enable Privacy Indicators Accent Color': 'Activar Color de Acento en Indicadores de Privacidad',
    'Apply accent colors to system privacy & sharing indicators': 'Aplica los colores de acento a los indicadores de privacidad y compartición del sistema',
    'Color Privacy Indicators': 'Colorear Indicadores de Privacidad',
    'Apply accent color to camera, microphone, and location indicators': 'Aplica el color de acento a los indicadores de cámara, micrófono y ubicación',
    'Color Screen Sharing Indicator': 'Colorear Indicador de Compartir Pantalla',
    'Apply accent color to the screen sharing indicator': 'Aplica el color de acento al indicador de pantalla compartida',
    'Color Screen Recording Indicator': 'Colorear Indicador de Grabación de Pantalla',
    'Apply accent color to the screen recording indicator': 'Aplica el color de acento al indicador de grabación de pantalla',
    'Glow Blur Background': 'Fondo Difuminado (Glow Blur)',
    'Use a glow blur background instead of a solid color block for sharing/recording': 'Usa un fondo difuminado con brillo en lugar de un bloque de color sólido al compartir o grabar',
    'Neutral Color Mode': 'Modo de Color Neutro',
    'Use neutral colors (white/dark grey) instead of accent colors': 'Usa colores neutros (blanco/gris oscuro) en lugar del color de acento',
    'Privacy & Screen Indicators': 'Indicadores de Privacidad y Pantalla',

    // Módulos Integrados
    'Integrated Modules': 'Módulos Integrados',
    'Enable or disable integrated extensions.': 'Activa o desactiva las extensiones integradas.',
    'Shows a dock on the desktop': 'Muestra un dock en el escritorio',
    'Dynamic Music Pill': 'Píldora Musical Dinámica',
    'Media controls in the top bar': 'Controles de reproducción en la barra superior',
    'Vitals': 'Vitales del Sistema',
    'System hardware monitors': 'Monitores de hardware del sistema',
    'Bluetooth Battery': 'Batería Bluetooth',
    'Show battery level of connected Bluetooth devices': 'Muestra el nivel de batería de dispositivos Bluetooth conectados',
    'Configure Dynamic Music Pill': 'Configurar Píldora Musical',
    'Configure Vitals': 'Configurar Vitales del Sistema',
    'Configure Bluetooth Battery': 'Configurar Batería Bluetooth',

    // Modal de Vitals
    'Vitals Settings': 'Ajustes de Vitales del Sistema',
    'Close': 'Cerrar',

    // Modal de Bluetooth Battery
    'Bluetooth Battery Settings': 'Ajustes de Batería Bluetooth',
    'Manage native Bluetooth battery indicator.': 'Gestiona el indicador de batería Bluetooth nativo.',
    'Enable Bluetooth Battery Meter': 'Activar Medidor de Batería Bluetooth',
    'Show battery percentage of connected devices in the top bar.': 'Muestra el porcentaje de batería de los dispositivos conectados en la barra superior.',

    // Missing translations
    'All customizations will be purged and reverted to factory defaults.': 'Se eliminarán todas las personalizaciones y se volverá a los valores predeterminados de fábrica.',
    'Always Show': 'Mostrar siempre',
    'Apply a style from a shared text string.': 'Aplica un estilo desde una cadena de texto compartida.',
    'Auto Foreground Contrast': 'Contraste automático de texto/primer plano',
    'Card Luminosity Hint': 'Sugerencia de luminosidad de tarjeta',
    'Copy Code': 'Copiar código',
    'Dash to Dock': 'Dash to Dock',
    'Enable Welcome Message': 'Activar mensaje de bienvenida',
    'Floating': 'Flotante',
    'Foreground Opacity': 'Opacidad de texto/primer plano',
    'Generate a shareable text string of your style.': 'Genera una cadena de texto compartida con tu estilo.',
    'Gradients & Shadows': 'Degradados y sombras',
    'Hide the user list on the login screen': 'Ocultar la lista de usuarios en la pantalla de inicio de sesión',
    'Horizontal': 'Horizontal',
    'Import Configuration': 'Importar configuración',
    'Islands': 'Islas',
    'Login Screen Logo': 'Logo de pantalla de inicio de sesión',
    'Main Window Luminosity Hint': 'Sugerencia de luminosidad de la ventana principal',
    'Mainland': 'Continental',
    'Manage your icons and window themes.': 'Gestiona tus iconos y temas de ventanas.',
    'Maximized Bar Height': 'Altura de barra maximizada',
    'Native Theme': 'Tema nativo',
    'No results or API error.': 'Sin resultados o error de API.',
    'Not configured': 'No configurado',
    'Open Advanced GDM Center': 'Abrir centro avanzado de GDM',
    'Paste the theme code below to apply it.': 'Pega el código del tema abajo para aplicarlo.',
    'Restore GNOME Defaults': 'Restaurar valores predeterminados de GNOME',
    'Restored!': '¡Restaurado!',
    'Secondary Palette Override': 'Sobrescribir paleta secundaria',
    'Select Login Screen Logo': 'Seleccionar logo de la pantalla de inicio',
    'Select Logo...': 'Seleccionar logo...',
    'Select a .zip or .tar.gz archive.': 'Selecciona un archivo .zip o .tar.gz.',
    'Show a banner message on the login screen': 'Mostrar un mensaje de banner en la pantalla de inicio',
    'Text to display as welcome message': 'Texto a mostrar como mensaje de bienvenida',
    'Tile Division Color': 'Color de división de mosaicos',
    'Trilands': 'Trilands',
    'Use this code to share your theme with others.': 'Usa este código para compartir tu tema con otros.',
    'Vertical': 'Vertical',
    'Welcome Message & Logo': 'Mensaje de bienvenida y logo'
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
        const prefs = new BarEnhancedPrefs(this, settings, interfaceSettings, this.path);
        prefs.fill(window);
    }
}

class BarEnhancedPrefs {
    constructor(extension, settings, interfaceSettings, path) {
        this._extension = extension;
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
            { title: T('Glassmorphism translúcido'), desc: T('Our custom transparency and background blur graphics engine.') },
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

        // --- AUTO THEMES PAGE ---
        const autoPage = new Adw.PreferencesPage({ title: T('Auto Themes'), icon_name: 'color-select-symbolic' });
        window.add(autoPage);
        const engineGroup = new Adw.PreferencesGroup({ title: T('Theming Engine Settings') });
        autoPage.add(engineGroup);
        engineGroup.add(this.createSwitchRow('autotheme-refresh', T('Auto-Refresh on Wallpaper Change')));
        engineGroup.add(this.createSwitchRow('focus-glow', T('Dynamic Focus Glow')));
        engineGroup.add(this.createSwitchRow('pywal-sync', T('Pywal / Material You Sync')));


        engineGroup.add(this.createSwitchRow('system-accent-sync', T('Sync with Fedora System Accent Color')));
        engineGroup.add(this.createSwitchRow('show-dashboard', T('Show Customization Widget Center in Bar')));
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
        const darkOptions = [['Select Theme', T('Select Theme')], ['Color', T('True Color')], ['Pastel', T('Pastel Theme')], ['Dark', T('Dark Theme')], ['Light', T('Light Theme')], ['vanguard_gold', 'Vanguard Gold']];
        const lightOptions = [['Select Theme', T('Select Theme')], ['Color', T('True Color')], ['Pastel', T('Pastel Theme')], ['Dark', T('Dark Theme')], ['Light', T('Light Theme')], ['vanguard_silver', 'Vanguard Silver']];
        const darkRow = new Adw.ComboRow({ title: T('Dark Mode Base Theme') });
        const darkModel = new Gtk.StringList(); darkOptions.forEach(opt => darkModel.append(opt[1])); darkRow.set_model(darkModel);
        const darkIdx = darkOptions.findIndex(opt => opt[0] === this._settings.get_string('autotheme-dark'));
        if (darkIdx !== -1) darkRow.set_selected(darkIdx);
        darkRow.connect('notify::selected', () => this._settings.set_string('autotheme-dark', darkOptions[darkRow.get_selected()][0]));
        applyGroup.add(darkRow);

        const lightRow = new Adw.ComboRow({ title: T('Light Mode Base Theme') });
        const lightModel = new Gtk.StringList(); darkOptions.forEach(opt => lightModel.append(opt[1])); lightRow.set_model(lightModel);
        const lightIdx = darkOptions.findIndex(opt => opt[0] === this._settings.get_string('autotheme-light'));
        if (lightIdx !== -1) lightRow.set_selected(lightIdx);
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

        const paletteGroup = new Adw.PreferencesGroup({
            title: T('Extracted Color Palette'),
            description: T('The palette auto-refreshes when the desktop background changes. Click any color to copy its Hex code.')
        });
        autoPage.add(paletteGroup);
        const paletteBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });
        const pBox1 = new Gtk.Box({ spacing: 8, halign: Gtk.Align.CENTER });
        const pBox2 = new Gtk.Box({ spacing: 8, halign: Gtk.Align.CENTER });
        this.createPaletteDisplay(window, pBox1, pBox2);
        paletteBox.append(pBox1);
        paletteBox.append(pBox2);
        const btnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            halign: Gtk.Align.CENTER,
            margin_top: 12
        });

        const refreshBtn = new Gtk.Button({
            label: T('Update Palette Data'),
            css_classes: ['pill']
        });
        refreshBtn.connect('clicked', () => this.triggerBackgroundPalette(window));
        btnBox.append(refreshBtn);

        const applyPaletteBtn = new Gtk.Button({
            label: T('Apply Palette to Bar'),
            css_classes: ['pill', 'suggested-action']
        });
        applyPaletteBtn.connect('clicked', () => this.applyExtractedPalette(window, applyPaletteBtn));
        btnBox.append(applyPaletteBtn);

        const resetPaletteBtn = new Gtk.Button({
            label: T('Restore GNOME Defaults'),
            css_classes: ['pill', 'destructive-action'],
            halign: Gtk.Align.CENTER,
            margin_top: 12
        });
        resetPaletteBtn.connect('clicked', () => this.resetToGnomeDefaults(window, resetPaletteBtn));

        paletteBox.append(btnBox);
        paletteBox.append(resetPaletteBtn);
        paletteGroup.add(paletteBox);

        this._settings.connect('changed::bg-change', () => {
            let i = 1;
            window.paletteButtons.forEach(b => {
                const c = this._settings.get_strv('palette' + i++);
                const hex = this.rgbToHex(c[0], c[1], c[2]);
                b.child.label = `<span bgcolor="${hex}" font_size="150%">       </span>`;
                b.tooltip_text = hex;
            });
        });

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
        const fgRow = new Adw.ActionRow({ title: T('Interface Foreground') });
        fgRow.add_suffix(this.createColorButton(window, 'fgcolor'));
        fgRow.add_suffix(this.createSwitch('autofg-bar'));
        cGroup.add(fgRow);
        cGroup.add(this.createScaleRow('fgalpha', T('Foreground Opacity'), 0, 1, 0.01));
        const bgRow = new Adw.ActionRow({ title: T('Interface Background') }); bgRow.add_suffix(this.createColorButton(window, 'bgcolor')); cGroup.add(bgRow);
        cGroup.add(this.createScaleRow('bgalpha', T('Background Opacity'), 0, 1, 0.01));
        const boxRow = new Adw.ActionRow({ title: T('Box / Sidebar Color') }); boxRow.add_suffix(this.createColorButton(window, 'boxcolor')); cGroup.add(boxRow);

        // Selector de Fuente en Estética
        const fontRow = new Adw.ActionRow({
            title: T('Interface Font'),
            subtitle: T('Select custom font for the shell.')
        });
        const fontButton = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            use_font: true,
            use_size: true,
            hexpand: true
        });

        let font = this._settings.get_string('font');
        if (font === "") {
            let defaultFont = fontButton.get_font();
            this._settings.set_string('default-font', defaultFont);
            font = defaultFont;
        }
        fontButton.set_font(font);

        fontButton.connect('font-set', (w) => {
            let value = w.get_font();
            this._settings.set_string('font', value);
        });

        this._settings.connect('changed::font', () => {
            let newFont = this._settings.get_string('font');
            fontButton.set_font(newFont);
        });

        const resetFontBtn = new Gtk.Button({
            icon_name: 'edit-clear-all-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: T('Reset to default system font.'),
            css_classes: ['flat']
        });
        resetFontBtn.connect('clicked', () => {
            this._settings.reset('font');
            let defFont = this._settings.get_string('default-font');
            fontButton.set_font(defFont);
        });

        fontRow.add_suffix(fontButton);
        fontRow.add_suffix(resetFontBtn);
        cGroup.add(fontRow);

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
        for (let i = 1; i <= 16; i++) { (i <= 8 ? cBox1 : cBox2).append(this.createColorButton(window, 'candy' + i)); }
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
        bGroup.add(this.createScaleRow('neon-intensity', T('Neon Glow Intensity'), 0.05, 1.0, 0.05));

        // --- POPUP MENUS PAGE ---
        const menuPage = new Adw.PreferencesPage({ title: T('Menus'), icon_name: 'open-menu-symbolic' });
        window.add(menuPage);
        const mGroup = new Adw.PreferencesGroup({ title: T('System Popups Style') });
        menuPage.add(mGroup);
        mGroup.add(this.createSwitchRow('menustyle', T('Enable Specialized Popup Styles')));
        mGroup.add(this.createSwitchRow('autofg-menu', T('Auto Foreground Contrast')));
        const mfgRow = new Adw.ActionRow({ title: T('Text Color') });
        mfgRow.add_suffix(this.createColorButton(window, 'mfgcolor'));
        mfgRow.add_suffix(this.createSwitch('autofg-menu'));
        mGroup.add(mfgRow);
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

        // --- Native Dash to Dock Settings (Adwaita Style) ---
        const dockSettings = this._extension.getSettings('org.gnome.shell.extensions.dash-to-dock');

        // Helper: create a switch row bound to dock settings
        const dockSwitch = (key, title, subtitle = '') => {
            const row = new Adw.SwitchRow({ title, subtitle });
            dockSettings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            return row;
        };

        // Helper: create a scale row bound to dock settings
        const dockScale = (key, title, lower, upper, step = 1) => {
            const row = new Adw.ActionRow({ title });
            const scale = new Gtk.Scale({
                orientation: Gtk.Orientation.HORIZONTAL,
                adjustment: new Gtk.Adjustment({ lower, upper, step_increment: step }),
                digits: step < 1 ? 2 : 0, draw_value: true, value_pos: Gtk.PositionType.RIGHT,
                width_request: 180, valign: Gtk.Align.CENTER
            });
            dockSettings.bind(key, scale.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
            row.add_suffix(scale);
            return row;
        };

        // --- Position & Layout ---
        const posGroup = new Adw.PreferencesGroup({ title: T('Dock Position & Layout') });
        dashPage.add(posGroup);

        const posRow = new Adw.ComboRow({ title: T('Screen Position') });
        const posModel = new Gtk.StringList();
        [T('Top'), T('Right'), T('Bottom'), T('Left')].forEach(l => posModel.append(l));
        posRow.set_model(posModel);
        posRow.set_selected(dockSettings.get_enum('dock-position'));
        posRow.connect('notify::selected', () => dockSettings.set_enum('dock-position', posRow.get_selected()));
        posGroup.add(posRow);

        posGroup.add(dockScale('dash-max-icon-size', T('Maximum Icon Size'), 16, 128));
        posGroup.add(dockScale('height-fraction', T('Dock Size Percentage'), 0.1, 1.0, 0.05));

        const extendRow = dockSwitch('extend-height', T('Extend Dock to Full Screen Edge'));
        posGroup.add(extendRow);
        posGroup.add(dockSwitch('always-center-icons', T('Always Center Icons')));
        posGroup.add(dockSwitch('multi-monitor', T('Show Dock on All Monitors')));
        posGroup.add(dockSwitch('icon-size-fixed', T('Fixed Icon Size')));

        // --- Intelligent Behavior ---
        const behavGroup = new Adw.PreferencesGroup({ title: T('Intelligent Behavior') });
        dashPage.add(behavGroup);

        const fixedRow = new Adw.SwitchRow({ title: T('Always Visible (Fixed)'), subtitle: T('Disable to enable smart autohide') });
        dockSettings.bind('dock-fixed', fixedRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        behavGroup.add(fixedRow);

        behavGroup.add(dockSwitch('autohide', T('Autohide')));
        behavGroup.add(dockSwitch('intellihide', T('Intellihide (Dodge Windows)')));

        const ihModeRow = new Adw.ComboRow({ title: T('Intellihide Mode') });
        const ihModel = new Gtk.StringList();
        [T('All Windows'), T('Focus App Windows'), T('Maximized Windows'), T('Always on Top')].forEach(l => ihModel.append(l));
        ihModeRow.set_model(ihModel);
        ihModeRow.set_selected(dockSettings.get_enum('intellihide-mode'));
        ihModeRow.connect('notify::selected', () => dockSettings.set_enum('intellihide-mode', ihModeRow.get_selected()));
        behavGroup.add(ihModeRow);

        behavGroup.add(dockSwitch('autohide-in-fullscreen', T('Autohide in Fullscreen')));
        behavGroup.add(dockSwitch('require-pressure-to-show', T('Require Pressure to Show')));
        behavGroup.add(dockScale('pressure-threshold', T('Pressure Threshold'), 0, 500));
        behavGroup.add(dockScale('animation-time', T('Animation Duration'), 0, 1, 0.05));
        behavGroup.add(dockScale('show-delay', T('Show Delay'), 0, 1, 0.05));
        behavGroup.add(dockScale('hide-delay', T('Hide Delay'), 0, 1, 0.05));

        // --- App Icons & Indicators ---
        const appiGroup = new Adw.PreferencesGroup({ title: T('App Icons & Indicators') });
        dashPage.add(appiGroup);

        appiGroup.add(dockSwitch('show-running', T('Show Running Apps')));
        appiGroup.add(dockSwitch('show-favorites', T('Show Favorites')));
        appiGroup.add(dockSwitch('show-trash', T('Show Trash')));
        appiGroup.add(dockSwitch('show-mounts', T('Show Removable Drives')));
        appiGroup.add(dockSwitch('show-show-apps-button', T('Show Applications Button')));
        appiGroup.add(dockSwitch('show-apps-at-top', T('Applications Button at Start')));
        appiGroup.add(dockSwitch('isolate-workspaces', T('Isolate Workspaces')));
        appiGroup.add(dockSwitch('isolate-monitors', T('Isolate Monitors')));
        appiGroup.add(dockSwitch('show-windows-preview', T('Window Previews on Hover')));
        appiGroup.add(dockScale('preview-size-scale', T('Preview Size Scale'), 0, 1, 0.05));
        appiGroup.add(dockSwitch('dance-urgent-applications', T('Wiggle Urgent Apps')));
        appiGroup.add(dockSwitch('show-dock-urgent-notify', T('Show Dock on Urgent Notification')));
        appiGroup.add(dockSwitch('hide-tooltip', T('Hide Tooltips')));
        appiGroup.add(dockSwitch('show-icons-emblems', T('Show Icon Emblems')));
        appiGroup.add(dockSwitch('show-icons-notifications-counter', T('Notifications Counter Badge')));

        const runRow = new Adw.ComboRow({ title: T('Running Indicator Style') });
        const runModel = new Gtk.StringList();
        [T('Default'), T('Dots'), T('Squares'), T('Dashes'), T('Segmented'), T('Solid'), T('Ciliora'), T('Metro')].forEach(l => runModel.append(l));
        runRow.set_model(runModel);
        runRow.set_selected(dockSettings.get_enum('running-indicator-style'));
        runRow.connect('notify::selected', () => dockSettings.set_enum('running-indicator-style', runRow.get_selected()));
        appiGroup.add(runRow);

        appiGroup.add(dockSwitch('running-indicator-dominant-color', T('Use Dominant Color for Indicator')));
        appiGroup.add(dockSwitch('unity-backlit-items', T('Unity Backlit Items')));
        appiGroup.add(dockSwitch('apply-glossy-effect', T('Glossy Effect')));

        // --- Click & Scroll Actions ---
        const actGroup = new Adw.PreferencesGroup({ title: T('Click & Scroll Actions') });
        dashPage.add(actGroup);

        const clickRow = new Adw.ComboRow({ title: T('Click Action') });
        const clickModel = new Gtk.StringList();
        [T('Raise'), T('Minimize'), T('Launch'), T('Cycle'), T('Min or Overview'), T('Show Previews'), T('Min or Cycle'), T('Show App Spread')].forEach(l => clickModel.append(l));
        clickRow.set_model(clickModel);
        clickRow.set_selected(dockSettings.get_enum('click-action'));
        clickRow.connect('notify::selected', () => dockSettings.set_enum('click-action', clickRow.get_selected()));
        actGroup.add(clickRow);

        const scrollRow = new Adw.ComboRow({ title: T('Scroll Action') });
        const scrollModel = new Gtk.StringList();
        [T('Do Nothing'), T('Cycle Windows'), T('Switch Workspace')].forEach(l => scrollModel.append(l));
        scrollRow.set_model(scrollModel);
        scrollRow.set_selected(dockSettings.get_enum('scroll-action'));
        scrollRow.connect('notify::selected', () => dockSettings.set_enum('scroll-action', scrollRow.get_selected()));
        actGroup.add(scrollRow);

        actGroup.add(dockSwitch('hot-keys', T('Enable Keyboard Shortcuts')));
        actGroup.add(dockSwitch('scroll-to-focused-application', T('Scroll to Focused Application')));
        actGroup.add(dockSwitch('disable-overview-on-startup', T('Disable Overview on Startup')));

        // --- Dock Appearance (Advanced) ---
        const appGroup2 = new Adw.PreferencesGroup({ title: T('Dock Appearance (Advanced)') });
        dashPage.add(appGroup2);

        const transpRow = new Adw.ComboRow({ title: T('Transparency Mode') });
        const transpModel = new Gtk.StringList();
        [T('Default'), T('Fixed'), T('Adaptive'), T('Dynamic')].forEach(l => transpModel.append(l));
        transpRow.set_model(transpModel);
        transpRow.set_selected(dockSettings.get_enum('transparency-mode'));
        transpRow.connect('notify::selected', () => dockSettings.set_enum('transparency-mode', transpRow.get_selected()));
        appGroup2.add(transpRow);

        appGroup2.add(dockScale('background-opacity', T('Background Opacity'), 0, 1, 0.05));
        appGroup2.add(dockSwitch('customize-alphas', T('Customize Min/Max Alpha')));
        appGroup2.add(dockScale('min-alpha', T('Minimum Alpha'), 0, 1, 0.05));
        appGroup2.add(dockScale('max-alpha', T('Maximum Alpha'), 0, 1, 0.05));
        appGroup2.add(dockSwitch('custom-background-color', T('Custom Background Color')));
        appGroup2.add(dockSwitch('apply-custom-theme', T('Apply Custom Theme (shrink)')));
        appGroup2.add(dockSwitch('force-straight-corner', T('Force Straight Corners')));

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

        // --- Notification Icons ---
        const niGroup = new Adw.PreferencesGroup({ title: T('Notification Icons in Top Bar') });
        sysPage.add(niGroup);
        
        const notifIconsRow = this.createSwitchRow('notif-icons-enabled', T('Enable Notification Icons'));
        niGroup.add(notifIconsRow);

        const niSettings = this._extension.getSettings('org.gnome.shell.extensions.notification-icons');

        const niSwitch = (key, title, subtitle = '') => {
            const row = new Adw.SwitchRow({ title, subtitle });
            niSettings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            notifIconsRow.bind_property('active', row, 'sensitive', GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
            return row;
        };

        niGroup.add(niSwitch('colored-icons', T('Colored Icons'), T('Show colored icons instead of monochrome')));
        niGroup.add(niSwitch('notification-count', T('Count Badge'), T('Display number of unread notifications')));
        niGroup.add(niSwitch('hide-count-when-one', T('Hide Single Count'), T('Hide badge when only one notification')));
        niGroup.add(niSwitch('right-side', T('Right Side of Clock'), T('Show icons on the right side of the clock')));

        const niSizeRow = new Adw.ComboRow({ title: T('Notification Icon Size') });
        const niSizeModel = new Gtk.StringList();
        [T('Small (16px)'), T('Medium (18px)'), T('Large (20px)')].forEach(l => niSizeModel.append(l));
        niSizeRow.set_model(niSizeModel);
        niSizeRow.set_selected(niSettings.get_int('icon-size'));
        niSizeRow.connect('notify::selected', () => niSettings.set_int('icon-size', niSizeRow.get_selected()));
        notifIconsRow.bind_property('active', niSizeRow, 'sensitive', GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
        niGroup.add(niSizeRow);

        const niDndRow = new Adw.ComboRow({ title: T('Do Not Disturb Behavior') });
        const niDndModel = new Gtk.StringList();
        [T('Always Show'), T('Urgent Only'), T('Never Show')].forEach(l => niDndModel.append(l));
        niDndRow.set_model(niDndModel);
        niDndRow.set_selected(niSettings.get_int('dnd-mode'));
        niDndRow.connect('notify::selected', () => niSettings.set_int('dnd-mode', niDndRow.get_selected()));
        notifIconsRow.bind_property('active', niDndRow, 'sensitive', GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
        niGroup.add(niDndRow);

        // --- Privacy Indicators Accent Color ---
        const privacyGroup = new Adw.PreferencesGroup({ title: T('Privacy & Screen Indicators') });
        sysPage.add(privacyGroup);

        const privacyAccentRow = this.createSwitchRow('privacy-accent-enabled', T('Enable Privacy Indicators Accent Color'), T('Apply accent colors to system privacy & sharing indicators'));
        privacyGroup.add(privacyAccentRow);

        const privacySwitch = (key, title, subtitle = '') => {
            const row = this.createSwitchRow(key, title, subtitle);
            privacyAccentRow.bind_property('active', row, 'sensitive', GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
            return row;
        };

        privacyGroup.add(privacySwitch('privacy-indicators', T('Color Privacy Indicators'), T('Apply accent color to camera, microphone, and location indicators')));
        privacyGroup.add(privacySwitch('screen-sharing-indicator', T('Color Screen Sharing Indicator'), T('Apply accent color to the screen sharing indicator')));
        privacyGroup.add(privacySwitch('screen-recording-indicator', T('Color Screen Recording Indicator'), T('Apply accent color to the screen recording indicator')));
        privacyGroup.add(privacySwitch('privacy-blur', T('Glow Blur Background'), T('Use a glow blur background instead of a solid color block for sharing/recording')));
        privacyGroup.add(privacySwitch('privacy-neutral', T('Neutral Color Mode'), T('Use neutral colors (white/dark grey) instead of accent colors')));

        const modGroup = new Adw.PreferencesGroup({ title: T('Integrated Modules'), description: T('Enable or disable integrated extensions.') });
        sysPage.add(modGroup);

        const dockRow = this.createSwitchRow('dash-to-dock-enabled', T('Dash to Dock'), T('Shows a dock on the desktop'));
        modGroup.add(dockRow);

        const musicRow = this.createSwitchRow('music-pill-enabled', T('Dynamic Music Pill'), T('Media controls in the top bar'));
        const musicBtn = new Gtk.Button({ icon_name: 'preferences-system-symbolic', tooltip_text: T('Configure Dynamic Music Pill'), valign: Gtk.Align.CENTER, css_classes: ['flat', 'circular'] });
        musicBtn.connect('clicked', () => {
            try {
                fillMusicPillPreferences(window, this._extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill'));
            } catch(e) {
                log('Bar Enhanced: Error opening Music Pill prefs:', e);
                const d = new Adw.MessageDialog({ transient_for: window, modal: true, heading: 'Error', body: String(e) });
                d.add_response('ok', 'OK'); d.connect('response', () => d.destroy()); d.present();
            }
        });
        musicRow.add_suffix(musicBtn);
        modGroup.add(musicRow);

        const vitalsRow = this.createSwitchRow('vitals-enabled', T('Vitals'), T('System hardware monitors'));
        const vitalsBtn = new Gtk.Button({ icon_name: 'preferences-system-symbolic', tooltip_text: T('Configure Vitals'), valign: Gtk.Align.CENTER, css_classes: ['flat', 'circular'] });
        vitalsBtn.connect('clicked', () => {
            try {
                fillVitalsPreferences(window, this._extension);
            } catch(e) {
                log('Bar Enhanced: Error opening Vitals prefs:', e);
                const d = new Adw.MessageDialog({ transient_for: window, modal: true, heading: 'Error', body: String(e) });
                d.add_response('ok', 'OK'); d.connect('response', () => d.destroy()); d.present();
            }
        });
        vitalsRow.add_suffix(vitalsBtn);
        modGroup.add(vitalsRow);

        const btRow = this.createSwitchRow('bluetooth-battery-enabled', T('Bluetooth Battery'), T('Show battery level of connected Bluetooth devices'));
        const btBtn = new Gtk.Button({ icon_name: 'preferences-system-symbolic', tooltip_text: T('Configure Bluetooth Battery'), valign: Gtk.Align.CENTER, css_classes: ['flat', 'circular'] });
        btBtn.connect('clicked', () => {
            try {
                fillBluetoothBatteryPreferences(window, this._settings);
            } catch(e) {
                log('Bar Enhanced: Error opening Bluetooth Battery prefs:', e);
                const d = new Adw.MessageDialog({ transient_for: window, modal: true, heading: 'Error', body: String(e) });
                d.add_response('ok', 'OK'); d.connect('response', () => d.destroy()); d.present();
            }
        });
        btRow.add_suffix(btBtn);
        modGroup.add(btRow);

        // --- APPS (EXPERIMENTAL) ---
        const appsPage = new Adw.PreferencesPage({ title: T('Apps'), icon_name: 'application-x-executable-symbolic' });
        window.add(appsPage);
        const appGroup = new Adw.PreferencesGroup({ title: T('Desktop App Integration') });
        appsPage.add(appGroup);
        appGroup.add(this.createSwitchRow('apply-gtk', T('Inject Theme into Gtk Ecosystem')));
        appGroup.add(this.createSwitchRow('apply-flatpak', T('Extend Support to Flatpak Sandbox')));

        const gdmRow = new Adw.ActionRow({
            title: T('GDM Login Screen Customizer'),
            subtitle: T('Personalize lock screen, GDM wallpaper, and top bar clock safely')
        });
        const gdmBtn = new Gtk.Button({
            label: T('Customize GDM'),
            valign: Gtk.Align.CENTER,
            css_classes: ['pill', 'suggested-action']
        });
        gdmBtn.connect('clicked', async () => {
            try {
                const uri = 'file://' + this.path + '/bar-enhanced-gdm-app/main.js';
                const module = await import(uri);
                module.openGdmCenter(window, this._extension, this.path, T);
            } catch (e) {
                log("BarEnhanced: Error launching GDM Center:", e);
                try {
                    const dialog = new Adw.MessageDialog({
                        transient_for: window,
                        modal: true,
                        heading: 'Error Launching GDM Center',
                        body: String(e) + '\n\nStack:\n' + String(e.stack || ''),
                    });
                    dialog.add_response('ok', 'OK');
                    dialog.connect('response', () => dialog.destroy());
                    dialog.present();
                } catch (e2) {
                    log(e2);
                }
            }
        });
        gdmRow.add_suffix(gdmBtn);
        appGroup.add(gdmRow);

        appGroup.add(this.createScaleRow('headerbar-hint', T('Headerbar Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('sidebar-hint', T('Sidebar Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('card-hint', T('Card Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('window-hint', T('Main Window Luminosity Hint'), 0, 100));
        appGroup.add(this.createScaleRow('winbradius', T('Global Window Corner Rounding'), 0, 25));
        appGroup.add(this.createSwitchRow('set-yarutheme', T('Coordinate with Yaru System Palette')));

        const gtkStylingGroup = new Adw.PreferencesGroup({ title: T('GDK Window Custom Styling') });
        appsPage.add(gtkStylingGroup);

        const customGtkWindowSwitch = this.createSwitchRow('enable-gtk-window-custom', T('Enable Custom Window Styling'));
        gtkStylingGroup.add(customGtkWindowSwitch);

        const gtkOpacityRow = this.createScaleRow('gtk-transparency', T('GDK Window Opacity'), 0, 1, 0.01);
        gtkStylingGroup.add(gtkOpacityRow);

        const gtkColorRow = new Adw.ActionRow({
            title: T('Window Background Color'),
            subtitle: T('Choose custom background color for GTK/GDK windows')
        });
        gtkStylingGroup.add(gtkColorRow);

        const gtkColorDialog = new Gtk.ColorDialog();
        const gtkColorBtn = new Gtk.ColorDialogButton({
            dialog: gtkColorDialog,
            valign: Gtk.Align.CENTER
        });

        // Read current vw-color setting
        let vwColorArr = this._settings.get_strv('vw-color');
        let currentGtkColor = new Gdk.RGBA();
        if (vwColorArr && vwColorArr.length === 3) {
            currentGtkColor.red = parseFloat(vwColorArr[0]);
            currentGtkColor.green = parseFloat(vwColorArr[1]);
            currentGtkColor.blue = parseFloat(vwColorArr[2]);
            currentGtkColor.alpha = 1.0;
        } else {
            currentGtkColor.parse('rgba(30, 30, 30, 1.0)');
        }
        gtkColorBtn.set_rgba(currentGtkColor);
        gtkColorRow.add_suffix(gtkColorBtn);

        gtkColorBtn.connect('notify::rgba', () => {
            let rgba = gtkColorBtn.get_rgba();
            let rStr = rgba.red.toFixed(3);
            let gStr = rgba.green.toFixed(3);
            let bStr = rgba.blue.toFixed(3);
            this._settings.set_strv('vw-color', [rStr, gStr, bStr]);
            this._settings.set_strv('dark-vw-color', [rStr, gStr, bStr]);
            this._settings.set_strv('light-vw-color', [rStr, gStr, bStr]);
            this._settings.set_strv('hscd-color', [rStr, gStr, bStr]);
            this._settings.set_strv('dark-hscd-color', [rStr, gStr, bStr]);
            this._settings.set_strv('light-hscd-color', [rStr, gStr, bStr]);
            this.setTimeoutStyleReload();
        });

        const borderGroup = new Adw.PreferencesGroup({ title: T('GDK Window Border Customization') });
        appsPage.add(borderGroup);
        borderGroup.add(this.createScaleRow('winbwidth', T('Border Width'), 0, 10, 0.5));
        borderGroup.add(this.createScaleRow('winbalpha', T('Border Transparency'), 0, 1, 0.01));

        // Border Color picker
        const bColorRow = new Adw.ActionRow({
            title: T('Window Border Color'),
            subtitle: T('Choose custom outline/border color for GTK/GDK windows')
        });
        borderGroup.add(bColorRow);

        const bColorDialog = new Gtk.ColorDialog();
        const bColorBtn = new Gtk.ColorDialogButton({
            dialog: bColorDialog,
            valign: Gtk.Align.CENTER
        });

        let winBColorArr = this._settings.get_strv('winbcolor');
        let currentBColor = new Gdk.RGBA();
        if (winBColorArr && winBColorArr.length === 3) {
            currentBColor.red = parseFloat(winBColorArr[0]);
            currentBColor.green = parseFloat(winBColorArr[1]);
            currentBColor.blue = parseFloat(winBColorArr[2]);
            currentBColor.alpha = 1.0;
        } else {
            currentBColor.parse('rgba(0, 191, 191, 1.0)');
        }
        bColorBtn.set_rgba(currentBColor);
        bColorRow.add_suffix(bColorBtn);

        bColorBtn.connect('notify::rgba', () => {
            let rgba = bColorBtn.get_rgba();
            let rStr = rgba.red.toFixed(3);
            let gStr = rgba.green.toFixed(3);
            let bStr = rgba.blue.toFixed(3);
            this._settings.set_strv('winbcolor', [rStr, gStr, bStr]);
            this._settings.set_strv('dark-winbcolor', [rStr, gStr, bStr]);
            this._settings.set_strv('light-winbcolor', [rStr, gStr, bStr]);
            this.setTimeoutStyleReload();
        });

        const updateGtkWindowSensitivity = () => {
            const active = this._settings.get_boolean('enable-gtk-window-custom');
            gtkOpacityRow.set_sensitive(active);
            gtkColorRow.set_sensitive(active);
            borderGroup.set_sensitive(active);
        };
        this._settings.connect('changed::enable-gtk-window-custom', updateGtkWindowSensitivity);
        updateGtkWindowSensitivity();


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
        const iconIdx = icons.indexOf(this._interfaceSettings.get_string('icon-theme'));
        if (iconIdx !== -1) iconRow.set_selected(iconIdx);
        iconRow.connect('notify::selected', () => {
            this._interfaceSettings.set_string('icon-theme', icons[iconRow.get_selected()]);
        });
        assetGroup.add(iconRow);

        const gtkRow = new Adw.ComboRow({ title: T('GTK Theme') });
        const gtkThemes = this.getInstalledAssets('themes');
        const gtkModel = new Gtk.StringList(); gtkThemes.forEach(t => gtkModel.append(t));
        gtkRow.set_model(gtkModel);
        const gtkIdx = gtkThemes.indexOf(this._interfaceSettings.get_string('gtk-theme'));
        if (gtkIdx !== -1) gtkRow.set_selected(gtkIdx);
        gtkRow.connect('notify::selected', () => {
            const selectedTheme = gtkThemes[gtkRow.get_selected()];
            this._interfaceSettings.set_string('gtk-theme', selectedTheme);
            this.applyGtk4ThemeEcosystem(selectedTheme);
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

    createSwitch(key) {
        const sw = new Gtk.Switch({ valign: Gtk.Align.CENTER });
        this._settings.bind(key, sw, 'active', Gio.SettingsBindFlags.DEFAULT);
        sw.connect('state-set', () => this.setTimeoutStyleReload());
        return sw;
    }

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
            // Connect settings to update/save/reload stylesheet
            const menuKeys = ['menustyle', 'mfgcolor', 'mfgalpha', 'mbgcolor', 'mbgalpha', 'mbcolor', 'mbalpha', 'mhcolor', 'mscolor', 'mshcolor', 'mshalpha', 'menu-radius', 'notif-radius', 'qtoggle-radius', 'slider-height', 'qtile-border', 'font'];
            menuKeys.forEach(k => this._settings.connect(`changed::${k}`, () => this.triggerStyleReload()));
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
            btn.connect('clicked', () => {
                const currentHex = btn.get_tooltip_text();
                clipboard.set(currentHex);
            });
            (i <= 6 ? box1 : box2).append(btn);
            window.paletteButtons.push(btn);
        }
    }

    rgbToHex(r, g, b) { return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1); }

    triggerBackgroundPalette(window) {
        window.paletteButtons.forEach(b => {
            b.child.label = '<span bgcolor="#7d7d7d" font_size="150%">       </span>';
            b.tooltip_text = '#7d7d7d';
        });
        let p = this._settings.get_boolean('bgpalette');
        this._settings.set_boolean('bgpalette', !p);
        setTimeout(() => {
            let i = 1;
            window.paletteButtons.forEach(b => {
                const c = this._settings.get_strv('palette' + i++);
                const hex = this.rgbToHex(c[0], c[1], c[2]);
                b.child.label = `<span bgcolor="${hex}" font_size="150%">       </span>`;
                b.tooltip_text = hex;
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

    _setTypedValue(settings, key, value) {
        try {
            const schemaKey = settings.get_settings_schema().get_key(key);
            const type = schemaKey.get_value_type().dup_string();
            log(`Bar Enhanced: Setting ${key} (type ${type}) to ${JSON.stringify(value)}`);

            if (type === 'b') settings.set_boolean(key, Boolean(value));
            else if (type === 's') settings.set_string(key, String(value));
            else if (type === 'd') settings.set_double(key, parseFloat(value));
            else if (type === 'i') settings.set_int(key, parseInt(value));
            else {
                settings.set_value(key, new GLib.Variant(type, value));
            }
        } catch (e) {
            log(`Bar Enhanced: Failed to set ${key}: ${e}`);
        }
    }

    importSettings(window) {
        let f = new Gtk.FileChooserNative({
            title: T("Import Configuration"),
            action: Gtk.FileChooserAction.OPEN,
            transient_for: window,
            modal: true
        });
        f.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                try {
                    const file = f.get_file();
                    if (!file) return;

                    const [success, contents] = GLib.file_get_contents(file.get_path());
                    if (success) {
                        const rawContent = new TextDecoder().decode(contents);

                        try {
                            const data = JSON.parse(rawContent);
                            const allKeys = this._settings.list_keys();

                            log('Bar Enhanced: Starting JSON import...');
                            this._settings.set_boolean('import-export', true);

                            // 1. Import main settings
                            let mainData = data.main || (data.metadata ? data : null);
                            if (!mainData) {
                                mainData = data;
                            }
                            Object.keys(mainData).forEach(k => {
                                if (allKeys.includes(k) && !['import-export', 'default-font'].includes(k)) {
                                    this._setTypedValue(this._settings, k, mainData[k]);
                                }
                            });

                            // 2. Import Dash to Dock settings
                            let dockData = data['dash-to-dock'];
                            if (dockData) {
                                try {
                                    const dockSettings = this._extension.getSettings('org.gnome.shell.extensions.dash-to-dock');
                                    const dockKeys = dockSettings.list_keys();
                                    Object.keys(dockData).forEach(k => {
                                        if (dockKeys.includes(k)) {
                                            this._setTypedValue(dockSettings, k, dockData[k]);
                                        }
                                    });
                                } catch (e) {
                                    log('Bar Enhanced: Failed to import Dash-to-dock settings:', e);
                                }
                            }

                            // 3. Import Notification Icons settings
                            let niData = data['notification-icons'];
                            if (niData) {
                                try {
                                    const niSettings = this._extension.getSettings('org.gnome.shell.extensions.notification-icons');
                                    const niKeys = niSettings.list_keys();
                                    Object.keys(niData).forEach(k => {
                                        if (niKeys.includes(k)) {
                                            this._setTypedValue(niSettings, k, niData[k]);
                                        }
                                    });
                                } catch (e) {
                                    log('Bar Enhanced: Failed to import Notification-icons settings:', e);
                                }
                            }

                            // 3.5 Import Music Pill and Vitals
                            let musicData = data['dynamic-music-pill'];
                            if (musicData) {
                                try {
                                    const musicSettings = this._extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill');
                                    const musicKeys = musicSettings.list_keys();
                                    Object.keys(musicData).forEach(k => {
                                        if (musicKeys.includes(k)) {
                                            this._setTypedValue(musicSettings, k, musicData[k]);
                                        }
                                    });
                                } catch (e) {
                                    log('Bar Enhanced: Failed to import Dynamic Music Pill settings:', e);
                                }
                            }

                            let vitalsData = data['vitals'];
                            if (vitalsData) {
                                try {
                                    const vitalsSettings = this._extension.getSettings('org.gnome.shell.extensions.vitals');
                                    const vitalsKeys = vitalsSettings.list_keys();
                                    Object.keys(vitalsData).forEach(k => {
                                        if (vitalsKeys.includes(k)) {
                                            this._setTypedValue(vitalsSettings, k, vitalsData[k]);
                                        }
                                    });
                                } catch (e) {
                                    log('Bar Enhanced: Failed to import Vitals settings:', e);
                                }
                            }

                            // 4. Import GDM settings
                            let gdmData = data.gdm;
                            if (gdmData) {
                                Object.keys(gdmData).forEach(sub => {
                                    try {
                                        const subSettings = this._extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.' + sub);
                                        const subKeys = subSettings.list_keys();
                                        Object.keys(gdmData[sub]).forEach(k => {
                                            if (subKeys.includes(k)) {
                                                this._setTypedValue(subSettings, k, gdmData[sub][k]);
                                            }
                                        });
                                    } catch (e) {
                                        log(`Bar Enhanced: Failed to import GDM ${sub} settings:`, e);
                                    }
                                });
                            }

                            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                                log('Bar Enhanced: Releasing Silent Mode and reloading...');
                                this._settings.set_boolean('import-export', false);
                                this.triggerStyleReload();
                                return GLib.SOURCE_REMOVE;
                            });

                            let d = new Gtk.MessageDialog({
                                modal: true,
                                transient_for: window,
                                title: T('Import Successful'),
                                text: T('The configuration profile has been applied correctly.'),
                                buttons: Gtk.ButtonsType.OK
                            });
                            d.connect('response', () => d.destroy());
                            d.show();

                        } catch (jsonErr) {
                            log('Bar Enhanced: Applying TXT profile...');
                            this._settings.set_boolean('import-export', true);

                            const lines = rawContent.split('\n');
                            let currentSettings = this._settings;

                            lines.forEach(line => {
                                line = line.trim();
                                if (line.startsWith('[') && line.endsWith(']')) {
                                    const section = line.substring(1, line.length - 1).trim();
                                    if (section === 'org.gnome.shell.extensions.bar-enhanced') {
                                        currentSettings = this._settings;
                                    } else if (section === 'org.gnome.shell.extensions.dash-to-dock') {
                                        try { currentSettings = this._extension.getSettings('org.gnome.shell.extensions.dash-to-dock'); } catch(e) { currentSettings = null; }
                                    } else if (section === 'org.gnome.shell.extensions.notification-icons') {
                                        try { currentSettings = this._extension.getSettings('org.gnome.shell.extensions.notification-icons'); } catch(e) { currentSettings = null; }
                                    } else if (section === 'org.gnome.shell.extensions.vitals') {
                                        try { currentSettings = this._extension.getSettings('org.gnome.shell.extensions.vitals'); } catch(e) { currentSettings = null; }
                                    } else if (section === 'org.gnome.shell.extensions.dynamic-music-pill') {
                                        try { currentSettings = this._extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill'); } catch(e) { currentSettings = null; }
                                    } else if (section.startsWith('org.gnome.shell.extensions.bar-enhanced.gdm.')) {
                                        try { currentSettings = this._extension.getSettings(section); } catch(e) { currentSettings = null; }
                                    } else {
                                        currentSettings = null;
                                    }
                                } else if (line.includes('=') && !line.startsWith('#')) {
                                    if (!currentSettings) return;
                                    let eqIdx = line.indexOf('=');
                                    let key = line.substring(0, eqIdx).trim();
                                    let value = line.substring(eqIdx + 1).trim();

                                    try {
                                        const variant = GLib.Variant.parse(null, value, null, null);
                                        if (currentSettings.list_keys().includes(key)) {
                                            currentSettings.set_value(key, variant);
                                        }
                                    } catch (e) {
                                        log(`Bar Enhanced: Failed to parse TXT key ${key}: ${e}`);
                                    }
                                }
                            });

                            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                                this._settings.set_boolean('import-export', false);
                                this.triggerStyleReload();
                                return GLib.SOURCE_REMOVE;
                            });
                        }
                    }
                } catch (e) {
                    log('Bar Enhanced: Import failed: ' + e);
                }
            }
        });
        f.show();
    }

    exportSettings(window) {
        let d = new Gtk.MessageDialog({
            modal: true,
            transient_for: window,
            title: T('Export Format'),
            text: T('Choose the format for your configuration profile:'),
            buttons: Gtk.ButtonsType.NONE
        });

        d.add_button(T('JSON (Modern/Full)'), 1);
        d.add_button(T('TXT (Legacy/Dconf)'), 2);
        d.add_button(T('Cancel'), Gtk.ResponseType.CANCEL);

        d.connect('response', (s, responseId) => {
            d.destroy();
            if (responseId === 1 || responseId === 2) {
                this._openExportFileChooser(window, responseId);
            }
        });
        d.show();
    }

    _openExportFileChooser(window, formatId) {
        const isJson = formatId === 1;
        let f = new Gtk.FileChooserNative({
            title: isJson ? T("Export as JSON") : T("Export as TXT"),
            action: Gtk.FileChooserAction.SAVE,
            transient_for: window,
            modal: true
        });
        f.set_current_name(isJson ? "bar-enhanced-profile.json" : "bar-enhanced-profile.txt");

        f.connect('response', (s, r) => {
            if (r == Gtk.ResponseType.ACCEPT) {
                try {
                    let path = f.get_file().get_path();
                    if (!path) return;

                    let content = '';
                    if (isJson) {
                        let data = {
                            metadata: {
                                author: 'MrVanguardia',
                                version: '2.0',
                                created: new Date().toISOString(),
                                engine: 'Bar Enhanced'
                            },
                            main: {},
                            'dash-to-dock': {},
                            'notification-icons': {},
                            'dynamic-music-pill': {},
                            'vitals': {},
                            gdm: {}
                        };
                        
                        // 1. Export main settings
                        this._settings.list_keys().forEach(k => {
                            if (!['import-export', 'default-font'].includes(k))
                                data.main[k] = this._settings.get_value(k).deep_unpack();
                        });
                        
                        // 2. Export Dash to Dock settings
                        try {
                            const dockSettings = this._extension.getSettings('org.gnome.shell.extensions.dash-to-dock');
                            dockSettings.list_keys().forEach(k => {
                                data['dash-to-dock'][k] = dockSettings.get_value(k).deep_unpack();
                            });
                        } catch (e) {
                            log('Bar Enhanced: Dash-to-dock settings not available for export:', e);
                        }

                        // 3. Export Notification Icons settings
                        try {
                            const niSettings = this._extension.getSettings('org.gnome.shell.extensions.notification-icons');
                            niSettings.list_keys().forEach(k => {
                                data['notification-icons'][k] = niSettings.get_value(k).deep_unpack();
                            });
                        } catch (e) {
                            log('Bar Enhanced: Notification-icons settings not available for export:', e);
                        }

                        // 3.5 Export Music Pill and Vitals settings
                        try {
                            const musicSettings = this._extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill');
                            musicSettings.list_keys().forEach(k => {
                                data['dynamic-music-pill'][k] = musicSettings.get_value(k).deep_unpack();
                            });
                        } catch (e) {
                            log('Bar Enhanced: Dynamic Music Pill settings not available for export:', e);
                        }

                        try {
                            const vitalsSettings = this._extension.getSettings('org.gnome.shell.extensions.vitals');
                            vitalsSettings.list_keys().forEach(k => {
                                data['vitals'][k] = vitalsSettings.get_value(k).deep_unpack();
                            });
                        } catch (e) {
                            log('Bar Enhanced: Vitals settings not available for export:', e);
                        }

                        // 4. Export GDM settings
                        const GDM_SUBSCHEMAS = [
                            'accessibility', 'appearance', 'fonts', 'main', 'misc', 'mouse',
                            'night-light', 'pointing', 'power', 'sound', 'tools', 'top-bar',
                            'touchpad', 'window-state'
                        ];
                        GDM_SUBSCHEMAS.forEach(sub => {
                            try {
                                const subSettings = this._extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.' + sub);
                                data.gdm[sub] = {};
                                subSettings.list_keys().forEach(k => {
                                    data.gdm[sub][k] = subSettings.get_value(k).deep_unpack();
                                });
                            } catch (e) {
                                log(`Bar Enhanced: GDM ${sub} settings not available for export:`, e);
                            }
                        });

                        content = JSON.stringify(data, null, 4);
                    } else {
                        // Manual dconf-style generation for reliability
                        let lines = ['[org.gnome.shell.extensions.bar-enhanced]'];
                        this._settings.list_keys().forEach(k => {
                            if (!['import-export', 'default-font'].includes(k)) {
                                let val = this._settings.get_value(k).print(true);
                                lines.push(`${k}=${val}`);
                            }
                        });

                        // Dash to Dock
                        try {
                            const dockSettings = this._extension.getSettings('org.gnome.shell.extensions.dash-to-dock');
                            lines.push('\n[org.gnome.shell.extensions.dash-to-dock]');
                            dockSettings.list_keys().forEach(k => {
                                let val = dockSettings.get_value(k).print(true);
                                lines.push(`${k}=${val}`);
                            });
                        } catch (e) {}

                        // Notification Icons
                        try {
                            const niSettings = this._extension.getSettings('org.gnome.shell.extensions.notification-icons');
                            lines.push('\n[org.gnome.shell.extensions.notification-icons]');
                            niSettings.list_keys().forEach(k => {
                                let val = niSettings.get_value(k).print(true);
                                lines.push(`${k}=${val}`);
                            });
                        } catch (e) {}

                        // GDM settings
                        const GDM_SUBSCHEMAS = [
                            'accessibility', 'appearance', 'fonts', 'main', 'misc', 'mouse',
                            'night-light', 'pointing', 'power', 'sound', 'tools', 'top-bar',
                            'touchpad', 'window-state'
                        ];
                        GDM_SUBSCHEMAS.forEach(sub => {
                            try {
                                const subSettings = this._extension.getSettings('org.gnome.shell.extensions.bar-enhanced.gdm.' + sub);
                                lines.push(`\n[org.gnome.shell.extensions.bar-enhanced.gdm.${sub}]`);
                                subSettings.list_keys().forEach(k => {
                                    let val = subSettings.get_value(k).print(true);
                                    lines.push(`${k}=${val}`);
                                });
                            } catch (e) {}
                        });

                        // Vitals & Music Pill
                        try {
                            const vitalsSettings = this._extension.getSettings('org.gnome.shell.extensions.vitals');
                            lines.push('\n[org.gnome.shell.extensions.vitals]');
                            vitalsSettings.list_keys().forEach(k => {
                                let val = vitalsSettings.get_value(k).print(true);
                                lines.push(`${k}=${val}`);
                            });
                        } catch (e) {}

                        try {
                            const musicSettings = this._extension.getSettings('org.gnome.shell.extensions.dynamic-music-pill');
                            lines.push('\n[org.gnome.shell.extensions.dynamic-music-pill]');
                            musicSettings.list_keys().forEach(k => {
                                let val = musicSettings.get_value(k).print(true);
                                lines.push(`${k}=${val}`);
                            });
                        } catch (e) {}

                        content = lines.join('\n');
                    }

                    GLib.file_set_contents(path, content);
                    log(`Bar Enhanced: Profile successfully saved as ${isJson ? 'JSON' : 'TXT'} to ${path}`);
                } catch (e) {
                    log('Bar Enhanced: Export failed: ' + e);
                }
            }
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
        log('Bar Enhanced: Generating theme code...');
        try {
            let data = { main: {}, enhanced: {} };
            const allKeys = this._settings.list_keys();
            allKeys.forEach(k => {
                if (['import-export', 'default-font'].includes(k)) return;
                const val = this._settings.get_value(k).deep_unpack();
                if (k.startsWith('palette') || k.startsWith('count') || k.startsWith('candy')) {
                    data.enhanced[k] = val;
                } else {
                    data.main[k] = val;
                }
            });

            const json = JSON.stringify(data);
            const bytes = new TextEncoder().encode(json);
            const code = GLib.base64_encode(bytes);

            let d = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading: T('Export to Code'),
                body: T('Use this code to share your theme with others.'),
            });

            const scroll = new Gtk.ScrolledWindow({
                height_request: 120,
                propagate_natural_height: true,
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                css_classes: ['card']
            });

            const textView = new Gtk.TextView({
                editable: false,
                wrap_mode: Gtk.WrapMode.CHAR,
                left_margin: 8,
                right_margin: 8,
                top_margin: 8,
                bottom_margin: 8,
                css_classes: ['view']
            });
            textView.get_buffer().set_text(code, -1);
            scroll.set_child(textView);
            d.set_extra_child(scroll);

            d.add_response('close', T('Close'));
            d.add_response('copy', T('Copy Code'));
            d.set_default_response('copy');
            d.set_close_response('close');

            d.connect('response', (s, response) => {
                if (response === 'copy') {
                    try {
                        const clipboard = Gdk.Display.get_default().get_clipboard();
                        clipboard.set_content(Gdk.ContentProvider.new_for_value(code));
                    } catch (err) {
                        log('Bar Enhanced: Clipboard error: ' + err);
                    }
                }
                d.destroy();
            });

            d.show();
        } catch (e) {
            log('Bar Enhanced: Export to Code failed: ' + e);
        }
    }

    importFromCode(window) {
        log('Bar Enhanced: Opening theme import dialog...');
        try {
            let d = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading: T('Import from Code'),
                body: T('Paste the theme code below to apply it.'),
            });

            const entry = new Gtk.Entry({
                placeholder_text: 'Paste code here...',
                margin_top: 12
            });
            d.set_extra_child(entry);

            d.add_response('cancel', T('Cancel'));
            d.add_response('import', T('Import'));
            d.set_default_response('import');
            d.set_close_response('cancel');

            d.connect('response', (s, response) => {
                if (response === 'import') {
                    try {
                        const code = entry.get_buffer().get_text().trim();
                        if (!code) return;

                        log('Bar Enhanced: Decoding theme code...');
                        const decodedBytes = GLib.base64_decode(code);
                        const json = new TextDecoder().decode(decodedBytes);
                        const data = JSON.parse(json);

                        const allKeys = this._settings.list_keys();
                        this._settings.set_boolean('import-export', true);

                        // Handle both categoried and flat JSON
                        let mainData = data.main || (data.metadata ? data : null);
                        let enhData = data.enhanced || {};
                        if (!mainData) mainData = data;

                        Object.keys(mainData).forEach(k => {
                            if (allKeys.includes(k) && !['import-export', 'default-font'].includes(k)) {
                                this._setTypedValue(this._settings, k, mainData[k]);
                            }
                        });

                        Object.keys(enhData).forEach(k => {
                            if (allKeys.includes(k) && !['import-export', 'default-font'].includes(k)) {
                                this._setTypedValue(this._settings, k, enhData[k]);
                            }
                        });

                        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                            log('Bar Enhanced: Releasing Silent Mode and reloading...');
                            this._settings.set_boolean('import-export', false);
                            this.triggerStyleReload();
                            return GLib.SOURCE_REMOVE;
                        });

                        log('Bar Enhanced: Theme code applied successfully');
                    } catch (e) {
                        log('Bar Enhanced: Import from Code failed: ' + e);
                    }
                }
                d.destroy();
            });

            d.show();
        } catch (e) {
            log('Bar Enhanced: Import from Code dialog failed: ' + e);
        }
    }


    getInstalledAssets(type) {
        const dirs = [
            GLib.get_home_dir() + '/.local/share/' + type,
            '/usr/share/' + type
        ];
        if (type === 'themes') {
            dirs.push(GLib.get_home_dir() + '/.themes');
        } else if (type === 'icons') {
            dirs.push(GLib.get_home_dir() + '/.icons');
        }
        let assets = [];
        dirs.forEach(path => {
            try {
                let dir = GLib.Dir.open(path, 0);
                let name;
                while ((name = dir.read_name())) {
                    if (name !== '.' && name !== '..' && !assets.includes(name)) assets.push(name);
                }
            } catch (e) { }
        });
        return assets.sort();
    }

    installAssetDialog(window, iconRow, gtkRow) {
        let f = new Gtk.FileChooserNative({
            title: T("Install Theme from File"),
            action: Gtk.FileChooserAction.OPEN,
            transient_for: window,
            modal: true
        });
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

    downloadAndInstall(url, name, type, callback) {
        let ext = '.tar.gz';
        if (url.toLowerCase().includes('.zip')) ext = '.zip';
        else if (url.toLowerCase().includes('.tar.xz')) ext = '.tar.xz';
        else if (url.toLowerCase().includes('.tar.bz2')) ext = '.tar.bz2';

        const tempPath = `/tmp/${name.replace(/\s+/g, '_')}${ext}`;
        const proc = Gio.Subprocess.new(
            ['curl', '-L', url, '-o', tempPath],
            Gio.SubprocessFlags.NONE
        );

        proc.wait_async(null, (p, res) => {
            try {
                p.wait_finish(res);
                this.installAsset(tempPath, type, callback);
            } catch (e) {
                log('Download failed:', e);
            }
        });
    }

    installAsset(filePath, type, callback) {
        const destDir = (type === 'icons' || filePath.toLowerCase().includes('icon'))
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
                log('Extraction failed:', e);
            }
        });
    }

    applyGtk4ThemeEcosystem(themeName) {
        try {
            const configDir = GLib.get_user_config_dir();
            const gtk4ConfigDir = Gio.File.new_for_path(`${configDir}/gtk-4.0`);
            if (!gtk4ConfigDir.query_exists(null)) {
                gtk4ConfigDir.make_directory_with_parents(null);
            }

            const localThemePath = `${GLib.get_home_dir()}/.local/share/themes/${themeName}/gtk-4.0`;
            const legacyThemePath = `${GLib.get_home_dir()}/.themes/${themeName}/gtk-4.0`;
            const systemThemePath = `/usr/share/themes/${themeName}/gtk-4.0`;

            let sourceDir = null;
            if (Gio.File.new_for_path(localThemePath).query_exists(null)) {
                sourceDir = localThemePath;
            } else if (Gio.File.new_for_path(legacyThemePath).query_exists(null)) {
                sourceDir = legacyThemePath;
            } else if (Gio.File.new_for_path(systemThemePath).query_exists(null)) {
                sourceDir = systemThemePath;
            }

            const gtkCssFile = Gio.File.new_for_path(`${configDir}/gtk-4.0/gtk.css`);

            if (sourceDir) {
                // Back up original user css if it exists and is not ours
                if (gtkCssFile.query_exists(null)) {
                    try {
                        const [contents] = gtkCssFile.load_contents(null);
                        const decoder = new TextDecoder('utf-8');
                        const contentsStr = decoder.decode(contents);
                        if (!contentsStr.includes('/*** Bar Enhanced GTK CSS ***/') && !contentsStr.includes('/*** GTK4 Theme Ecosystem ***/')) {
                            const backupFile = Gio.File.new_for_path(`${configDir}/gtk-4.0/gtk_backup_user.css`);
                            gtkCssFile.copy(backupFile, Gio.FileCopyFlags.OVERWRITE, null, null);
                        }
                    } catch (err) { }
                }

                // Clean the slate and copy recursively asynchronously without freezing the UI
                const script = `
rm -f "${configDir}/gtk-4.0/gtk.css"
rm -f "${configDir}/gtk-4.0/gtk-dark.css"
rm -rf "${configDir}/gtk-4.0/assets"
cp -rf "${sourceDir}/." "${configDir}/gtk-4.0/"
`;
                const proc = Gio.Subprocess.new(
                    ['bash', '-c', script],
                    Gio.SubprocessFlags.NONE
                );
                proc.wait_async(null, (p, res) => {
                    try {
                        p.wait_finish(res);
                        // Add our header so we know it's injected
                        if (gtkCssFile.query_exists(null)) {
                            const [contents] = gtkCssFile.load_contents(null);
                            const decoder = new TextDecoder('utf-8');
                            let contentsStr = decoder.decode(contents);
                            if (!contentsStr.includes('/*** GTK4 Theme Ecosystem ***/')) {
                                contentsStr = `/*** GTK4 Theme Ecosystem ***/\n` + contentsStr;
                                const encoder = new TextEncoder();
                                const bytes = encoder.encode(contentsStr);
                                gtkCssFile.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                            }
                        }
                    } catch (e) { }
                });
            } else {
                // Clean the slate asynchronously
                const script = `
rm -f "${configDir}/gtk-4.0/gtk.css"
rm -f "${configDir}/gtk-4.0/gtk-dark.css"
rm -rf "${configDir}/gtk-4.0/assets"
`;
                const proc = Gio.Subprocess.new(
                    ['bash', '-c', script],
                    Gio.SubprocessFlags.NONE
                );
                proc.wait_async(null, (p, res) => {
                    try {
                        p.wait_finish(res);
                        // Restore user's backup if it exists
                        const backupFile = Gio.File.new_for_path(`${configDir}/gtk-4.0/gtk_backup_user.css`);
                        if (backupFile.query_exists(null)) {
                            try {
                                backupFile.move(gtkCssFile, Gio.FileCopyFlags.OVERWRITE, null, null);
                            } catch (err) { }
                        }
                    } catch (e) { }
                });
            }
        } catch (e) {
            log('Error applying GTK4 theme:', e);
        }
    }

    openStoreModal(parent, iconRow) {
        const storeWindow = new Adw.Window({
            title: T('Theme Store'),
            modal: true,
            transient_for: parent,
            default_width: 680,
            default_height: 600
        });
        const toolbarView = new Adw.ToolbarView();
        const header = new Adw.HeaderBar();
        toolbarView.add_top_bar(header);

        const mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });

        // Contenedor fijo para el buscador
        const searchBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin_start: 24,
            margin_end: 24,
            margin_top: 12,
            margin_bottom: 6
        });
        const searchBar = new Gtk.SearchEntry({
            placeholder_text: T('Search themes...')
        });
        searchBox.append(searchBar);
        mainBox.append(searchBox);

        const scroll = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            min_content_height: 450,
            propagate_natural_height: true
        });

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: T('Featured Themes & Icons'),
            description: T('Download community styles.')
        });

        const themeContainer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
        group.add(themeContainer);

        const loadingLabel = new Gtk.Label({ label: T('Loading themes...'), margin_top: 20 });
        themeContainer.append(loadingLabel);

        searchBar.connect('search-changed', () => {
            const term = searchBar.get_text();
            if (this.searchTimeoutId) GLib.Source.remove(this.searchTimeoutId);

            if (term.length === 0) {
                this.fetchOnlineThemes(themeContainer, loadingLabel, iconRow);
            } else if (term.length > 2) {
                this.searchTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    this.searchOnlineThemes(themeContainer, term, iconRow);
                    this.searchTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                });
            }
        });

        searchBar.connect('activate', () => {
            const term = searchBar.get_text();
            if (term.length > 2) {
                this.searchOnlineThemes(themeContainer, term, iconRow);
            }
        });

        page.add(group);
        scroll.set_child(page);
        mainBox.append(scroll);

        toolbarView.set_content(mainBox);
        storeWindow.set_content(toolbarView);

        this.fetchOnlineThemes(themeContainer, loadingLabel, iconRow);
        storeWindow.present();
    }

    _getSoupSession() {
        if (!this._soupSession) {
            this._soupSession = new Soup.Session();
            this._soupSession.set_user_agent('Mozilla/5.0 (GNOME Shell; Bar-Enhanced)');
            try {
                this._soupSession.http2 = false;
            } catch (e) { }
        }
        return this._soupSession;
    }

    searchOnlineThemes(container, term, iconRow) {
        let child = container.get_first_child();
        while (child) {
            let next = child.get_next_sibling();
            container.remove(child);
            child = next;
        }

        const loadingLabel = new Gtk.Label({ label: T('Searching for') + ': "' + term + '"...', margin_top: 20 });
        container.append(loadingLabel);

        const url = `https://api.pling.com/ocs/v1/content/data?search=${encodeURIComponent(term)}&sort=rating&pagesize=100&format=json`;
        const message = Soup.Message.new_from_uri('GET', GLib.Uri.parse(url, GLib.UriFlags.NONE));

        this._getSoupSession().send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (s, res) => {
            try {
                const bytes = s.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const jsonText = decoder.decode(bytes.get_data());
                const response = JSON.parse(jsonText);
                const rawData = response?.data;
                const data = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : [];
                this.renderThemeList(container, loadingLabel, iconRow, data);
            } catch (e) {
                log('searchOnlineThemes exception:', e);
                if (loadingLabel.get_parent()) loadingLabel.set_label(T('No results or API error.'));
            }
        });
    }

    fetchOnlineThemes(container, loadingLabel, iconRow) {
        let child = container.get_first_child();
        while (child) {
            let next = child.get_next_sibling();
            container.remove(child);
            child = next;
        }

        if (loadingLabel && !loadingLabel.get_parent()) {
            container.append(loadingLabel);
            loadingLabel.set_label(T('Loading themes...'));
        }

        const categories = ['121', '135', '109'];
        let allThemes = [];
        let completed = 0;

        categories.forEach(cat => {
            const url = `https://api.pling.com/ocs/v1/content/data?categories=${cat}&sort=rating&pagesize=50&format=json`;
            const message = Soup.Message.new_from_uri('GET', GLib.Uri.parse(url, GLib.UriFlags.NONE));

            this._getSoupSession().send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                try {
                    const bytes = s.send_and_read_finish(res);
                    const decoder = new TextDecoder('utf-8');
                    const jsonText = decoder.decode(bytes.get_data());
                    const response = JSON.parse(jsonText);
                    const rawData = response?.data;
                    if (rawData) {
                        const items = Array.isArray(rawData) ? rawData : [rawData];
                        allThemes = [...allThemes, ...items];
                    }
                } catch (e) {
                    log('fetchOnlineThemes exception:', e);
                }

                completed++;
                if (completed === categories.length) {
                    allThemes.sort((a, b) => (parseInt(b.rating) || 0) - (parseInt(a.rating) || 0));
                    this.renderThemeList(container, loadingLabel, iconRow, allThemes);
                }
            });
        });
    }

    getGnomeShellVersion() {
        try {
            let [res, stdout, stderr, status] = GLib.spawn_command_line_sync('gnome-shell --version');
            if (res) {
                const output = new TextDecoder().decode(stdout).trim();
                const match = output.match(/(\d+\.?\d*)/);
                if (match) {
                    const parts = match[1].split('.');
                    return parts[0];
                }
            }
        } catch (e) { }
        return '45';
    }

    checkCompatibility(item, gnomeMajorVersion) {
        const name = (item.name || '').toLowerCase();
        const typename = (item.typename || '').toLowerCase();
        const typeid = String(item.typeid || '');

        if (name.includes('grub') || name.includes('boot') || name.includes('plymouth')) {
            return { compatible: false, reason: T('GRUB/Boot Theme') };
        }

        if (typeid === '121' || typename.includes('icon')) {
            return { compatible: true, reason: T('100% Compatible') };
        }

        const ancientGnomePatterns = [
            /\b(3\.(30|32|34|36|38))\b/,
            /gnome\s*3\b/
        ];
        for (const pattern of ancientGnomePatterns) {
            if (pattern.test(name)) {
                return { compatible: false, reason: T('Designed for ancient GNOME 3.x') };
            }
        }

        if (typeid === '109' || typename.includes('shell')) {
            return { compatible: true, reason: T('Compatible with GNOME') + ' ' + gnomeMajorVersion };
        }

        if (typeid === '135' || typename.includes('gtk')) {
            const hasGtk4 = name.includes('gtk4') || name.includes('libadwaita') || name.includes('gtk 4');
            if (hasGtk4) {
                return { compatible: true, reason: T('GTK4 & Libadwaita Support') };
            }
            return { compatible: true, reason: T('Compatible with legacy apps') };
        }

        return { compatible: true, reason: T('Compatible') };
    }

    renderThemeList(container, loadingLabel, iconRow, data) {
        try {
            if (loadingLabel && loadingLabel.get_parent()) container.remove(loadingLabel);
        } catch (e) { }

        if (!data || !Array.isArray(data) || data.length === 0) {
            data = [
                { name: 'WhiteSur Icons', previewpic1: 'https://www.pling.com/img/d/7/4/1/f45a05b38d39369a4736f88f24a0d92f9f1b.png', downloadlink1: 'https://github.com/vinceliuice/WhiteSur-icon-theme/archive/refs/heads/master.tar.gz' },
                { name: 'Tela Circle Icons', previewpic1: 'https://www.pling.com/img/5/0/0/2/026859e43673c6833b666a012c478a29b43d.png', downloadlink1: 'https://github.com/vinceliuice/Tela-circle-icon-theme/archive/refs/heads/master.tar.gz' }
            ];
        }

        const gnomeMajor = this.getGnomeShellVersion();
        const installedIcons = this.getInstalledAssets('icons');
        const installedThemes = this.getInstalledAssets('themes');
        const allInstalled = [...installedIcons, ...installedThemes];

        data.forEach((item) => {
            const name = item.name;
            const link = item.downloadlink1;
            const preview = item.previewpic1 || item.previewpic2;
            if (!item.id && !link) return;

            const compat = this.checkCompatibility(item, gnomeMajor);
            if (!compat.compatible) return;

            const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isInstalled = allInstalled.some(i => {
                const cleanInstalled = i.toLowerCase().replace(/[^a-z0-9]/g, '');
                return cleanName.includes(cleanInstalled) || cleanInstalled.includes(cleanName) ||
                    name.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(name.toLowerCase().replace(/\s+icons?$/i, ''));
            });

            let typeLabelText = '';
            const typeid = String(item.typeid || '');
            if (typeid === '121') {
                typeLabelText = T('Icon Pack');
            } else if (typeid === '135') {
                typeLabelText = T('GTK Theme');
            } else if (typeid === '109') {
                typeLabelText = T('Shell Theme');
            } else if (item.typename) {
                typeLabelText = item.typename;
            } else {
                typeLabelText = T('Icon Pack');
            }

            let subtitleText = `${typeLabelText}  •  ${compat.reason}`;
            if (isInstalled) {
                subtitleText += `  •  ${T('Installed')}`;
            }

            const row = new Adw.ActionRow({
                title: name,
                subtitle: subtitleText
            });

            const picture = new Gtk.Image({
                pixel_size: 64, margin_end: 12, halign: Gtk.Align.START, valign: Gtk.Align.CENTER,
                icon_name: 'image-missing-symbolic'
            });
            row.add_prefix(picture);

            if (preview) {
                const imgMsg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(preview, GLib.UriFlags.NONE));
                this._getSoupSession().send_and_read_async(imgMsg, GLib.PRIORITY_DEFAULT, null, (s, r) => {
                    try {
                        const bytes = s.send_and_read_finish(r);
                        const stream = Gio.MemoryInputStream.new_from_bytes(bytes);
                        const pixbuf = GdkPixbuf.Pixbuf.new_from_stream_at_scale(stream, 64, 64, true, null);
                        const paintable = Gdk.Texture.new_for_pixbuf(pixbuf);
                        picture.set_from_paintable(paintable);
                    } catch (e) {
                        log('IMAGE FETCH/CONVERSION ERROR for ' + name + ' (URL: ' + preview + '): ' + e);
                    }
                });
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

                const performDownload = (downloadUrl) => {
                    let assetType = 'themes';
                    const typeid = String(item.typeid || '');
                    if (typeid === '121' || (item.typename && item.typename.toLowerCase().includes('icon')) || name.toLowerCase().includes('icon')) {
                        assetType = 'icons';
                    }
                    this.downloadAndInstall(downloadUrl, name, assetType, () => {
                        btn.set_label(T('Installed'));
                        btn.add_css_class('flat');
                        if (iconRow) {
                            const icons = this.getInstalledAssets('icons');
                            const iconModel = new Gtk.StringList(); icons.forEach(i => iconModel.append(i));
                            iconRow.set_model(iconModel);
                        }
                    });
                };

                if (link && (link.includes('github') || link.includes('dl.pling') || link.includes('files06') || link.endsWith('.tar.gz') || link.endsWith('.zip') || link.endsWith('.tar.xz'))) {
                    performDownload(link);
                } else if (item.id) {
                    const downloadApiUrl = `https://api.pling.com/ocs/v1/content/download/${item.id}/1?format=json`;
                    const msg = Soup.Message.new_from_uri('GET', GLib.Uri.parse(downloadApiUrl, GLib.UriFlags.NONE));
                    this._getSoupSession().send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null, (s, res) => {
                        try {
                            const bytes = s.send_and_read_finish(res);
                            const decoder = new TextDecoder('utf-8');
                            const jsonText = decoder.decode(bytes.get_data());
                            const resp = JSON.parse(jsonText);
                            let realLink = resp?.data?.[0]?.downloadlink || resp?.data?.downloadlink;
                            if (!realLink && resp?.ocs?.data) {
                                const dataObj = resp.ocs.data;
                                realLink = dataObj.downloadlink || dataObj.link;
                            }
                            if (!realLink && resp?.ocs?.data?.content) {
                                const content = resp.ocs.data.content;
                                const firstItem = Array.isArray(content) ? content[0] : content;
                                realLink = firstItem?.downloadlink1 || firstItem?.downloadlink;
                            }
                            if (realLink) {
                                performDownload(realLink);
                            } else {
                                performDownload(link || `https://www.pling.com/p/${item.id}/dw/`);
                            }
                        } catch (err) {
                            performDownload(link || `https://www.pling.com/p/${item.id}/dw/`);
                        }
                    });
                } else {
                    performDownload(link);
                }
            });
            row.add_suffix(btn);
            container.append(row);
        });
    }

    factoryReset(window) {
        const dialog = new Adw.MessageDialog({
            heading: T('Reset Environment?'),
            body: T('All customizations will be purged and reverted to factory defaults.'),
            close_response: 'cancel',
            default_response: 'reset'
        });
        dialog.add_response('cancel', T('Cancel'));
        dialog.add_response('reset', T('Reset'));
        dialog.set_response_appearance('reset', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.connect('response', (d, r) => {
            if (r === 'reset') {
                this._settings.list_keys().forEach(k => {
                    if (k !== 'import-export' && k !== 'default-font') this._settings.reset(k);
                });
                this.triggerStyleReload();
            }
        });
        dialog.present(window);
    }
    applyExtractedPalette(window, btn) {
        try {
            // Helper to compute contrast color (white or dark) based on background RGB
            const getContrastColor = (rVal, gVal, bVal) => {
                const Y = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;
                // If light background, return dark text. Else, return white text.
                return Y > 130 ? ['0.100', '0.100', '0.100'] : ['1.000', '1.000', '1.000'];
            };

            // Pause stylesheet reload during multi-setting changes
            this._settings.set_boolean('pause-reload', true);

            // Copy palette1-12 to candy1-12, dark-candy1-12, and light-candy1-12
            for (let i = 1; i <= 12; i++) {
                const c = this._settings.get_strv(`palette${i}`);
                if (c && c.length === 3) {
                    let r = (parseInt(c[0]) / 255.0).toFixed(3);
                    let g = (parseInt(c[1]) / 255.0).toFixed(3);
                    let b = (parseInt(c[2]) / 255.0).toFixed(3);

                    this._settings.set_strv(`candy${i}`, [r, g, b]);
                    this._settings.set_strv(`dark-candy${i}`, [r, g, b]);
                    this._settings.set_strv(`light-candy${i}`, [r, g, b]);
                }
            }

            // Set background color to primary palette color and compute bar foreground contrast
            const bg = this._settings.get_strv('palette1');
            if (bg && bg.length === 3) {
                let r = (parseInt(bg[0]) / 255.0).toFixed(3);
                let g = (parseInt(bg[1]) / 255.0).toFixed(3);
                let b = (parseInt(bg[2]) / 255.0).toFixed(3);

                this._settings.set_strv('bgcolor', [r, g, b]);
                this._settings.set_strv('iscolor', [r, g, b]);
                this._settings.set_strv('dark-bgcolor', [r, g, b]);
                this._settings.set_strv('dark-iscolor', [r, g, b]);
                this._settings.set_strv('light-bgcolor', [r, g, b]);
                this._settings.set_strv('light-iscolor', [r, g, b]);

                // Calculate and apply bar foreground (text) contrast
                const fg = getContrastColor(parseInt(bg[0]), parseInt(bg[1]), parseInt(bg[2]));
                this._settings.set_strv('fgcolor', fg);
                this._settings.set_strv('dark-fgcolor', fg);
                this._settings.set_strv('light-fgcolor', fg);

                // Apply primary palette color to popups / menu background
                this._settings.set_strv('mbgcolor', [r, g, b]);
                this._settings.set_strv('dark-mbgcolor', [r, g, b]);
                this._settings.set_strv('light-mbgcolor', [r, g, b]);

                // Calculate popups / menu foreground (text) contrast
                const mfg = getContrastColor(parseInt(bg[0]), parseInt(bg[1]), parseInt(bg[2]));
                this._settings.set_strv('mfgcolor', mfg);
                this._settings.set_strv('dark-mfgcolor', mfg);
                this._settings.set_strv('light-mfgcolor', mfg);
            }

            // Apply secondary palette color to menu tiles / secondary surfaces background
            const smbg = this._settings.get_strv('palette2') || this._settings.get_strv('palette1');
            if (smbg && smbg.length === 3) {
                let r = (parseInt(smbg[0]) / 255.0).toFixed(3);
                let g = (parseInt(smbg[1]) / 255.0).toFixed(3);
                let b = (parseInt(smbg[2]) / 255.0).toFixed(3);
                this._settings.set_strv('smbgcolor', [r, g, b]);
                this._settings.set_strv('dark-smbgcolor', [r, g, b]);
                this._settings.set_strv('light-smbgcolor', [r, g, b]);
            }

            // Set border color to tertiary or secondary palette color
            const border = this._settings.get_strv('palette3') || this._settings.get_strv('palette2');
            if (border && border.length === 3) {
                let r = (parseInt(border[0]) / 255.0).toFixed(3);
                let g = (parseInt(border[1]) / 255.0).toFixed(3);
                let b = (parseInt(border[2]) / 255.0).toFixed(3);
                this._settings.set_strv('bcolor', [r, g, b]);
                this._settings.set_strv('dark-bcolor', [r, g, b]);
                this._settings.set_strv('light-bcolor', [r, g, b]);

                // Also apply this color to menu border outline
                this._settings.set_strv('mbcolor', [r, g, b]);
                this._settings.set_strv('dark-mbcolor', [r, g, b]);
                this._settings.set_strv('light-mbcolor', [r, g, b]);
            }

            // Enable manual accent override and set custom accent color
            this._settings.set_boolean('accent-override', true);
            const acc = this._settings.get_strv('palette2') || this._settings.get_strv('palette1');
            if (acc && acc.length === 3) {
                let r = (parseInt(acc[0]) / 255.0).toFixed(3);
                let g = (parseInt(acc[1]) / 255.0).toFixed(3);
                let b = (parseInt(acc[2]) / 255.0).toFixed(3);
                this._settings.set_strv('accent-color', [r, g, b]);
                this._settings.set_strv('dark-accent-color', [r, g, b]);
                this._settings.set_strv('light-accent-color', [r, g, b]);

                // Set menu active toggles color (mscolor) to this accent color!
                this._settings.set_strv('mscolor', [r, g, b]);
                this._settings.set_strv('dark-mscolor', [r, g, b]);
                this._settings.set_strv('light-mscolor', [r, g, b]);
            }

            // Set menu hover indicators color (mhcolor) to tertiary palette color or accent
            const hoverCol = this._settings.get_strv('palette3') || this._settings.get_strv('palette2');
            if (hoverCol && hoverCol.length === 3) {
                let r = (parseInt(hoverCol[0]) / 255.0).toFixed(3);
                let g = (parseInt(hoverCol[1]) / 255.0).toFixed(3);
                let b = (parseInt(hoverCol[2]) / 255.0).toFixed(3);
                this._settings.set_strv('mhcolor', [r, g, b]);
                this._settings.set_strv('dark-mhcolor', [r, g, b]);
                this._settings.set_strv('light-mhcolor', [r, g, b]);
            }

            // Set system GTK headerbar and sidebars custom colors to primary palette color
            const hscd = this._settings.get_strv('palette1');
            if (hscd && hscd.length === 3) {
                let r = (parseInt(hscd[0]) / 255.0).toFixed(3);
                let g = (parseInt(hscd[1]) / 255.0).toFixed(3);
                let b = (parseInt(hscd[2]) / 255.0).toFixed(3);
                this._settings.set_strv('hscd-color', [r, g, b]);
                this._settings.set_strv('dark-hscd-color', [r, g, b]);
                this._settings.set_strv('light-hscd-color', [r, g, b]);

                this._settings.set_strv('vw-color', [r, g, b]);
                this._settings.set_strv('dark-vw-color', [r, g, b]);
                this._settings.set_strv('light-vw-color', [r, g, b]);
            }

            // Automatically enable system-wide GTK3 / GTK4 theme injection!
            this._settings.set_boolean('apply-gtk', true);

            // Wait 150ms for all GSettings changes to synchronize to GNOME Shell,
            // then unpause and trigger a full CSS compilation and stylesheet reload!
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                this._settings.set_boolean('pause-reload', false);
                this._settings.set_boolean('trigger-reload', !this._settings.get_boolean('trigger-reload'));
                return GLib.SOURCE_REMOVE;
            });

            // Show a temporary success state on the button
            const oldLabel = btn.get_label();
            btn.set_label(T('Applied!'));
            btn.add_css_class('success');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                btn.set_label(oldLabel);
                btn.remove_css_class('success');
                return GLib.SOURCE_REMOVE;
            });
        } catch (e) {
            log('Error applying extracted palette:', e);
        }
    }
    resetToGnomeDefaults(window, btn) {
        try {
            // Pause stylesheet reload during multi-setting changes
            this._settings.set_boolean('pause-reload', true);

            // List of keys modified by the wallpaper customizer
            const keysToReset = [
                'bgcolor', 'dark-bgcolor', 'light-bgcolor',
                'iscolor', 'dark-iscolor', 'light-iscolor',
                'fgcolor', 'dark-fgcolor', 'light-fgcolor',
                'mbgcolor', 'dark-mbgcolor', 'light-mbgcolor',
                'mfgcolor', 'dark-mfgcolor', 'light-mfgcolor',
                'smbgcolor', 'dark-smbgcolor', 'light-smbgcolor',
                'bcolor', 'dark-bcolor', 'light-bcolor',
                'mbcolor', 'dark-mbcolor', 'light-mbcolor',
                'accent-override',
                'accent-color', 'dark-accent-color', 'light-accent-color',
                'mscolor', 'dark-mscolor', 'light-mscolor',
                'mhcolor', 'dark-mhcolor', 'light-mhcolor',
                'hscd-color', 'dark-hscd-color', 'light-hscd-color',
                'vw-color', 'dark-vw-color', 'light-vw-color',
                'apply-gtk'
            ];

            // Reset candy color slots candy1-12, dark-candy1-12, light-candy1-12
            for (let i = 1; i <= 12; i++) {
                keysToReset.push(`candy${i}`);
                keysToReset.push(`dark-candy${i}`);
                keysToReset.push(`light-candy${i}`);
            }

            // Perform the resets
            keysToReset.forEach(k => {
                this._settings.reset(k);
            });

            // Wait 150ms for all GSettings changes to synchronize to GNOME Shell,
            // then unpause and trigger a full CSS compilation and stylesheet reload!
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                this._settings.set_boolean('pause-reload', false);
                this._settings.set_boolean('trigger-reload', !this._settings.get_boolean('trigger-reload'));
                return GLib.SOURCE_REMOVE;
            });

            // Show a temporary success state on the button
            const oldLabel = btn.get_label();
            btn.set_label(T('Restored!'));
            btn.add_css_class('success');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                btn.set_label(oldLabel);
                btn.remove_css_class('success');
                return GLib.SOURCE_REMOVE;
            });
        } catch (e) {
            log('Error restoring GNOME defaults:', e);
        }
    }

    async openGdmCustomizerDialog(parentWindow) {
        try {
            const uri = 'file://' + this.path + '/bar-enhanced-gdm-app/main.js';
            const module = await import(uri);
            module.openGdmCenter(parentWindow, this._extension, this.path, T);
        } catch (e) {
            log("BarEnhanced: Error launching GDM Center:", e);
            try {
                const dialog = new Adw.MessageDialog({
                    transient_for: parentWindow,
                    modal: true,
                    heading: 'Error Launching GDM Center',
                    body: String(e) + '\n\nStack:\n' + String(e.stack || ''),
                });
                dialog.add_response('ok', 'OK');
                dialog.connect('response', () => dialog.destroy());
                dialog.present();
            } catch (e2) {
                log(e2);
            }
        }
        return;

        const dialog = new Adw.Window({
            title: T('GDM Login Screen Customizer'),
            transient_for: parentWindow,
            modal: true,
            default_width: 500,
            default_height: 600,
            resizable: true
        });

        const mainBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
        dialog.set_content(mainBox);

        const header = new Adw.HeaderBar();
        mainBox.append(header);

        // Make body scrollable
        const scrolledWindow = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            propagate_natural_height: true
        });
        mainBox.append(scrolledWindow);

        const clamp = new Adw.Clamp({
            maximum_size: 460,
            tightening_threshold: 400
        });
        scrolledWindow.set_child(clamp);

        const list = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 16,
            margin_end: 16
        });
        clamp.set_child(list);

        const introLabel = new Gtk.Label({
            label: `<b><span size="large">${T('Configure GDM Login & Lock Screen')}</span></b>\n<span size="small" alpha="70%">${T('Changes require administrative privileges (auth prompt).')}</span>`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            margin_bottom: 12
        });
        list.append(introLabel);

        // Group 1: Background
        const bgGroup = new Adw.PreferencesGroup({ title: T('Background & Layout') });
        list.append(bgGroup);

        const wpRow = new Adw.ActionRow({
            title: T('Login Screen Background'),
            subtitle: T('Not configured (GNOME Default)')
        });
        bgGroup.add(wpRow);

        let selectedWallpaperPath = '';

        const selectWpBtn = new Gtk.Button({
            label: T('Select Image...'),
            valign: Gtk.Align.CENTER,
            css_classes: ['pill']
        });
        selectWpBtn.connect('clicked', () => {
            const fileDialog = new Gtk.FileDialog({
                title: T('Select Login Background Wallpaper'),
                filters: this.createImageFilter()
            });
            fileDialog.open(dialog, null, (obj, res) => {
                try {
                    const file = obj.open_finish(res);
                    if (file) {
                        selectedWallpaperPath = file.get_path();
                        wpRow.set_subtitle(selectedWallpaperPath);
                    }
                } catch (e) {
                    log('Error selecting file:', e);
                }
            });
        });
        wpRow.add_suffix(selectWpBtn);

        const useDesktopRow = new Adw.ActionRow({
            title: T('Use Desktop Wallpaper'),
            subtitle: T('Automatically apply your active desktop wallpaper to login screen')
        });
        bgGroup.add(useDesktopRow);

        const useDesktopBtn = new Gtk.Button({
            label: T('Sync Wallpaper'),
            valign: Gtk.Align.CENTER,
            css_classes: ['pill']
        });
        useDesktopBtn.connect('clicked', () => {
            try {
                const bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
                let wpUri = bgSettings.get_string('picture-uri');
                if (wpUri.startsWith('file://')) {
                    selectedWallpaperPath = wpUri.substring(7);
                    wpRow.set_subtitle(selectedWallpaperPath);
                } else if (wpUri.startsWith('/')) {
                    selectedWallpaperPath = wpUri;
                    wpRow.set_subtitle(selectedWallpaperPath);
                } else {
                    wpRow.set_subtitle(T('Unsupported image type or empty'));
                }
            } catch (e) {
                log('Error getting desktop wallpaper:', e);
            }
        });
        useDesktopRow.add_suffix(useDesktopBtn);

        // Group 2: Password dialog box transparency and color
        const lockGroup = new Adw.PreferencesGroup({ title: T('Password Dialog Card Customization') });
        list.append(lockGroup);

        const customAuthBoxRow = new Adw.SwitchRow({
            title: T('Enable Custom Password Box Style'),
            subtitle: T('Make GDM password entry box transparent with custom color')
        });
        lockGroup.add(customAuthBoxRow);

        const authBoxColorRow = new Adw.ActionRow({
            title: T('Password Box Color'),
            subtitle: T('Choose custom background color for the password box')
        });
        lockGroup.add(authBoxColorRow);

        const colorDialog = new Gtk.ColorDialog();
        const colorBtn = new Gtk.ColorDialogButton({
            dialog: colorDialog,
            valign: Gtk.Align.CENTER
        });
        const defaultColor = new Gdk.RGBA();
        defaultColor.parse('rgba(0,0,0,0.5)');
        colorBtn.set_rgba(defaultColor);
        authBoxColorRow.add_suffix(colorBtn);

        const authBoxOpacityRow = new Adw.ActionRow({
            title: T('Password Box Opacity'),
            subtitle: T('Control transparency level (0% to 100%)')
        });
        lockGroup.add(authBoxOpacityRow);

        const opacityScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 100, step_increment: 1, page_increment: 10, value: 50 }),
            valign: Gtk.Align.CENTER,
            hexpand: true,
            draw_value: true
        });
        opacityScale.set_size_request(150, -1);
        authBoxOpacityRow.add_suffix(opacityScale);

        // Connect switch row to sensitivity of customization options
        customAuthBoxRow.connect('notify::active', () => {
            let active = customAuthBoxRow.get_active();
            authBoxColorRow.set_sensitive(active);
            authBoxOpacityRow.set_sensitive(active);
        });
        authBoxColorRow.set_sensitive(false);
        authBoxOpacityRow.set_sensitive(false);

        // Group 3: Interface Tweaks
        const shellGroup = new Adw.PreferencesGroup({ title: T('GDM Interface Tweaks') });
        list.append(shellGroup);

        const showSecondsRow = new Adw.SwitchRow({
            title: T('Show Clock Seconds'),
            subtitle: T('Display seconds in GDM top bar clock')
        });
        shellGroup.add(showSecondsRow);

        const showDateRow = new Adw.SwitchRow({
            title: T('Show Clock Date'),
            subtitle: T('Display date in GDM top bar clock')
        });
        showDateRow.set_active(true);
        shellGroup.add(showDateRow);

        const disableButtonsRow = new Adw.SwitchRow({
            title: T('Hide Power & Restart Buttons'),
            subtitle: T('Prevent powering down from lock/login screen')
        });
        shellGroup.add(disableButtonsRow);

        const disableUserListRow = new Adw.SwitchRow({
            title: T('Disable User List'),
            subtitle: T('Hide the user list on the login screen')
        });
        shellGroup.add(disableUserListRow);

        // Group 4: Welcome Message & Logo
        const bannerGroup = new Adw.PreferencesGroup({ title: T('Welcome Message & Logo') });
        list.append(bannerGroup);

        const welcomeRow = new Adw.SwitchRow({
            title: T('Enable Welcome Message'),
            subtitle: T('Show a banner message on the login screen')
        });
        bannerGroup.add(welcomeRow);

        const welcomeTextRow = new Adw.ActionRow({
            title: T('Message Text'),
            subtitle: T('Text to display as welcome message')
        });
        const welcomeEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            hexpand: true,
            max_width_chars: 30
        });
        welcomeTextRow.add_suffix(welcomeEntry);
        bannerGroup.add(welcomeTextRow);

        // Bind visibility/sensitivity
        welcomeRow.connect('notify::active', () => {
            welcomeTextRow.set_sensitive(welcomeRow.get_active());
        });
        welcomeTextRow.set_sensitive(false);

        const logoRow = new Adw.ActionRow({
            title: T('Login Screen Logo'),
            subtitle: T('Not configured')
        });
        bannerGroup.add(logoRow);

        let selectedLogoPath = '';

        const selectLogoBtn = new Gtk.Button({
            label: T('Select Logo...'),
            valign: Gtk.Align.CENTER,
            css_classes: ['pill']
        });
        selectLogoBtn.connect('clicked', () => {
            const fileDialog = new Gtk.FileDialog({
                title: T('Select Login Screen Logo'),
                filters: this.createImageFilter()
            });
            fileDialog.open(dialog, null, (obj, res) => {
                try {
                    const file = obj.open_finish(res);
                    if (file) {
                        selectedLogoPath = file.get_path();
                        logoRow.set_subtitle(selectedLogoPath);
                    }
                } catch (e) {
                    log('Error selecting file:', e);
                }
            });
        });
        logoRow.add_suffix(selectLogoBtn);

        const clearLogoBtn = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat', 'circular']
        });
        clearLogoBtn.connect('clicked', () => {
            selectedLogoPath = '';
            logoRow.set_subtitle(T('Not configured'));
        });
        logoRow.add_suffix(clearLogoBtn);

        // Group 4: Buttons
        const actionBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 16
        });
        list.append(actionBox);

        const advBtn = new Gtk.Button({
            label: T('Open Advanced GDM Center'),
            css_classes: ['pill']
        });
        advBtn.connect('clicked', async () => {
            try {
                const uri = 'file://' + this.path + '/bar-enhanced-gdm-app/main.js';
                const module = await import(uri);
                module.openGdmCenter(window, this._settings, this.path, T);
            } catch (e) {
                log("BarEnhanced: Error launching Advanced GDM Center:", e);
            }
        });
        actionBox.append(advBtn);

        const applyBtn = new Gtk.Button({
            label: T('Apply Changes to GDM'),
            css_classes: ['pill', 'suggested-action']
        });
        actionBox.append(applyBtn);

        const resetBtn = new Gtk.Button({
            label: T('Restore GNOME Default GDM'),
            css_classes: ['pill', 'destructive-action']
        });
        actionBox.append(resetBtn);

        const statusLabel = new Gtk.Label({
            label: '',
            use_markup: true,
            halign: Gtk.Align.CENTER,
            margin_top: 8
        });
        actionBox.append(statusLabel);

        // Load existing GDM Customizer settings if configured
        let gdmFile = Gio.File.new_for_path('/etc/dconf/db/gdm.d/01-bar-enhanced');
        if (gdmFile.query_exists(null)) {
            try {
                let [, contents] = gdmFile.load_contents(null);
                let text = new TextDecoder().decode(contents);

                // Parse wallpaper picture-uri and original path
                let origMatch = text.match(/# original-path='(.+)'/);
                let wpMatch = text.match(/picture-uri='file:\/\/(.+)'/);

                if (origMatch && origMatch[1]) {
                    selectedWallpaperPath = origMatch[1];
                    wpRow.set_subtitle(selectedWallpaperPath);
                } else if (wpMatch && wpMatch[1]) {
                    selectedWallpaperPath = wpMatch[1];
                    wpRow.set_subtitle(selectedWallpaperPath);
                }

                // Parse clock-show-seconds
                let secondsMatch = text.match(/clock-show-seconds=(true|false)/);
                if (secondsMatch && secondsMatch[1]) {
                    showSecondsRow.set_active(secondsMatch[1] === 'true');
                }

                // Parse clock-show-date
                let dateMatch = text.match(/clock-show-date=(true|false)/);
                if (dateMatch && dateMatch[1]) {
                    showDateRow.set_active(dateMatch[1] === 'true');
                }

                // Parse disable-restart-buttons
                let disableMatch = text.match(/disable-restart-buttons=(true|false)/);
                if (disableMatch && disableMatch[1]) {
                    disableButtonsRow.set_active(disableMatch[1] === 'true');
                }

                // Parse disable-user-list
                let disableUserListMatch = text.match(/disable-user-list=(true|false)/);
                if (disableUserListMatch && disableUserListMatch[1]) {
                    disableUserListRow.set_active(disableUserListMatch[1] === 'true');
                }

                // Parse banner message
                let bannerEnableMatch = text.match(/banner-message-enable=(true|false)/);
                if (bannerEnableMatch && bannerEnableMatch[1]) {
                    welcomeRow.set_active(bannerEnableMatch[1] === 'true');
                    welcomeTextRow.set_sensitive(bannerEnableMatch[1] === 'true');
                }

                let bannerTextMatch = text.match(/banner-message-text='(.*?)'/);
                if (bannerTextMatch && bannerTextMatch[1]) {
                    welcomeEntry.set_text(bannerTextMatch[1]);
                }

                // Parse original logo path
                let origLogoMatch = text.match(/# original-logo-path='(.*?)'/);
                if (origLogoMatch && origLogoMatch[1]) {
                    selectedLogoPath = origLogoMatch[1];
                    logoRow.set_subtitle(selectedLogoPath);
                }
            } catch (e) {
                log('BarEnhanced: Error loading GDM configuration file:', e);
            }
        }

        // Load GDM theme custom styles if present
        let cssFile = Gio.File.new_for_path('/usr/share/themes/BarEnhancedGdm/gnome-shell/gnome-shell.css');
        if (cssFile.query_exists(null)) {
            customAuthBoxRow.set_active(true);
            authBoxColorRow.set_sensitive(true);
            authBoxOpacityRow.set_sensitive(true);
            try {
                let [, contents] = cssFile.load_contents(null);
                let text = new TextDecoder().decode(contents);
                let rgbaMatch = text.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
                if (rgbaMatch) {
                    let r = parseInt(rgbaMatch[1]) / 255.0;
                    let g = parseInt(rgbaMatch[2]) / 255.0;
                    let b = parseInt(rgbaMatch[3]) / 255.0;
                    let a = parseFloat(rgbaMatch[4]);

                    let rgba = new Gdk.RGBA();
                    rgba.red = r;
                    rgba.green = g;
                    rgba.blue = b;
                    rgba.alpha = 1.0;
                    colorBtn.set_rgba(rgba);

                    opacityScale.set_value(Math.round(a * 100.0));
                }
            } catch (e) {
                log('BarEnhanced: Error loading GDM CSS custom styles:', e);
            }
        }

        applyBtn.connect('clicked', () => {
            if (!selectedWallpaperPath) {
                statusLabel.set_label(`<span color="red">⚠️ ${T('Please select a wallpaper or sync active background.')}</span>`);
                return;
            }

            statusLabel.set_label(`⏳ <b>${T('Authenticating and applying settings...')}</b>`);
            applyBtn.set_sensitive(false);
            resetBtn.set_sensitive(false);

            const wallPath = selectedWallpaperPath;
            const safeWallPath = wallPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const seconds = showSecondsRow.get_active() ? 'true' : 'false';
            const date = showDateRow.get_active() ? 'true' : 'false';
            const disableButtons = disableButtonsRow.get_active() ? 'true' : 'false';
            const disableUserList = disableUserListRow.get_active() ? 'true' : 'false';
            const welcomeEnable = welcomeRow.get_active() ? 'true' : 'false';
            const welcomeText = welcomeEntry.get_text().replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
            const safeLogoPath = selectedLogoPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            let themeScript = '';
            let dconfThemeKey = '';

            let customStyleContent = '';
            try {
                let userRuntimeDir = GLib.get_user_runtime_dir();
                let pathsToTry = [
                    `${userRuntimeDir}/io.github.mrvanguardia.barEnhanced/bar-enhanced.css`,
                    `${userRuntimeDir}/io.github.mrvanguardia.barEnhanced/stylesheet.css`,
                    `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/bar-enhanced@mrvanguardia/stylesheet.css`
                ];
                let localStyleFile = null;
                for (let path of pathsToTry) {
                    let f = Gio.File.new_for_path(path);
                    if (f.query_exists(null)) {
                        localStyleFile = f;
                        break;
                    }
                }
                if (localStyleFile && localStyleFile.query_exists(null)) {
                    let [, contents] = localStyleFile.load_contents(null);
                    customStyleContent = new TextDecoder().decode(contents);
                }
            } catch (e) {
                log('BarEnhanced: Error reading local stylesheet for GDM theme:', e);
            }

            let authBoxCss = '';
            if (customAuthBoxRow.get_active()) {
                let rgba = colorBtn.get_rgba();
                let r = Math.round(rgba.red * 255);
                let g = Math.round(rgba.green * 255);
                let b = Math.round(rgba.blue * 255);
                let a = (opacityScale.get_value() / 100.0).toFixed(2);
                authBoxCss = `
.login-dialog {
    background-color: rgba(${r}, ${g}, ${b}, ${a}) !important;
    -st-background-blur: true;
}
`;
            }

            themeScript = `
mkdir -p /usr/share/themes/BarEnhancedGdm/gnome-shell
cat << 'EOF' > /usr/share/themes/BarEnhancedGdm/gnome-shell/gnome-shell.css
@import url("resource:///org/gnome/shell/theme/gnome-shell.css");

${authBoxCss}

${customStyleContent}
EOF
chmod 755 /usr/share/themes/BarEnhancedGdm
chmod 755 /usr/share/themes/BarEnhancedGdm/gnome-shell
chmod 644 /usr/share/themes/BarEnhancedGdm/gnome-shell/gnome-shell.css
`;
            dconfThemeKey = "shell-theme='BarEnhancedGdm'";

            const script = `
${themeScript}

# Copy background to a globally readable location for GDM
mkdir -p /usr/share/backgrounds
WALLPAPER_DEST="/usr/share/backgrounds/bar-enhanced-gdm-bg"
if [ -f "${safeWallPath}" ]; then
    cp "${safeWallPath}" "$WALLPAPER_DEST"
    chmod 644 "$WALLPAPER_DEST"
fi

# Copy logo to a globally readable location for GDM
LOGO_DEST="/usr/share/backgrounds/bar-enhanced-gdm-logo"
if [ -n "${safeLogoPath}" ] && [ -f "${safeLogoPath}" ]; then
    cp "${safeLogoPath}" "$LOGO_DEST"
    chmod 644 "$LOGO_DEST"
    LOGO_DCONF="logo='file://$LOGO_DEST'"
else
    rm -f "$LOGO_DEST"
    LOGO_DCONF="logo=''"
fi

if [ ! -f /etc/dconf/profile/gdm ]; then
mkdir -p /etc/dconf/profile
cat << 'EOF' > /etc/dconf/profile/gdm
user-db:user
system-db:gdm
file-db:/usr/share/gdm/greeter-dconf-defaults
EOF
fi

mkdir -p /etc/dconf/db/gdm.d
cat << 'EOF' > /etc/dconf/db/gdm.d/01-bar-enhanced
[org/gnome/desktop/background]
# original-path='${wallPath}'
picture-uri='file:///usr/share/backgrounds/bar-enhanced-gdm-bg'
picture-uri-dark='file:///usr/share/backgrounds/bar-enhanced-gdm-bg'
picture-options='zoom'

[org/gnome/desktop/interface]
clock-show-seconds=${seconds}
clock-show-date=${date}
${dconfThemeKey}

[org/gnome/login-screen]
disable-restart-buttons=${disableButtons}
disable-user-list=${disableUserList}
banner-message-enable=${welcomeEnable}
banner-message-text='${welcomeText}'
${LOGO_DCONF}
# original-logo-path='${selectedLogoPath}'
EOF
dconf update
`;

            try {
                let proc = Gio.Subprocess.new(
                    ['pkexec', 'bash', '-c', script],
                    Gio.SubprocessFlags.NONE
                );
                proc.wait_async(null, (obj, res) => {
                    try {
                        obj.wait_finish(res);
                        const status = obj.get_exit_status();
                        if (status === 0) {
                            statusLabel.set_label(`<span color="green">✅ <b>${T('GDM customized successfully!')}</b></span>`);
                        } else {
                            statusLabel.set_label(`<span color="red">❌ ${T('Authentication failed or declined.')}</span>`);
                        }
                    } catch (e) {
                        statusLabel.set_label(`<span color="red">❌ ${T('Error running customized GDM profile.')}</span>`);
                    }
                    applyBtn.set_sensitive(true);
                    resetBtn.set_sensitive(true);
                });
            } catch (e) {
                log(e);
                statusLabel.set_label(`<span color="red">❌ ${T('Execution failed.')}</span>`);
                applyBtn.set_sensitive(true);
                resetBtn.set_sensitive(true);
            }
        });

        resetBtn.connect('clicked', () => {
            statusLabel.set_label(`⏳ <b>${T('Authenticating and restoring GNOME defaults...')}</b>`);
            applyBtn.set_sensitive(false);
            resetBtn.set_sensitive(false);

            const script = `
rm -rf /usr/share/themes/BarEnhancedGdm
rm -f /usr/share/backgrounds/bar-enhanced-gdm-bg
rm -f /usr/share/backgrounds/bar-enhanced-gdm-logo
rm -f /etc/dconf/db/gdm.d/01-bar-enhanced
dconf update
`;

            try {
                let proc = Gio.Subprocess.new(
                    ['pkexec', 'bash', '-c', script],
                    Gio.SubprocessFlags.NONE
                );
                proc.wait_async(null, (obj, res) => {
                    try {
                        obj.wait_finish(res);
                        const status = obj.get_exit_status();
                        if (status === 0) {
                            wpRow.set_subtitle(T('Not configured (GNOME Default)'));
                            selectedWallpaperPath = '';
                            showSecondsRow.set_active(false);
                            showDateRow.set_active(true);
                            disableButtonsRow.set_active(false);
                            customAuthBoxRow.set_active(false);
                            statusLabel.set_label(`<span color="green">✅ <b>${T('GDM restored to default successfully!')}</b></span>`);
                        } else {
                            statusLabel.set_label(`<span color="red">❌ ${T('Authentication failed or declined.')}</span>`);
                        }
                    } catch (e) {
                        statusLabel.set_label(`<span color="red">❌ ${T('Error restoring default GDM profile.')}</span>`);
                    }
                    applyBtn.set_sensitive(true);
                    resetBtn.set_sensitive(true);
                });
            } catch (e) {
                log(e);
                statusLabel.set_label(`<span color="red">❌ ${T('Execution failed.')}</span>`);
                applyBtn.set_sensitive(true);
                resetBtn.set_sensitive(true);
            }
        });


        dialog.present();


    }

    createImageFilter() {
        const filter = new Gtk.FileFilter();
        filter.set_name(T('Images'));
        filter.add_mime_type('image/png');
        filter.add_mime_type('image/jpeg');
        filter.add_mime_type('image/webp');
        const list = new Gio.ListStore({ item_type: Gtk.FileFilter });
        list.append(filter);
        return list;
    }
}
