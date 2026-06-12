#!/bin/bash
# NEXUS - Plataforma de Investigación
# Lanzar con: ./nexus.sh

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         NEXUS — Plataforma Intel              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Verificar Python3
if ! command -v python3 &>/dev/null; then
    echo "ERROR: Python3 no encontrado."
    echo "  Instalar con: sudo apt install python3  (Debian/Ubuntu)"
    echo "  o: brew install python3                 (macOS)"
    exit 1
fi

# Verificar Flask
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Instalando Flask..."
    for cmd in "pip3 install flask --break-system-packages" \
               "pip3 install flask --user" \
               "pip3 install flask"; do
        if $cmd 2>/dev/null; then
            break
        fi
    done
    if ! python3 -c "import flask" 2>/dev/null; then
        echo "ERROR: No se pudo instalar Flask."
        echo "  Intenta: pip3 install flask --user"
        exit 1
    fi
fi

echo "Iniciando servidor en http://localhost:7331"
echo "Presiona Ctrl+C para salir"
echo ""

python3 "$DIR/app.py"
