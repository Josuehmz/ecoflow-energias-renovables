# Caso: cómo la IA resolvió (a la segunda) un problema técnico complejo

**Problema:** garantizar en la base de datos que el autor de un proyecto (`proyectos.created_by`) lo
pone el sistema y nunca el cliente, sin romper la carga de datos de la semilla ni la del Studio.

Parece pequeño y no lo es: toca a la vez los privilegios de PostgreSQL por columna, el orden en que
se evalúan DEFAULT, triggers y políticas RLS, y la diferencia entre una sesión de usuario
(`authenticated`) y un rol de servicio (`postgres`). Es el tipo de regla que una IA «resuelve» con
código que parece correcto y no lo es. Todo lo de esta página es real y está en el repositorio:
prompts literales, respuestas sin editar y la salida de las pruebas.

## 1. Lo que pedía la especificación

[ESPECIFICACION-TECNICA.md](ESPECIFICACION-TECNICA.md), versión 1.1 (antes del código):

> **I-3.** `created_by` no se acepta del cliente: el valor por defecto es el instalador de la sesión.

Y la prueba de aceptación, escrita antes de pedirle el SQL a la IA
([ecoflow_aceptacion.test.sql](../supabase/tests/database/ecoflow_aceptacion.test.sql)):

```sql
select ok(
  not has_column_privilege('authenticated', 'public.proyectos', 'created_by', 'insert'),
  'I-3 el cliente no puede escribir created_by');
…
select throws_ok(
  $$insert into public.proyectos (…, created_by) values (…, 'b2222222-…')$$,
  '42501', null, 'I-3 ni la coordinadora puede fijar created_by desde el cliente');
```

## 2. El prompt

[bitacora/01-prompt-esquema.md](../bitacora/01-prompt-esquema.md): la especificación completa como
contexto y el pedido de la migración. El punto relevante:

```text
5. Trigger de reglas de proyectos: asignación (I-2), created_by (I-3), máquina de estados (§4,
   T-1 a T-5) y la restricción «el asignado solo cambia estado». Usa los SQLSTATE y los prefijos de
   mensaje de la tabla de §4.
```

## 3. La primera respuesta (v1): plausible y equivocada

La IA ([bitacora/v1-esquema/migracion.sql](../bitacora/v1-esquema/migracion.sql), sin editar) resolvió
I-3 **dentro del trigger**, sobrescribiendo el valor:

```sql
  if tg_op = 'INSERT' then
    …
    -- I-3: created_by no se acepta del cliente; lo pone la base.
    new.created_by := v_mi_id;
  else  -- UPDATE
    …
    -- I-3 en UPDATE: created_by no se reescribe desde el cliente.
    if new.created_by is distinct from old.created_by
       and new.created_by is not null then
      new.created_by := old.created_by;
    end if;
```

y concedió la tabla completa:

```sql
grant select, insert, update, delete on table public.proyectos to authenticated;
```

Leído en una revisión rápida, cumple: el cliente «no puede» fijar el autor porque el trigger lo
pisa. Tiene dos defectos:

1. **El error se esconde.** Un cliente que manda `created_by` recibe un 201 y otro valor del que
   envió. La especificación decía «no se acepta», y el silencio no es rechazo.
2. **Rompe la semilla.** El trigger corre para todos los roles. La semilla se carga como `postgres`,
   sin sesión: `privado.mi_instalador_id()` devuelve `NULL` y el trigger **borraba el autor de cada
   proyecto cargado**.

## 4. La prueba que lo demostró

`supabase db reset` + `supabase test db` contra el Supabase local
([bitacora/v1-esquema/verificacion.txt](../bitacora/v1-esquema/verificacion.txt)):

```text
not ok 4 - I-3 el cliente no puede escribir created_by
not ok 11 - I-3/T-4 los proyectos de la semilla (rol postgres, sin sesión) conservan created_by
not ok 46 - I-3 ni la coordinadora puede fijar created_by desde el cliente
#       caught: no exception
#       wanted: 42501
# Looks like you failed 3 tests of 65
```

La prueba 11 no estaba en el plan original de 64. El segundo defecto lo encontró la **revisión
humana** del SQL, no las pruebas: al leer `new.created_by := v_mi_id` surgió la pregunta «¿y la
semilla?», y una consulta lo confirmó:

```text
$ psql … -c "select count(*) filter (where created_by is null), count(*) from public.proyectos"
9|9
```

Se escribió la prueba 11, se vio fallar contra v1 y quedó en la suite (commit
`test: prueba 65 (created_by de la semilla)…`). Es la parte del caso que muestra que no se copió la
respuesta a ciegas: las pruebas no lo cubrían y la lectura sí.

## 5. La especificación corrigió a la IA, no al revés

Antes del segundo prompt se corrigió la frase ambigua (versión 1.2):

> **I-3.** `created_by` no se acepta del cliente: `authenticated` **no tiene privilegio** de INSERT ni
> de UPDATE sobre esa columna (grants por columna), así que intentarlo da `42501`; el valor por
> defecto es el instalador de la sesión. Un rol sin sesión de usuario (`postgres`, `service_role`:
> la semilla o el Studio) sí puede fijarlo, y la base no se lo reescribe.

Y el prompt 02 ([bitacora/02-prompt-correccion-esquema.md](../bitacora/02-prompt-correccion-esquema.md))
citó la salida literal y un diagnóstico verificable, sin dictar el SQL:

```text
Diagnóstico mío, compruébalo en tu SQL:
1. `grant select, insert, update, delete on public.proyectos to authenticated` concede INSERT y
   UPDATE sobre created_by. Tu trigger lo sobrescribe en silencio […]
2. En el INSERT, `new.created_by := v_mi_id` también pisa el valor que pone la semilla […]
Pido:
- Grants por columna en proyectos […] EXCEPTO id, created_by, created_at y updated_at.
- created_by con DEFAULT privado.mi_instalador_id() en vez de asignarlo en el trigger […]
- Revisa si el mismo patrón […] aparece en instaladores, materiales y proyecto_materiales […]
```

## 6. La solución final (v2) y por qué funciona

[bitacora/v2-esquema/migracion.sql](../bitacora/v2-esquema/migracion.sql), adoptada en la migración:

```sql
alter table public.proyectos
  alter column created_by set default privado.mi_instalador_id();
…
grant insert (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles,
              fecha_inicio, fecha_fin, instalador_id)          -- sin created_by
  on table public.proyectos to authenticated;
```

Por qué es correcta, punto por punto:

- **PostgreSQL comprueba el privilegio sobre las columnas que nombra la sentencia**, no sobre lo que
  escriben un DEFAULT o un trigger. Si el cliente no nombra `created_by`, entra el DEFAULT (el
  instalador de la sesión) y no hace falta privilegio; si lo nombra, `42501` antes de llegar a la
  política. El error es visible.
- **Un DEFAULT solo actúa cuando la sentencia no trae la columna.** La semilla, que sí la trae y corre
  como `postgres` (dueño de la tabla), conserva su valor.
- La IA aplicó el mismo patrón a `instaladores` y `materiales` (`id`, `created_at`, `updated_at`),
  que en v1 también eran escribibles por el cliente.

Resultado ([bitacora/v2-esquema/verificacion.txt](../bitacora/v2-esquema/verificacion.txt)):

```text
Files=1, Tests=65 …
Result: PASS
```

(El primer intento de verificar v2 dio 62 de 65, pero por un defecto de **la prueba**: la 43
insertaba un `id` fijo que el propio prompt 02 había mandado prohibir. Se corrigió la prueba, se
escribió la regla I-4 en la especificación y se dejó el intento fallido en
[verificacion-intento-1.txt](../bitacora/v2-esquema/verificacion-intento-1.txt).)

## 7. El mismo razonamiento encontró un segundo hueco

En el prompt 03 se le pidió a la IA auditar los tipos que genera `supabase gen types` contra el SQL.
Como el generador no conoce los GRANT, la auditoría listó qué deja escribir el tipo `Insert` y qué
rechaza la base, y en esa tabla apareció `estado`: el INSERT lo aceptaba, y la máquina de estados
solo vigilaba los UPDATE. Un coordinador podía **crear un proyecto ya completado**, que es el salto
`pendiente → completado` que la regla T-2 prohíbe para todos.

Se escribió la prueba (T-6), se vio fallar contra la migración vigente, se quitó `estado` del GRANT
de INSERT y pasó ([bitacora/v3-tipos/verificacion.txt](../bitacora/v3-tipos/verificacion.txt)):

```text
# Looks like you failed 1 test of 67        ← antes
Files=1, Tests=67 … Result: PASS            ← después
```

## 8. Qué enseña el caso

- **La IA propuso un mecanismo (trigger) donde correspondía una garantía declarativa (privilegios).**
  El código del trigger estaba bien escrito; el diseño no.
- **Las pruebas escritas antes que el código convirtieron la discusión en un dato** (62 de 65), y el
  prompt de corrección citó ese dato en vez de reescribir el SQL a mano.
- **La revisión del SQL encontró lo que las pruebas no cubrían** (la semilla), y eso se convirtió en
  una prueba más.
- **Cuando la IA falla por una frase ambigua, se corrige la especificación**, y queda en su registro
  de cambios (1.2, 1.3 y 1.4).

Estado final: 67 de 67 pruebas pgTAP
([docs/evidencia/rls/verificacion-final.txt](evidencia/rls/verificacion-final.txt)) y 19 de 19 por la
API real con sesiones de la semilla
([docs/evidencia/rls/api-sesiones-reales.txt](evidencia/rls/api-sesiones-reales.txt)).
