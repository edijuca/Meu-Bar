#!/usr/bin/env bash
# ============================================================
#  Meu Bar - Script de Instalação Automática
#  Uso: curl -fsSL http://<IP_DO_SERVIDOR>:8000/install.sh | bash
# ============================================================
set -euo pipefail

# ---------- cores para output ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERRO]${NC}  $*"; exit 1; }

# ---------- variáveis ----------
SERVER_IP="192.168.88.235"
SERVER_PORT="8000"
INSTALL_DIR="/opt/meu-bar"
DB_NAME="meubar_db"
DB_USER="dbadmin"
DB_PASS="dbadmin"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🍺  Meu Bar - Instalação Automática  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---------- verificar root ----------
if [[ $EUID -ne 0 ]]; then
    error "Execute este script como root: sudo bash ou curl ... | sudo bash"
fi

# ============================================================
# 1. Instalar dependências do sistema
# ============================================================
info "Atualizando pacotes do sistema..."
apt-get update -qq

info "Instalando dependências (curl, git, build-essential, PostgreSQL)..."
apt-get install -y -qq curl git build-essential postgresql postgresql-contrib >/dev/null 2>&1
ok "Dependências do sistema instaladas."

# ---------- Node.js via NodeSource (v20 LTS) ----------
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
    info "Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs >/dev/null 2>&1
    ok "Node.js $(node -v) instalado."
else
    ok "Node.js $(node -v) já está instalado."
fi

# ============================================================
# 2. Configurar PostgreSQL
# ============================================================
info "Configurando PostgreSQL..."

# Garantir que o serviço está rodando
systemctl enable postgresql >/dev/null 2>&1
systemctl start postgresql

# Criar usuário e banco
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\" | grep -q 1 || psql -c \"CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';\"" 2>/dev/null
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || psql -c \"CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};\"" 2>/dev/null
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\"" 2>/dev/null

ok "PostgreSQL configurado: banco '${DB_NAME}', usuário '${DB_USER}'."

# ============================================================
# 3. Baixar e instalar a aplicação
# ============================================================
info "Baixando aplicação do servidor ${SERVER_IP}..."

mkdir -p "${INSTALL_DIR}"

if curl -fsSL "http://${SERVER_IP}:${SERVER_PORT}/meu-bar.tar.gz" -o /tmp/meu-bar.tar.gz; then
    tar -xzf /tmp/meu-bar.tar.gz -C "${INSTALL_DIR}" --strip-components=1
    rm -f /tmp/meu-bar.tar.gz
    ok "Aplicação extraída em ${INSTALL_DIR}."
else
    error "Falha ao baixar a aplicação. Verifique se o servidor está rodando em http://${SERVER_IP}:${SERVER_PORT}"
fi

# ============================================================
# 4. Configurar .env do backend
# ============================================================
info "Configurando arquivo .env do backend..."

cat > "${INSTALL_DIR}/backend/.env" <<EOF
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_HOST=localhost
DB_NAME=${DB_NAME}
DB_PORT=5432
PORT=3001
EOF

ok "Arquivo .env configurado."

# ============================================================
# 5. Instalar dependências NPM
# ============================================================
info "Instalando dependências do frontend..."
cd "${INSTALL_DIR}"
npm install --silent 2>/dev/null
ok "Dependências do frontend instaladas."

info "Instalando dependências do backend..."
cd "${INSTALL_DIR}/backend"
npm install --silent 2>/dev/null
ok "Dependências do backend instaladas."

# ============================================================
# 6. Build do frontend
# ============================================================
info "Construindo o frontend (vite build)..."
cd "${INSTALL_DIR}"
npx vite build --outDir dist 2>/dev/null
ok "Frontend compilado com sucesso."

# ============================================================
# 7. Criar serviço systemd para o backend
# ============================================================
info "Criando serviço systemd para o backend..."

cat > /etc/systemd/system/meu-bar-backend.service <<EOF
[Unit]
Description=Meu Bar - Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/backend
ExecStart=$(which npx) ts-node server.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable meu-bar-backend >/dev/null 2>&1
systemctl start meu-bar-backend

ok "Serviço meu-bar-backend criado e iniciado."

# ============================================================
# 8. Resumo final
# ============================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅  Instalação concluída com sucesso!      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📂 Diretório:   ${CYAN}${INSTALL_DIR}${NC}"
echo -e "  🗄️  Banco:       ${CYAN}${DB_NAME}${NC} (PostgreSQL)"
echo -e "  👤 DB Usuário:  ${CYAN}${DB_USER}${NC}"
echo -e "  🔌 Backend:     ${CYAN}http://localhost:3001${NC}"
echo -e "  🌐 Frontend:    ${CYAN}Servir os arquivos do dist/ com nginx ou similar${NC}"
echo ""
echo -e "  ${YELLOW}Comandos úteis:${NC}"
echo -e "    systemctl status meu-bar-backend   # verificar status"
echo -e "    systemctl restart meu-bar-backend   # reiniciar backend"
echo -e "    journalctl -u meu-bar-backend -f    # ver logs"
echo ""
