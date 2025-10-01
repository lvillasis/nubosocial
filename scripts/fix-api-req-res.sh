#!/usr/bin/env bash
set -euo pipefail

# Encuentra archivos dentro de pages/api que contienen ": any"
matches=$(git grep -l -Z ": any" -- 'pages/api' || true)
if [ -z "$matches" ]; then
  echo "No se encontraron archivos en pages/api con ': any'."
  exit 0
fi

# Iterar de forma segura sobre nombres (separados por NUL)
git grep -l -Z ": any" -- 'pages/api' | while IFS= read -r -d '' f; do
  echo
  echo "=== Procesando: $f ==="

  # Si no contiene ya NextApiRequest, insertar import en la primera línea (crea backup .bak)
  if ! grep -q "NextApiRequest" "$f"; then
    sed -i.bak '1iimport type { NextApiRequest, NextApiResponse } from "next";' "$f"
    echo "  -> Insertado import (backup creado: $f.bak)"
  else
    # si ya lo tenía, crear un backup para consistencia
    cp "$f" "$f.bak"
    echo "  -> Ya contenía NextApiRequest (backup creado: $f.bak)"
  fi

  # Reemplazar firmas comunes req: any y res: any (se deja backup .bak)
  sed -i.bak 's/\breq: any\b/req: NextApiRequest/g; s/\bres: any\b/res: NextApiResponse/g' "$f"

  # Mostrar diff entre backup y nuevo archivo para revisión
  echo "  --- Diff propuesto ($f.bak -> $f) ---"
  git --no-pager diff --no-index -- "$f.bak" "$f" || true
  echo "  --- Fin diff ---"
done

echo
echo "Script terminado. Revisa los diffs mostrados. Backups .bak generados al lado de cada archivo."
