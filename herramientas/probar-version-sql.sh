#!/usr/bin/env bash
# Prueba una versión del SQL que propuso la IA contra el Supabase LOCAL, con las pruebas de
# aceptación (supabase/tests/database/*.test.sql) que se escribieron antes que el esquema.
#   bash herramientas/probar-version-sql.sh bitacora/v1-esquema
# 1) copia <carpeta>/migracion.sql sobre la única migración de supabase/migrations/;
# 2) supabase db reset (migración + seed.sql);
# 3) supabase test db (resumen de pg_prove) y la lista TAP completa (ok / not ok) vía psql;
# 4) escribe todo en <carpeta>/verificacion.txt, sin códigos ANSI y con las claves redactadas.
# Si la carpeta es «final», no copia nada: prueba la migración que está en supabase/migrations/.
set -u
cd "$(dirname "$0")/.."
CLI="${SUPABASE_CLI:-D:/Herramientas/supabase/supabase.exe}"
DIR="${1:?uso: probar-version-sql.sh <carpeta con migracion.sql | final>}"
MIG="$(ls supabase/migrations/*.sql | head -1)"
DB="supabase_db_ecoflow-energias-renovables"
if [ "$DIR" = "final" ]; then
  SALIDA="docs/evidencia/rls/verificacion-final.txt"; mkdir -p docs/evidencia/rls
else
  cp "$DIR/migracion.sql" "$MIG"; SALIDA="$DIR/verificacion.txt"
fi
limpiar() { sed -E -e 's/\x1b\[[0-9;]*[A-Za-z]//g' \
  -e 's/sb_(publishable|secret)_[A-Za-z0-9_-]+/<redactado>/g' \
  -e 's/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/<redactado>/g' \
  -e 's#(postgres(ql)?://[^:]+:)[^@]+@#\1<redactado>@#g' \
  -e 's#[A-Za-z]:[\\/]Users[\\/][^\\/ ]+#<usuario>#g'; }
{
  echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "Versión probada: $DIR  →  $MIG"
  echo
  echo "### \$ supabase db reset"
  "$CLI" db reset --agent no 2>&1 | limpiar; echo "(código de salida: ${PIPESTATUS[0]})"
  echo
  echo "### \$ supabase test db"
  "$CLI" test db --agent no 2>&1 | limpiar; echo "(código de salida: ${PIPESTATUS[0]})"
  echo
  echo "### Lista TAP completa (el mismo archivo por psql dentro del contenedor de la base)"
  for f in supabase/tests/database/*.test.sql; do
    echo "# $f"
    docker exec -i "$DB" psql -U postgres -d postgres -X -q -t -A -v ON_ERROR_STOP=0 < "$f" 2>&1 | limpiar
  done
} > "$SALIDA" 2>&1
grep -E '^(Files=|Result:|# Looks like|not ok)' "$SALIDA" | head -40
echo "→ $SALIDA"
