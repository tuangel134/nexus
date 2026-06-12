#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         ⬡ NEXUS — Instalador Universal       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

REPO="https://github.com/tuusuario/nexus.git"
INSTALL_DIR="$HOME/nexus"

# Detectar OS
OS="$(uname -s)"
case "$OS" in
    Linux*)   MACHINE=linux;;
    Darwin*)  MACHINE=mac;;
    *)        echo "❌ Sistema no soportado: $OS"; exit 1;;
esac

echo "📦 Sistema detectado: $MACHINE"
echo ""

# Verificar Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Python3 no encontrado."
    echo "   Instalá Python 3.8+ desde https://python.org"
    exit 1
fi
echo "✅ Python3 $(python3 --version)"

# Verificar git o descargar ZIP
if ! command -v git &>/dev/null; then
    echo "📥 Descargando NEXUS..."
    curl -sSL "https://github.com/tuusuario/nexus/archive/main.tar.gz" | tar xz
    mv nexus-main "$INSTALL_DIR"
else
    if [ -d "$INSTALL_DIR" ]; then
        echo "📂 Actualizando NEXUS..."
        cd "$INSTALL_DIR" && git pull
    else
        echo "📥 Clonando NEXUS..."
        git clone "$REPO" "$INSTALL_DIR"
    fi
fi

cd "$INSTALL_DIR"

# Instalar dependencias Python
echo "📦 Instalando dependencias Python..."
pip3 install flask cryptography qrcode[pil] --break-system-packages 2>/dev/null \
    || pip3 install flask cryptography qrcode[pil] --user 2>/dev/null \
    || pip3 install flask cryptography qrcode[pil]

# Verificar/build frontend
if [ -d "nexus-frontend/app" ]; then
    if command -v npm &>/dev/null; then
        echo "📦 Construyendo frontend..."
        cd nexus-frontend/app
        npm install --silent 2>/dev/null
        npm run build 2>/dev/null
        cd ../..
    else
        echo "⚠️  npm no encontrado. Usando frontend precargado."
    fi
fi

# Crear directorios necesarios
mkdir -p uploads backups

echo ""
echo "================================================"
echo "  ✅ NEXUS instalado en: $INSTALL_DIR"
echo "================================================"
echo ""
echo "Para iniciar:"
echo "  cd $INSTALL_DIR && python3 app.py"
echo ""
echo "Para crear acceso directo:"
echo "  echo 'alias nexus=\"cd $INSTALL_DIR && python3 app.py\"' >> ~/.bashrc"
echo ""
