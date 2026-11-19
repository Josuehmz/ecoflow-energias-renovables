#!/usr/bin/env bash
# Verifica una versión del frontend propuesta por la IA:
#   bash herramientas/verificar-front.sh bitacora/v4-front
# 1) copia <carpeta>/src/ sobre src/ (sin borrar lo que ya había: ui de shadcn, tipos generados…);
# 2) corre tsc -b --noEmit, oxlint, Vitest y el build con variables vacías;
# 3) escribe todo en <carpeta>/verificacion.txt, sin códigos ANSI ni la ruta del usuario.
# Con «final» no copia nada y escribe docs/evidencia/front/verificacion-final.txt.
set -u
cd "$(dirname "$0")/.."
DIR="${1:?uso: verificar-front.sh <carpeta con src/ | final>}"
if [ "$DIR" = "final" ]; then
  SALIDA="docs/evidencia/front/verificacion-final.txt"; mkdir -p docs/evidencia/front
else
  cp -r "$DIR/src/." src/; SALIDA="$DIR/verificacion.txt"
fi
# Sin variables: el build y las pruebas no deben depender de un .env.local olvidado.
export VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY=
limpiar() { sed -E -e 's/\x1b\[[0-9;]*[A-Za-z]//g' -e 's#([A-Z]:)?[\\/]Users[\\/][^\\/ ]+#<usuario>#g'; }
paso() {
  echo "### \$ $*"
  "$@" 2>&1 | limpiar
  echo "(código de salida: ${PIPESTATUS[0]})"
  echo
}
{
  echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "Versión verificada: $DIR"
  echo
  paso pnpm typecheck
  paso pnpm lint
  paso pnpm test
  paso pnpm build
} > "$SALIDA" 2>&1
grep -E '^\(código de salida|Tests |Test Files|error TS|^  [x×]|Found [0-9]+ (warning|error)' "$SALIDA" | head -60
echo "→ $SALIDA"
