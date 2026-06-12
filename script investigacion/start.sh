#!/bin/bash
# start.sh – Menú interactivo sin recursiones

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activar venv si existe
[ -f venv/bin/activate ] && source venv/bin/activate

show_banner() {
    clear
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     🔍 SHERLOCK++ ULTIMATE - OSINT Investigation        ║"
    echo "╚══════════════════════════════════════════════════════════╝"
}

# Esperar que termine la investigación
run_investigation() {
    local target="$1"
    local mode="$2"
    local cmd="python3 sherlock_ultimate.py \"$target\""
    case $mode in
        1) cmd="$cmd --quick" ;;
        2) cmd="$cmd --multi-profile" ;;
        3) cmd="$cmd --forensic" ;;
        4) cmd="$cmd --multi-profile --forensic" ;;
    esac
    echo "🚀 $cmd"
    # Ejecutar y esperar el código de salida
    eval $cmd
    local ret=$?
    echo ""
    if [ $ret -ne 0 ]; then
        echo "⚠️  La investigación terminó con errores (código $ret)"
    fi
    read -p "Presiona Enter para volver al menú..."
}

while true; do
    show_banner
    echo ""
    echo "  1. Investigación RÁPIDA"
    echo "  2. Investigación con MULTICUENTAS"
    echo "  3. Investigación FORENSE"
    echo "  4. Investigación COMPLETA"
    echo "  5. Ver últimos reportes"
    echo "  6. Configuración"
    echo "  7. Salir"
    echo ""
    read -p "Opción [1-7]: " opt
    case $opt in
        1|2|3|4)
            read -p "Usuario/email/teléfono: " target
            [ -z "$target" ] && { echo "❌ Debes ingresar un objetivo"; sleep 2; continue; }
            run_investigation "$target" "$opt"
            ;;
        5)
            echo "📁 Últimos reportes:"
            ls -lt profiles_data/reports/ 2>/dev/null | head -5 || echo "  (vacío)"
            read -p "Enter para continuar..."
            ;;
        6)
            python3 sherlock_ultimate.py --setup
            read -p "Enter para continuar..."
            ;;
        7)
            echo "👋 ¡Adiós!"
            exit 0
            ;;
        *)
            echo "❌ Opción inválida"
            sleep 1
            ;;
    esac
done
