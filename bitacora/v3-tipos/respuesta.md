# Respuesta al prompt 03 — auditoría de los tipos generados

## 1. Auditoría: lo que el tipo permite frente a lo que hace la base

`supabase gen types` lee el catálogo de PostgreSQL (tablas, columnas, nulos, DEFAULT, FK, enums,
vistas). No lee `GRANT` por columna, triggers, CHECK ni políticas RLS. Por eso hay operaciones que
compilan y la base rechaza:

| Columna u operación | El tipo generado permite | La base hace | Consecuencia para el front |
|---|---|---|---|
| `proyectos.Insert.id`, `created_at`, `updated_at` | opcionales (tienen DEFAULT) | sin GRANT de INSERT → `42501` (I-4) | `NuevoProyecto` los omite |
| `proyectos.Insert.created_by` | `string \| null` opcional | sin GRANT → `42501` (I-3); el DEFAULT pone `mi_instalador_id()` | se omite; nunca se envía |
| `proyectos.Insert.estado` | cualquier estado | **lo acepta** (hay GRANT de INSERT sobre `estado`) | ver hallazgo |
| `proyectos.Update.*` | todo opcional, para cualquiera | instalador: solo `estado` (trigger, `42501`); `created_by`, `id`, fechas de sistema: sin GRANT | la UI del instalador solo ofrece cambiar el estado; el error del trigger se muestra tal cual |
| `proyectos.Update.estado` | cualquier valor | trigger: T-1/T-2/T-3 → `P0001 Transición no permitida…` | el front no duplica la regla; muestra el mensaje de la base |
| `proyectos.Insert.capacidad_kwp`, `numero_paneles` | `number` sin rango | CHECK `> 0`, `<= 10000` / `<= 50000` → `23514` | `proyectoSchema` repite el rango para avisar en el campo |
| `fecha_inicio`, `fecha_fin` | `string` libre | `date` + CHECK fin ≥ inicio | el esquema valida formato `AAAA-MM-DD` y el orden |
| `instalador_id` | cualquier uuid | trigger I-2 (activo y rol instalador), FK RESTRICT | el selector solo lista instaladores activos; si aun así falla, se muestra el error |
| `instaladores.Insert/Update.user_id`, `rol` | editables | `user_id` sin GRANT de UPDATE; filas: solo coordinador (RLS) | sin pantalla de personal en esta versión |
| Vista `resumen_proyectos_por_estado` | `estado \| null`, `total \| null` | nunca nulos (parte del enum; `count` no es null) | `aResumenEstado()` valida y quita los null |
| Lectura con RLS | `Row[]` | filas que no le tocan **no aparecen** (lista vacía, sin error) | «vacío» y «error» son estados distintos en la UI |
| `Relationships` de proyectos | **dos** FK a `instaladores` (`instalador_id`, `created_by`) | PostgREST no sabe cuál usar en `instaladores(nombre)` | el embed debe nombrar la FK: `instalador:instaladores!proyectos_instalador_id_fkey(nombre)` |

## 2. Hallazgo: un proyecto puede **nacer** completado

La máquina de estados (§4) vive en un trigger `BEFORE UPDATE`. En `INSERT` no se mira el estado, y
`authenticated` tiene GRANT de INSERT sobre `estado`. Por tanto un coordinador puede crear un
proyecto directamente en `completado`, que en la práctica es el salto `pendiente → completado` que
T-2 prohíbe «para todos». El tipo generado lo deja ver: `estado` es opcional en `Insert`.

Propuesta (la más restrictiva y del mismo estilo que I-3/I-4): **quitar `estado` del GRANT de
INSERT**. Un proyecto creado desde la API nace con el DEFAULT `pendiente`; la semilla y el Studio
(rol `postgres`, sin sesión) pueden seguir cargando historia con su estado real. Prueba sugerida:
como coordinadora, `insert … (estado) values ('completado')` debe fallar con `42501`.

`NuevoProyecto` ya omite `estado`, así que el front no se entera del cambio.

## 3. Archivos

- `dominio.ts`: alias derivados de `Database` (ninguno escrito a mano dos veces);
  `ESTADOS_PROYECTO` sale de `Constants`, que respeta el orden del enum.
- `proyectoSchema.ts`: zod 4. Los números se validan como texto primero (para dar el mensaje
  «máximo 2 decimales» o «entero» en vez de un `NaN`), luego se convierten y se comprueba el rango.
  La última línea (`salidaEsNuevoProyecto`) no compila si la salida deja de ser asignable a
  `NuevoProyecto`.

## 4. Dudas

- `z.guid()` acepta cualquier UUID con forma 8-4-4-4-12; `z.uuid()` exige versión y variante RFC.
  Los UUID de la semilla son v4 válidos, pero `guid` no depende de eso.
- `numeric(8,2)` llega como `number`; para importes grandes habría que pensar en texto, aquí no hace
  falta (kWp con 2 decimales).
