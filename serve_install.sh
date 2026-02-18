#!/usr/bin/env bash
# ============================================================
#  Meu Bar - Servir arquivos de instalação
#  Execute este script no servidor para disponibilizar
#  install.sh e o tarball da aplicação via HTTP.
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER_IP="192.168.88.235"
SERVER_PORT="8000"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVE_DIR="/tmp/meu-bar-serve"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🍺  Meu Bar - Servidor de Instalação        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se python3 existe
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}[ERRO]${NC} python3 não encontrado. Instale com: sudo apt install python3"
    exit 1
fi

# Criar diretório temporário para servir
rm -rf "${SERVE_DIR}"
mkdir -p "${SERVE_DIR}"

# Criar tarball do projeto (excluindo node_modules e .git)
echo -e "${CYAN}[INFO]${NC}  Criando tarball do projeto..."
tar -czf "${SERVE_DIR}/meu-bar.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    -C "$(dirname "${PROJECT_DIR}")" \
    "$(basename "${PROJECT_DIR}")"

echo -e "${GREEN}[OK]${NC}    Tarball criado: ${SERVE_DIR}/meu-bar.tar.gz"

# Copiar install.sh para o diretório de servir
cp "${PROJECT_DIR}/install.sh" "${SERVE_DIR}/install.sh"
echo -e "${GREEN}[OK]${NC}    install.sh copiado."

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "  Servidor HTTP rodando em ${CYAN}http://${SERVER_IP}:${SERVER_PORT}${NC}"
echo ""
echo -e "  ${YELLOW}Execute no cliente:${NC}"
echo ""
echo -e "  ${CYAN}curl -fsSL http://${SERVER_IP}:${SERVER_PORT}/install.sh | sudo bash${NC}"
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Pressione ${RED}Ctrl+C${NC} para parar o servidor."
echo ""

# Iniciar servidor HTTP
cd "${SERVE_DIR}"
python3 -m http.server "${SERVER_PORT}" --bind 0.0.0.0
