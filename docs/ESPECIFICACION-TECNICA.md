# Documento de Especificación Técnica — EcoFlow (prompt maestro)

> Este documento se escribió **antes que cualquier línea de código** y es el contexto fijo que
> acompaña a cada prompt enviado a la IA (ver [PROMPTS.md](PROMPTS.md)). Si la IA propone algo que
> lo contradice, gana este documento; si el documento estaba equivocado, se corrige aquí primero
> (sección [9. Registro de cambios](#9-registro-de-cambios)) y después en el código.

## 0. Rol que se le asigna a la IA

Actúa como ingeniero senior de PostgreSQL/Supabase y de React + TypeScript. Trabajas **dentro** de
esta especificación: no inventes tablas, columnas, roles ni librerías que no estén aquí. Cuando algo
no esté definido, dilo y propone la opción más restrictiva. Entrega archivos completos, no
fragmentos. Cada decisión de seguridad lleva una línea de justificación.

## 1. Contexto de negocio

EcoFlow es una startup de tecnología limpia que instala sistemas solares fotovoltaicos. Necesita una
aplicación **interna** para gestionar sus proyectos de instalación. Hay dos perfiles:

| Rol | Quién es | Qué necesita |
|---|---|---|
| `coordinador` | Planea y asigna obras | Ver todos los proyectos, crearlos, editarlos, asignarlos, borrarlos, mantener el catálogo de materiales y el personal |
| `instalador` | Técnico en campo | Ver **solo** los proyectos que tiene asignados y avanzar su estado |

No hay registro público: es una herramienta interna. Las cuentas las da de alta un coordinador (o la
semilla en desarrollo). Nadie se asigna a sí mismo un rol.

## 2. Modelo de datos (contratos)

Base: PostgreSQL 17 de Supabase, esquema `public`. Identificadores `uuid` con `gen_random_uuid()`.
Fechas de calendario en `date`; marcas de tiempo en `timestamptz`.

### 2.1 Tipos enumerados

- `estado_proyecto`: `pendiente`, `en_progreso`, `completado` (en ese orden).
- `rol_equipo`: `instalador`, `coordinador`.
- `tipo_material`: `panel`, `inversor`, `estructura`, `cableado`, `proteccion`, `bateria`.

### 2.2 `instaladores` — personal de la empresa (incluye coordinadores)

| Columna | Tipo | Regla |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL UNIQUE | FK → `auth.users(id)` ON DELETE CASCADE (relación 1:1 con la cuenta) |
| `nombre` | text NOT NULL | 2 a 120 caracteres sin contar espacios de los extremos |
| `email` | text NOT NULL UNIQUE | en minúsculas (CHECK `email = lower(email)`) y con forma de correo |
| `especialidad` | text NULL | p. ej. «Instalación residencial» |
| `certificacion` | text NULL | p. ej. «RETIE» |
| `rol` | `rol_equipo` NOT NULL DEFAULT `instalador` | solo lo cambia un coordinador |
| `activo` | boolean NOT NULL DEFAULT true | baja lógica: el personal no se borra si tiene historia |
| `created_at`, `updated_at` | timestamptz NOT NULL DEFAULT now() | `updated_at` por trigger |

El coordinador vive en la misma tabla con `rol = 'coordinador'`: es una persona del equipo y así un
solo `join` da el nombre de quien creó o tiene asignado un proyecto.

### 2.3 `proyectos` — obras de instalación

| Columna | Tipo | Regla |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text NOT NULL | 3 a 120 caracteres |
| `cliente` | text NOT NULL | 2 a 120 caracteres |
| `direccion` | text NOT NULL | 5 a 200 caracteres |
| `ciudad` | text NOT NULL | 2 a 80 caracteres |
| `capacidad_kwp` | numeric(8,2) NOT NULL | `> 0` y `<= 10000` |
| `numero_paneles` | integer NOT NULL | `> 0` y `<= 50000` |
| `fecha_inicio` | date NOT NULL | |
| `fecha_fin` | date NULL | si existe, `fecha_fin >= fecha_inicio` |
| `estado` | `estado_proyecto` NOT NULL DEFAULT `pendiente` | ver §4 |
| `instalador_id` | uuid NULL | FK → `instaladores(id)` **ON DELETE RESTRICT** |
| `created_by` | uuid NULL | FK → `instaladores(id)` **ON DELETE SET NULL**; lo pone la base, no el cliente |
| `created_at`, `updated_at` | timestamptz NOT NULL DEFAULT now() | `updated_at` por trigger |

Invariantes adicionales:

- **I-1.** Un proyecto en `en_progreso` o `completado` tiene instalador (CHECK).
- **I-2.** Solo se asigna a personal **activo** con rol `instalador` (trigger, porque un CHECK no
  puede mirar otra tabla).
- **I-3.** `created_by` no se acepta del cliente: `authenticated` **no tiene privilegio** de INSERT
  ni de UPDATE sobre esa columna (grants por columna), así que intentarlo da `42501`; el valor por
  defecto es el instalador de la sesión. Un rol sin sesión de usuario (`postgres`, `service_role`:
  la semilla o el Studio) sí puede fijarlo, y la base no se lo reescribe.
- **I-4.** `id`, `created_at` y `updated_at` también los pone la base en las cuatro tablas: el
  cliente no tiene privilegio para escribirlos (el `id` sale de `gen_random_uuid()`).

### 2.4 `materiales` — catálogo

| Columna | Tipo | Regla |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text NOT NULL UNIQUE | 2 a 120 caracteres |
| `tipo` | `tipo_material` NOT NULL | |
| `unidad` | text NOT NULL | `unidad`, `metro`, `kit` o `rollo` (CHECK) |
| `costo_unitario` | numeric(12,2) NOT NULL | `>= 0` |
| `stock` | integer NOT NULL DEFAULT 0 | `>= 0` |
| `created_at`, `updated_at` | timestamptz | `updated_at` por trigger |

### 2.5 `proyecto_materiales` — relación N:M

| Columna | Tipo | Regla |
|---|---|---|
| `proyecto_id` | uuid | FK → `proyectos(id)` **ON DELETE CASCADE** |
| `material_id` | uuid | FK → `materiales(id)` **ON DELETE RESTRICT** |
| `cantidad` | integer NOT NULL | `> 0` |
| | | PK compuesta `(proyecto_id, material_id)` |

### 2.6 Índices

- Toda FK lleva índice salvo que ya sea prefijo de otro índice: `proyectos(instalador_id)`,
  `proyectos(created_by)`, `proyecto_materiales(material_id)` (`proyecto_id` ya es prefijo de la PK),
  `instaladores(user_id)` (lo da el UNIQUE).
- `proyectos(estado)` para el tablero y los conteos.

### 2.7 Resumen para el tablero

Vista `resumen_proyectos_por_estado(estado, total)` con **una fila por cada estado aunque tenga cero
proyectos**, que respeta la RLS de quien la consulta (un instalador cuenta solo los suyos).

## 3. Seguridad (RLS)

- **S-1.** RLS **habilitada y forzada** (`force row level security`) en las cuatro tablas.
- **S-2.** `anon` no tiene ningún privilegio sobre las tablas ni la vista. Se hace
  `revoke all … from anon, authenticated` y luego `grant` solo lo necesario a `authenticated`
  (en Supabase las tablas nuevas nacen con todo concedido; las políticas no lo quitan).
- **S-3.** Funciones auxiliares (`es_coordinador()`, `mi_instalador_id()`) `security definer`,
  `stable`, con `set search_path = ''` y nombres totalmente calificados; viven en un esquema que la API
  no expone (`privado`).
- **S-4.** Un usuario inactivo (`activo = false`) no es coordinador ni ve proyectos.

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `instaladores` | su propia fila; coordinador todas | coordinador | coordinador | coordinador |
| `proyectos` | asignado (`instalador_id = mi_instalador_id()`); coordinador todas | coordinador | coordinador; el asignado solo la columna `estado` | coordinador |
| `materiales` | cualquier autenticado | coordinador | coordinador | coordinador |
| `proyecto_materiales` | si el proyecto es visible para quien consulta | coordinador | coordinador | coordinador |

«El asignado solo cambia `estado`» se impone en la base (trigger): si un no coordinador cambia otra
columna, la operación falla.

## 4. Máquina de estados del proyecto

```
pendiente ──► en_progreso ──► completado
    ▲              │  ▲            │
    └──────────────┘  └────────────┘   (retrocesos: solo coordinador)
```

- **T-1.** Avance de un paso (`pendiente → en_progreso`, `en_progreso → completado`): el asignado o
  un coordinador.
- **T-2.** Saltar un paso (`pendiente → completado`): **nadie**; una obra no termina sin empezar.
- **T-3.** Retroceder (`completado → en_progreso`, `en_progreso → pendiente`,
  `completado → pendiente`): solo un coordinador (reabrir o reprogramar).
- **T-4.** La regla vive en la base (trigger `BEFORE UPDATE`), no solo en React. Un cambio sin sesión
  de usuario (rol `postgres` o `service_role`, p. ej. el Studio) cuenta como coordinador.
- **T-6.** Un proyecto creado con sesión de usuario **nace `pendiente`**: `authenticated` no tiene
  GRANT de INSERT sobre `estado`. Solo un rol sin sesión (semilla, Studio) carga historia con otro
  estado.
- **T-5.** El mensaje de error dice qué transición se intentó y por qué no se permite, para mostrarlo
  tal cual en la interfaz.

Códigos de error que la base debe devolver (las pruebas los comprueban):

| Situación | SQLSTATE | Mensaje empieza por |
|---|---|---|
| Transición no permitida (T-2, T-3) | `P0001` | `Transición no permitida` |
| Asignación a personal inactivo o a un coordinador (I-2) | `P0001` | `Asignación no válida` |
| Un no coordinador cambia una columna distinta de `estado` | `42501` | `Solo un coordinador` |
| Sin privilegio o fila nueva fuera de la política | `42501` | (mensaje de PostgreSQL) |
| CHECK violado | `23514` | (mensaje de PostgreSQL) |
| FK violada (RESTRICT) | `23503` | (mensaje de PostgreSQL) |

## 5. Frontend (contrato)

- Vite + React 19 + TypeScript estricto (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), Tailwind 4 + componentes shadcn/ui, pnpm. **Prohibido `any`.**
- Tipos de la base generados con `supabase gen types typescript --local` en
  `src/types/database.types.ts` (`pnpm gen:types`). El cliente se crea como `createClient<Database>`.
- Capas y sentido de las importaciones: `components/ui` (presentación pura) ← `features/*/components`
  ← `features/*/hooks` ← `services/` ← `lib/supabase.ts`. Un componente nunca importa `services/` ni
  `lib/`; lo hace cumplir el linter.
- `features/auth`: login con email y contraseña, `useSesion` (sesión + `onAuthStateChange`) y
  `usePerfil` (fila de `instaladores` del usuario).
- `features/dashboard`: conteo por estado (desde la vista) y tablero de tres columnas; estados de
  **carga, vacío y error** visibles, con «Reintentar».
- `features/proyectos`: `useProyectos`, `useCrearProyecto`, `useCambiarEstado`; formulario de nuevo
  proyecto **solo para coordinador**, validado con zod + react-hook-form **antes** de enviar, con
  mensajes por campo que reflejan las mismas reglas de §2.3, y el error que devuelva Supabase visible.
- Cambio de estado: la interfaz deja elegir el estado destino y muestra el error de la base cuando la
  transición no está permitida. La regla de §4 tiene **una sola fuente**: la base.
- Ninguna clave `service_role` en el front ni en el repositorio. `.env.example` con los nombres;
  `.env.local` ignorado.

## 6. Criterios de aceptación

Cada criterio tiene una prueba automática que lo demuestra.

| ID | Criterio | Prueba |
|---|---|---|
| CA-01 | RLS habilitada y forzada en las 4 tablas | pgTAP |
| CA-02 | `anon` no lee ni escribe ninguna tabla ni la vista | pgTAP + API |
| CA-03 | Instalador A ve solo sus proyectos; no ve los de B | pgTAP + API |
| CA-04 | Instalador A no modifica ni borra proyectos de B (0 filas) | pgTAP + API |
| CA-05 | Instalador avanza su proyecto un paso | pgTAP + API |
| CA-06 | Instalador no cambia otra columna que `estado` | pgTAP |
| CA-07 | Instalador no crea proyectos ni materiales | pgTAP + API |
| CA-08 | Retroceso de instalador rechazado; de coordinador aceptado | pgTAP + API |
| CA-09 | Salto `pendiente → completado` rechazado para todos | pgTAP |
| CA-10 | Coordinador ve todo y crea proyectos; `created_by` lo pone la base | pgTAP + API |
| CA-11 | CHECKs rechazan capacidad ≤ 0, paneles ≤ 0, fin < inicio, en_progreso sin instalador, cantidad ≤ 0, costo < 0, stock < 0 | pgTAP |
| CA-12 | FKs: borrar instalador con proyectos falla; borrar proyecto borra sus materiales; borrar material en uso falla | pgTAP |
| CA-13 | `proyecto_materiales` visible solo si el proyecto es visible | pgTAP |
| CA-14 | La vista de resumen respeta la RLS y trae los 3 estados | pgTAP |
| CA-15 | No se asigna a personal inactivo ni a un coordinador | pgTAP |
| CA-16 | Funciones auxiliares `security definer` con `search_path` fijo | pgTAP |
| CA-17 | `updated_at` cambia en cada UPDATE | pgTAP |
| CA-18 | El formulario no envía datos inválidos y muestra el mensaje de cada campo | Vitest |
| CA-19 | Los hooks exponen carga, error y datos | Vitest |
| CA-20 | `tsc -b --noEmit`, lint y build en verde; tipos generados sin diferencias | script |

## 7. Datos de prueba (semilla)

Un coordinador, dos instaladores activos (A y B) y uno inactivo; nueve proyectos: A tiene uno en
cada estado, B tiene dos pendientes, uno en progreso y uno completado, uno pendiente sin asignar y uno
completado del instalador que hoy está inactivo (historia que no se borra); seis materiales; consumos
de material en cinco proyectos (8 filas visibles para A, 5 para B, 14 en total). Los usuarios se crean en `auth.users` e `auth.identities` desde `seed.sql`, con UUID fijos
para que todo sea reproducible con `supabase db reset`.

## 8. Fuera de alcance

Registro público, recuperación de contraseña, subida de archivos, tiempo real y despliegue en la nube
(se trabaja con la CLI de Supabase en local).

## 9. Registro de cambios

| Versión | Cambio | Motivo |
|---|---|---|
| 1.0 | Versión inicial, antes del código | — |
| 1.1 | Códigos SQLSTATE de cada error (§4) y reparto exacto de la semilla (§7) | Las pruebas de aceptación se escribieron antes que el SQL y necesitaban un contrato comprobable |
| 1.2 | I-3 precisado: grants por columna en vez de «sobrescribir en silencio», y la semilla conserva su `created_by` | La v1 de la IA leyó «no se acepta» como «se ignora»: concedió INSERT sobre la columna y el trigger la pisaba, incluso en la semilla (9 de 9 en NULL). Ver `bitacora/v1-esquema/verificacion.txt` |
| 1.3 | I-4: el cliente tampoco escribe `id`, `created_at` ni `updated_at` | Lo pedía el prompt 02 y la v2 lo cumplió, pero la prueba 43 insertaba un `id` fijo: el contrato no lo decía y se escribe aquí. La prueba se ajustó (busca por nombre) |
| 1.4 | T-6: un proyecto nuevo nace `pendiente` (sin GRANT de INSERT sobre `estado`) | Hallazgo de la auditoría de tipos (prompt 03): `Insert.estado` era opcional y la base lo aceptaba, así que se podía «nacer» completado y saltarse T-2 |
