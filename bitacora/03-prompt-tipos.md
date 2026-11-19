# Prompt 03 — Tipos TypeScript: generarlos con la CLI y que la IA los audite

**Objetivo del paso:** los tipos de la base no se escriben a mano. Se generan desde el esquema real
con `supabase gen types typescript --local` (`pnpm gen:types` → `src/types/database.types.ts`) y se
le pide a la IA que los **audite** contra el SQL: el generador conoce tablas, columnas, nulos y
claves foráneas, pero no conoce los GRANT por columna, los triggers ni la RLS. Lo que el tipo deja
escribir y la base rechaza es justo lo que hay que cubrir con tipos de dominio y validación.

**Quién respondió:** v1 y v2 las respondió un asistente aislado (subagente). Para este prompt y los
siguientes se agotó el límite de dos subagentes de la sesión, así que respondió el asistente de la
sesión principal; cada respuesta se guardó y se registró en git **antes** de verificarla, igual que
las anteriores. Esa sesión ya había visto la salida de la CLI (es el insumo del prompt).

## Prompt literal

```text
[Contexto adjunto: docs/ESPECIFICACION-TECNICA.md (1.3), la migración
 supabase/migrations/20261119025015_esquema_ecoflow.sql y src/types/database.types.ts generado con
 `supabase gen types typescript --local` (CLI 2.122.0)]

Actúa con el rol de la sección 0 de la especificación.

1. Audita database.types.ts contra el SQL. Haz una tabla: columna u operación → qué permite el tipo
   generado → qué hace la base (GRANT por columna, trigger, CHECK, RLS) → consecuencia para el
   front. Fíjate en especial en Insert/Update de proyectos, en la vista y en las relaciones.
   Si encuentras algo que la base acepta y la especificación prohíbe, dilo como hallazgo aparte.
2. dominio.ts — alias de dominio DERIVADOS de Database (nada escrito dos veces): EstadoProyecto,
   RolEquipo, Proyecto, Instalador, Material, ResumenEstado (sin los null de la vista),
   NuevoProyecto (lo que el cliente puede enviar al crear un proyecto según los GRANT, no según la
   tabla) y ProyectoConInstalador (proyecto + `instalador: { nombre } | null` del join de PostgREST).
   Además ESTADOS_PROYECTO en el orden de la máquina de estados (desde Constants, no a mano) y las
   etiquetas en español.
3. proyectoSchema.ts — esquema zod 4 del formulario «Nuevo proyecto» que reproduzca los CHECK del
   SQL (longitudes con trim, rangos, máximo 2 decimales en kWp, entero en paneles, fecha fin ≥ fecha
   inicio) con un mensaje en español por campo, y cuya salida sea asignable a NuevoProyecto
   (demuéstralo con una línea que no compile si deja de serlo). Los campos llegan como texto desde
   los <input>: conviértelos; fecha fin e instalador vacíos son null.

Stack: TypeScript 7 estricto (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes),
zod 4, React 19. Sin `any`. Archivos completos.
```

## Respuesta y verificación

- Respuesta literal (auditoría + hallazgo): [v3-tipos/respuesta.md](v3-tipos/respuesta.md)
- Archivos propuestos sin editar: [v3-tipos/dominio.ts](v3-tipos/dominio.ts),
  [v3-tipos/proyectoSchema.ts](v3-tipos/proyectoSchema.ts)
- Verificación (tsc, y el hallazgo probado en la base): [v3-tipos/verificacion.txt](v3-tipos/verificacion.txt)
