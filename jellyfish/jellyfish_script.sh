#!/usr/bin/env bash
# Jellyfish OS — Lanzador Unificado del Sistema
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ -d "$DIR/.venv" ]; then
    source "$DIR/.venv/bin/activate"
fi

COMMAND="${1:-start}"

# Liberar puerto 8001 si ya estaba en uso por un proceso previo
free_port() {
    fuser -k 8001/tcp >/dev/null 2>&1 || pkill -f "jellyfish_web.py" >/dev/null 2>&1 || true
    sleep 1
}

case "$COMMAND" in
    start)
        free_port
        echo "Iniciando Jellyfish OS (Backend + Web UI unificada)..."
        echo "URL: http://localhost:8001"
        python3 "$DIR/jellyfish_web.py"
        ;;
    dev)
        free_port
        echo "Iniciando Jellyfish OS en Modo Desarrollo (Hot Reload)..."
        python3 "$DIR/jellyfish_web.py" &
        BACKEND_PID=$!
        trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
        (cd "$DIR/web-ui" && npm run dev)
        ;;
    build)
        echo "Compilando interfaz Web UI..."
        (cd "$DIR/web-ui" && npm run build)
        echo "Compilacion de Web UI completada con exito."
        ;;
    help|--help|-h)
        echo "Uso: ./jellyfish [start | dev | build]"
        echo "  start : Inicia el servidor unificado completo (Web UI + API REST en http://localhost:8001)"
        echo "  dev   : Inicia el servidor en modo desarrollo con Hot Reload en Vite"
        echo "  build : Compila los activos estaticos del frontend React"
        ;;
    *)
        echo "Comando no reconocido: $COMMAND"
        echo "Usa: ./jellyfish --help"
        exit 1
        ;;
esac
