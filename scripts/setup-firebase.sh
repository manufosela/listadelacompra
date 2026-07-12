#!/usr/bin/env bash
#
# setup-firebase.sh — Asistente de instalación de una instancia de HomeCart.
#
# Automatiza (vía firebase CLI + gcloud) todo lo automatizable para levantar una
# instancia nueva, y se detiene con instrucciones claras en los pasos que Google
# obliga a hacer a mano en la consola web.
#
# Es idempotente: puedes ejecutarlo varias veces sin romper nada.
#
# Uso:  ./scripts/setup-firebase.sh
#
set -euo pipefail

# ----------------------------------------------------------------------------
# Utilidades de salida
# ----------------------------------------------------------------------------
BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'

info()  { printf '%s\n' "${BLUE}▶${RESET} $*"; }
ok()    { printf '%s\n' "${GREEN}✔${RESET} $*"; }
warn()  { printf '%s\n' "${YELLOW}⚠${RESET}  $*"; }
err()   { printf '%s\n' "${RED}✗${RESET} $*" >&2; }
step()  { printf '\n%s\n' "${BOLD}== $* ==${RESET}"; }
ask()   { local p="$1" d="${2:-}" a; if [ -n "$d" ]; then read -r -p "$p [$d]: " a; echo "${a:-$d}"; else read -r -p "$p: " a; echo "$a"; fi; }
confirm(){ local a; read -r -p "$1 [y/N]: " a; [[ "$a" =~ ^[yYsS]$ ]]; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Falta '$1'. Instálalo antes de continuar (ver docs/SELF_HOSTING.md)."
    exit 1
  fi
}

# ----------------------------------------------------------------------------
# 0. Prerequisitos
# ----------------------------------------------------------------------------
step "Comprobando herramientas"
need node
need pnpm
need firebase
if ! command -v gcloud >/dev/null 2>&1; then
  warn "'gcloud' no está instalado. Podrás continuar, pero los pasos de facturación,"
  warn "APIs y CORS tendrás que hacerlos a mano (ver docs/SELF_HOSTING.md)."
  HAS_GCLOUD=0
else
  HAS_GCLOUD=1
fi
ok "Herramientas básicas presentes."

# ----------------------------------------------------------------------------
# 1. Login
# ----------------------------------------------------------------------------
step "Sesión de Firebase"
if ! firebase login:list 2>/dev/null | grep -q '@'; then
  info "Vas a iniciar sesión en Firebase (se abrirá el navegador)."
  firebase login
fi
ok "Sesión de Firebase activa."

# ----------------------------------------------------------------------------
# 2. Proyecto
# ----------------------------------------------------------------------------
step "Proyecto de Firebase"
PROJECT_ID="$(ask 'Project ID (existente o nuevo, minúsculas y guiones)')"
[ -n "$PROJECT_ID" ] || { err "El Project ID es obligatorio."; exit 1; }

if firebase projects:list 2>/dev/null | grep -q " $PROJECT_ID "; then
  ok "Uso el proyecto existente '$PROJECT_ID'."
else
  if confirm "El proyecto '$PROJECT_ID' no existe. ¿Lo creo?"; then
    firebase projects:create "$PROJECT_ID" --display-name "HomeCart" || {
      err "No se pudo crear el proyecto (¿ID en uso? ¿límite de proyectos?)."; exit 1; }
    ok "Proyecto creado."
  else
    err "Necesito un proyecto válido para continuar."; exit 1
  fi
fi
firebase use "$PROJECT_ID" >/dev/null
[ "$HAS_GCLOUD" = 1 ] && gcloud config set project "$PROJECT_ID" >/dev/null 2>&1 || true

REGION="$(ask 'Región para Firestore/Functions' 'europe-west1')"

# ----------------------------------------------------------------------------
# 3. Facturación (Blaze) — imprescindible para Functions
# ----------------------------------------------------------------------------
step "Plan Blaze (facturación)"
if [ "$HAS_GCLOUD" = 1 ]; then
  if gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null | grep -qi true; then
    ok "La facturación ya está activada."
  else
    info "Cuentas de facturación disponibles:"
    gcloud billing accounts list --format='table(name,displayName,open)' || true
    BILLING="$(ask 'ID de cuenta de facturación (XXXXXX-XXXXXX-XXXXXX), vacío para saltar' '')"
    if [ -n "$BILLING" ]; then
      gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING" \
        && ok "Blaze vinculado." \
        || warn "No se pudo vincular. Actívalo a mano: consola → Facturación."
    else
      warn "Saltado. Actívalo a mano antes de desplegar functions (docs/SELF_HOSTING.md, paso 3)."
    fi
  fi
else
  warn "Sin gcloud: activa Blaze a mano en la consola (Facturación) antes de desplegar functions."
fi

# ----------------------------------------------------------------------------
# 4. APIs necesarias
# ----------------------------------------------------------------------------
step "Activando APIs"
if [ "$HAS_GCLOUD" = 1 ]; then
  gcloud services enable \
    firestore.googleapis.com \
    firebasestorage.googleapis.com \
    cloudfunctions.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    identitytoolkit.googleapis.com \
    --project "$PROJECT_ID" \
    && ok "APIs activadas (incluida Identity Platform)." \
    || warn "Alguna API no se pudo activar; revísalo en la consola."
else
  warn "Sin gcloud: activa Identity Platform a mano (docs/SELF_HOSTING.md, paso 5)."
fi

# ----------------------------------------------------------------------------
# 5. Firestore + Storage
# ----------------------------------------------------------------------------
step "Base de datos Firestore"
if [ "$HAS_GCLOUD" = 1 ]; then
  if gcloud firestore databases describe --database='(default)' --project "$PROJECT_ID" >/dev/null 2>&1; then
    ok "Firestore ya existe."
  else
    gcloud firestore databases create --location="$REGION" --project "$PROJECT_ID" \
      && ok "Firestore creado en $REGION." \
      || warn "No se pudo crear Firestore; créalo a mano (paso 6)."
  fi
else
  warn "Sin gcloud: crea Firestore a mano (docs/SELF_HOSTING.md, paso 6)."
fi

step "Storage"
warn "Si es la primera vez, activa Storage en la consola (Storage → Comenzar)."
warn "Anota el nombre del bucket (…​.appspot.com o …​.firebasestorage.app)."

# ----------------------------------------------------------------------------
# 6. App web + generar .env
# ----------------------------------------------------------------------------
step "App web y credenciales (.env)"
if [ -f .env ] && ! confirm "Ya existe .env. ¿Lo regenero?"; then
  ok "Conservo el .env actual."
else
  APP_ID="$(firebase apps:list web --project "$PROJECT_ID" 2>/dev/null | awk '/web/{print $4; exit}')"
  if [ -z "${APP_ID:-}" ]; then
    info "Registrando una app web nueva…"
    firebase apps:create web "HomeCart" --project "$PROJECT_ID" >/dev/null || \
      warn "No se pudo crear la app web; hazlo en la consola (paso 8)."
    APP_ID="$(firebase apps:list web --project "$PROJECT_ID" 2>/dev/null | awk '/web/{print $4; exit}')"
  fi
  if [ -n "${APP_ID:-}" ]; then
    info "Descargando la configuración de la app…"
    firebase apps:sdkconfig web "$APP_ID" --project "$PROJECT_ID" 2>/dev/null \
      | node scripts/sdkconfig-to-env.mjs > .env \
      && ok "Generado .env con tus credenciales." \
      || warn "No se pudo generar .env automáticamente; hazlo a mano (paso 9)."
  else
    warn "No hay APP_ID; genera el .env a mano (docs/SELF_HOSTING.md, paso 9)."
  fi
fi

# ----------------------------------------------------------------------------
# 7. Secret de OpenAI (opcional)
# ----------------------------------------------------------------------------
step "Escáner de tickets (OpenAI, opcional)"
if confirm "¿Quieres configurar la API key de OpenAI para el escáner de tickets?"; then
  firebase functions:secrets:set OPENAI_API_KEY --project "$PROJECT_ID" \
    && ok "Secret OPENAI_API_KEY guardado." \
    || warn "No se pudo guardar el secret; hazlo luego con firebase functions:secrets:set."
else
  info "Saltado. La app funcionará sin el escáner de tickets."
fi

# ----------------------------------------------------------------------------
# 8. Despliegue
# ----------------------------------------------------------------------------
step "Desplegando reglas, índices, functions y hosting"
info "Reglas de Firestore/Storage e índices…"
firebase deploy --only firestore:rules,firestore:indexes,storage --project "$PROJECT_ID" \
  || warn "Fallo al desplegar reglas; revisa el error."

if confirm "¿Desplegar las Cloud Functions ahora? (requiere Blaze e Identity Platform activos)"; then
  firebase deploy --only functions --project "$PROJECT_ID" \
    || warn "Fallo al desplegar functions (¿Blaze? ¿Identity Platform?)."
fi

info "Compilando y desplegando la web…"
pnpm build && firebase deploy --only hosting --project "$PROJECT_ID" \
  || warn "Fallo al desplegar hosting."

# ----------------------------------------------------------------------------
# 9. CORS del bucket
# ----------------------------------------------------------------------------
step "CORS del bucket de Storage"
if [ "$HAS_GCLOUD" = 1 ] && command -v gsutil >/dev/null 2>&1; then
  BUCKET="$(ask 'Nombre del bucket (p. ej. '"$PROJECT_ID"'.firebasestorage.app)' "$PROJECT_ID.firebasestorage.app")"
  warn "Antes de continuar, edita firebase/cors.json y pon tu dominio real en 'origin'."
  if confirm "¿Aplicar CORS al bucket gs://$BUCKET?"; then
    gsutil cors set firebase/cors.json "gs://$BUCKET" \
      && ok "CORS aplicado." \
      || warn "No se pudo aplicar CORS; revisa el nombre del bucket."
  fi
else
  warn "Sin gsutil: aplica el CORS a mano (docs/SELF_HOSTING.md, paso 12)."
fi

# ----------------------------------------------------------------------------
# 10. Pasos manuales que quedan
# ----------------------------------------------------------------------------
step "Casi listo — 3 pasos manuales en la consola"
cat <<EOF

  Estos pasos Google obliga a hacerlos a mano (no hay API estable):

  ${BOLD}1. Activar el proveedor de Google${RESET}
     Authentication → Sign-in method → Google → Habilitar → email de soporte.
     (La primera vez configurarás la pantalla de consentimiento de OAuth.)

  ${BOLD}2. Rellenar la allowlist de acceso${RESET}
     Firestore → colección 'config' → documento 'access' →
     campo 'emails' (array) con los correos autorizados.
     ${DIM}Si la dejas vacía, nadie podrá registrarse.${RESET}

  ${BOLD}3. (Si no lo hizo el script) Activar Identity Platform y Blaze${RESET}
     Ver docs/SELF_HOSTING.md pasos 3 y 5.

  Cuando termines:  ${BOLD}pnpm dev${RESET}   o   https://${PROJECT_ID}.web.app

EOF
ok "Asistente finalizado. Guía completa: docs/SELF_HOSTING.md"
