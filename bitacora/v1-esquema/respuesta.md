# Respuesta al prompt 01: migración inicial de EcoFlow

Abajo está la migración completa para `supabase/migrations/<timestamp>_esquema_ecoflow.sql`. Implementa
las secciones 2, 3 y 4 de la especificación en el orden que pediste, con un comentario de cabecera
en cada bloque. El SQL completo está en [`migracion.sql`](migracion.sql); no lo repito aquí.

## Estructura del archivo

1. **Tipos enumerados (§2.1):** `estado_proyecto`, `rol_equipo` y `tipo_material`. El orden de
   `estado_proyecto` es el de la máquina de estados, y el trigger lo usa para medir cuántos pasos
   tiene una transición.
2. **Tablas (§2.2 a §2.5) e índices (§2.6):** todas las reglas de §2 están en la base, con nombres
   explícitos para que el error de PostgreSQL diga qué regla falló. I-1 es un CHECK
   (`estado = 'pendiente' or instalador_id is not null`). Hay cuatro índices: `proyectos(instalador_id)`,
   `proyectos(created_by)`, `proyectos(estado)` y `proyecto_materiales(material_id)`. No creé índices
   aparte para `instaladores(user_id)` ni para `proyecto_materiales(proyecto_id)` porque ya los cubren
   el UNIQUE y la PK.
3. **Trigger genérico `public.set_updated_at()`:** se ejecuta en `instaladores`, `proyectos` y
   `materiales`.
4. **Esquema `privado`:** contiene `es_coordinador()` y `mi_instalador_id()`, ambas `security definer`,
   `stable`, con `set search_path = ''` y nombres totalmente calificados. EXECUTE queda solo para
   `authenticated` y `service_role`.
5. **Trigger `privado.reglas_proyectos()` (BEFORE INSERT OR UPDATE):** aplica I-2, I-3, T-1 a T-5 y
   la regla «el asignado solo cambia estado», con los SQLSTATE y los prefijos de mensaje de la tabla
   de §4.
6. **Vista `resumen_proyectos_por_estado`:** parte de `enum_range(...)` con un `left join`, así que
   siempre devuelve las 3 filas. Tiene `security_invoker = true` para que aplique la RLS de quien la
   consulta.
7. **RLS:** `enable` + `force` en las cuatro tablas. Hago `revoke all` a `anon` y `authenticated`
   sobre las tablas y la vista, y concedo después a `authenticated` solo las cuatro operaciones y el
   SELECT de la vista. Hay 16 políticas, una por operación y tabla, todas `to authenticated`, con
   `auth.uid()` y las auxiliares envueltas en `(select ...)`. Para `anon` no hay nada.

## Justificación de las decisiones de seguridad

- **Las auxiliares son `security definer`:** las políticas de `instaladores` las llaman, y si
  respetaran la RLS de quien llama la política se llamaría a sí misma sin fin. Como el `search_path`
  está vacío, un objeto con el mismo nombre en otro esquema no puede suplantar a las tablas.
- **El esquema `privado` no está expuesto:** PostgREST no lo publica, así que esas funciones no se
  pueden llamar como RPC.
- **El trigger de reglas es `security invoker`:** con eso `current_user` es el rol real que hace el
  cambio, y T-4 puede distinguir una sesión sin usuario (`postgres`, `service_role`) de un
  `authenticated`.
- **La política de UPDATE de `proyectos` tiene `using` y `with check`:** el asignado no puede dejar
  la fila fuera de su alcance. De todos modos, el trigger ya le impide tocar `instalador_id`.
- **`proyecto_materiales` se filtra con un `exists` sobre `proyectos`:** esa subconsulta pasa por la
  RLS de `proyectos`, así que «visible si el proyecto es visible» se decide en un solo lugar.

## Decisiones donde la especificación no era explícita

1. **Quién cuenta como coordinador en T-4:** cualquier rol que no sea `anon` ni `authenticated`
   (`postgres`, `service_role`, el Studio y las acciones referenciales de las FK), además del
   coordinador activo según `es_coordinador()`. El salto `pendiente → completado` (T-2) se rechaza
   también para esos roles, porque la especificación dice «nadie».
2. **INSERT de un no coordinador:** el trigger lo rechaza con `42501` («Solo un coordinador puede
   crear proyectos») antes de que llegue la política. Así el error que se ve es el de privilegio y
   no una validación de asignación. La política de INSERT queda como segunda barrera.
3. **`created_by` en un UPDATE:** el cliente no puede reescribirlo; si llega otro valor, el trigger
   conserva el anterior sin dar error. Solo se acepta que pase a `NULL`, porque eso es lo que hace el
   `ON DELETE SET NULL` de la FK al borrar a quien creó el proyecto.
4. **Cuándo se valida I-2:** al crear el proyecto y cada vez que cambia `instalador_id`. No se valida
   cuando el asignado no cambia, para que un proyecto histórico de un instalador que hoy está
   inactivo se pueda seguir editando o retrocediendo. Si el id no existe, el error lo da la FK
   (`23503`) y no I-2.
5. **Estado al insertar:** no lo restringí a `pendiente`. La especificación solo define
   transiciones, y la semilla de §7 crea proyectos en los tres estados. I-1 se sigue cumpliendo en
   cualquier caso.
6. **`updated_at` con `clock_timestamp()` y no con `now()`:** `now()` no cambia dentro de una
   transacción, y CA-17 exige que `updated_at` cambie en cada UPDATE.
7. **Longitudes de texto:** en todos los campos (no solo en `instaladores.nombre`) cuento los
   caracteres después de `btrim`. Es la opción más restrictiva, porque evita nombres que solo tienen
   espacios.
8. **Forma del correo:** uso la expresión regular mínima `^[^@\s]+@[^@\s]+\.[^@\s]+$`, escrita con
   `[:space:]`, junto con el CHECK de minúsculas. La especificación no da un patrón.
9. **`materiales.created_at` y `updated_at`:** la especificación no pone `NOT NULL` ni valor por
   defecto en esa tabla. Les puse `NOT NULL DEFAULT now()`, igual que en las demás tablas.
10. **Fila propia de un usuario inactivo:** puede seguir viendo su fila en `instaladores`, para que
    la app muestre su perfil. Según S-4 no es coordinador ni ve proyectos, porque
    `mi_instalador_id()` devuelve `NULL` y `es_coordinador()` devuelve `false`.
11. **`total` de la vista:** se queda como `bigint`, que es lo que devuelve `count()`, sin
    convertirlo.
12. **Suposición del entorno:** las funciones `security definer` pertenecen a `postgres`, que en
    Supabase tiene `BYPASSRLS`. Por eso pueden leer `instaladores` aunque la RLS esté forzada. Si en
    otro entorno el dueño no tuviera ese atributo, habría que darle una política explícita.
