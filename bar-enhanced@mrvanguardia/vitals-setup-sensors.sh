#!/bin/bash

# vitales-setup-sensors.sh
# Script to automate the installation and configuration of motherboard sensors in Linux
# Requires administrative privileges (run via pkexec)

# 1. Ensure we are running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: Este script debe ser ejecutado con privilegios administrativos (root)."
  exit 1
fi

echo "Iniciando configuración automática de sensores de hardware..."

# 2. Detect package manager and install lm_sensors
if command -v dnf &>/dev/null; then
  echo "Detectado DNF (Fedora/RHEL). Instalando lm_sensors..."
  dnf install -y lm_sensors
elif command -v apt-get &>/dev/null; then
  echo "Detectado APT (Debian/Ubuntu). Instalando lm-sensors..."
  apt-get update && apt-get install -y lm-sensors
elif command -v pacman &>/dev/null; then
  echo "Detectado Pacman (Arch Linux). Instalando lm_sensors..."
  pacman -Sy --noconfirm lm_sensors
else
  echo "Error: Gestor de paquetes no compatible. Por favor instala lm_sensors manualmente."
  exit 2
fi

# 3. Detect hardware sensors (sensors-detect)
# We answer "yes" (y) to all scans (safe ones, CPU, Super I/O, ISA, and I2C/SMBus)
# and we also answer yes to overwriting/creating the configuration.
if command -v sensors-detect &>/dev/null; then
  echo "Ejecutando sensors-detect de forma no interactiva..."
  yes "yes" | sensors-detect
else
  echo "Error: sensors-detect no está instalado o no se encuentra en el PATH."
  exit 3
fi

# 4. Load the detected modules and enable the systemd service
echo "Habilitando servicio de monitorización y cargando módulos del kernel..."

# Enable and start the systemd service so modules load automatically on boot
if systemctl list-unit-files | grep -q "lm_sensors.service"; then
  systemctl enable --now lm_sensors.service
elif systemctl list-unit-files | grep -q "lm-sensors.service"; then
  systemctl enable --now lm-sensors.service
fi

# Manually load the modules listed in the configuration so they work immediately
# Fedora / RHEL
if [ -f /etc/sysconfig/lm_sensors ]; then
  echo "Leyendo módulos en /etc/sysconfig/lm_sensors..."
  eval $(grep '^HWMON_MODULES=' /etc/sysconfig/lm_sensors)
  for mod in $HWMON_MODULES; do
    echo "Cargando módulo: $mod"
    modprobe "$mod" 2>/dev/null || true
  done
fi

# Arch Linux
if [ -f /etc/conf.d/lm_sensors ]; then
  echo "Leyendo módulos en /etc/conf.d/lm_sensors..."
  eval $(grep '^HWMON_MODULES=' /etc/conf.d/lm_sensors)
  for mod in $HWMON_MODULES; do
    echo "Cargando módulo: $mod"
    modprobe "$mod" 2>/dev/null || true
  done
fi

# Debian / Ubuntu (check /etc/modules for lines appended by sensors-detect)
if [ -f /etc/modules ]; then
  # Grab modules appended by sensors-detect (usually at the end of the file)
  # sensors-detect usually writes comments like "# Chip drivers" or similar, or we can just try to reload the service
  # Service reload usually handles it, but let's make sure it runs
  echo "Recargando el módulo lm-sensors en Debian/Ubuntu..."
  systemctl restart lm-sensors.service 2>/dev/null || true
fi

echo "¡Configuración de sensores completada con éxito!"
exit 0
