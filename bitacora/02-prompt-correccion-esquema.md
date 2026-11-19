# Prompt 02 — Corrección de v1 con la evidencia de las pruebas

**Objetivo del paso:** corregir lo que las pruebas y la revisión encontraron en v1, sin reescribir lo
que ya pasaba. Antes de este prompt se corrigió la especificación (versión 1.2, regla I-3), porque el
fallo venía de una frase ambigua: «no se acepta del cliente» admitía la lectura «se ignora en
silencio». El prompt cita la salida real de `bitacora/v1-esquema/verificacion.txt`.

## Prompt literal

```text
[Contexto adjunto: docs/ESPECIFICACION-TECNICA.md versión 1.2, y tu migración anterior
 bitacora/v1-esquema/migracion.sql]

Probé tu migración con `supabase db reset` + `supabase test db` en el Supabase local. Pasan 62 de
65 pruebas de aceptación. Fallan estas tres (salida literal de pgTAP):

  not ok 4 - I-3 el cliente no puede escribir created_by
  not ok 11 - I-3/T-4 los proyectos de la semilla (rol postgres, sin sesión) conservan created_by
  not ok 46 - I-3 ni la coordinadora puede fijar created_by desde el cliente
  #       caught: no exception
  #       wanted: 42501

Diagnóstico mío, compruébalo en tu SQL:
1. `grant select, insert, update, delete on public.proyectos to authenticated` concede INSERT y
   UPDATE sobre created_by. Tu trigger lo sobrescribe en silencio, así que el cliente no recibe
   error; la especificación 1.2 (I-3) pide que el intento falle con 42501 por falta de privilegio.
2. En el INSERT, `new.created_by := v_mi_id` también pisa el valor que pone la semilla (corre como
   postgres, sin sesión): los 9 proyectos de la semilla quedaron con created_by en NULL.

Pido:
- Grants por columna en proyectos: INSERT y UPDATE de todas las columnas editables EXCEPTO id,
  created_by, created_at y updated_at. Mantén SELECT y DELETE de tabla.
- created_by con DEFAULT privado.mi_instalador_id() en vez de asignarlo en el trigger; el trigger
  ya no toca created_by (ni en INSERT ni en UPDATE).
- Revisa si el mismo patrón (grant de tabla completa que deja escribir columnas de sistema)
  aparece en instaladores, materiales y proyecto_materiales, y corrígelo igual. Justifica cada
  grant en una línea.
- No cambies nada más: lo que ya pasa no se toca. Devuelve la migración COMPLETA y, aparte, la
  lista de cambios respecto a v1.
```

## Respuesta y verificación

- Respuesta literal: [v2-esquema/respuesta.md](v2-esquema/respuesta.md)
- SQL propuesto sin editar: [v2-esquema/migracion.sql](v2-esquema/migracion.sql)
- Resultado de las 65 pruebas: [v2-esquema/verificacion.txt](v2-esquema/verificacion.txt)
