#!/bin/bash
# install.sh - Instalador de Sherlock++ Ultimate

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "  🔍 Sherlock++ Ultimate - Instalación"
echo "================================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Instálalo primero."
    exit 1
fi

PYTHON=$(command -v python3)
echo "✅ Python encontrado: $PYTHON"

# Crear entorno virtual (opcional pero recomendado)
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creando entorno virtual..."
    $PYTHON -m venv venv
fi

# Activar entorno
source venv/bin/activate
echo "✅ Entorno virtual activado"

# Instalar dependencias
echo ""
echo "📥 Instalando dependencias..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Verificar instalación
echo ""
echo "🔍 Verificando instalación..."
python -c "import requests, bs4, PIL, rich, numpy, cv2, imagehash; print('✅ Todas las dependencias OK')"

# Crear directorios necesarios
mkdir -p profiles_data/{images,cache,reports}

# Dar permisos de ejecución
chmod +x start.sh

echo ""
echo "================================================"
echo "  ✅ Instalación completada!"
echo "================================================"
echo ""
echo "Para iniciar:"
echo "  ./start.sh"
echo ""