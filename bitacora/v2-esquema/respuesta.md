# Respuesta v2 — corrección de I-3 y de los grants de columnas de sistema

Tu diagnóstico es correcto; lo comprobé en el SQL de v1:

1. **Fallos 4 y 46 (42501 esperado, «no exception»).** En v1 el bloque 7.2 hacía
   `grant select, insert, update, delete on table public.proyectos to authenticated`. Un grant de
   tabla incluye todas las columnas, así que `authenticated` tenía INSERT y UPDATE sobre
   `created_by`. El trigger `privado.reglas_proyectos()` luego lo pisaba en silencio
   (`new.created_by := v_mi_id` en INSERT; en UPDATE devolvía el valor viejo). Resultado: la
   sentencia terminaba bien y el cliente nunca veía un error. Leí «no se acepta del cliente» como
   «se ignora», que es justo lo que la especificación 1.2 aclara que no se quiere.
2. **Fallo 11 (la semilla pierde `created_by`).** La asignación del INSERT se hacía para cualquier
   rol, también para `postgres`. Sin sesión, `auth.uid()` es NULL, `mi_instalador_id()` devuelve
   NULL y el trigger reemplazaba el valor que la semilla escribía: los 9 proyectos quedaban en NULL.

La corrección quita la responsabilidad al trigger y la reparte entre dos mecanismos nativos:

- **Privilegios por columna**: si el cliente nombra `created_by` (en INSERT o UPDATE), PostgreSQL
  rechaza la sentencia con `42501 permission denied` antes de mirar la fila, también para el
  coordinador.
- **`DEFAULT privado.mi_instalador_id()`**: un default solo se aplica cuando la sentencia no trae la
  columna. El cliente nunca la puede traer, así que siempre recibe el instalador de la sesión
  (CA-10); la semilla (`postgres`) sí la trae y su valor se conserva.

El default se declara con `alter table … alter column created_by set default …` justo después de
crear las funciones del bloque 4, porque la tabla `proyectos` se crea antes que la función y el
cuerpo SQL de `mi_instalador_id()` necesita que `instaladores` ya exista. `authenticated` ya tenía
`usage` sobre `privado` y `execute` sobre la función, que es lo que necesita para evaluar el default.

Revisé el mismo patrón en las otras tablas: `instaladores` y `materiales` también dejaban escribir
`id`, `created_at` y `updated_at` desde el cliente (por ejemplo, fijar un `created_at` falso); las
corregí igual. `proyecto_materiales` no tiene columnas de sistema y se queda con grant de tabla.

Las políticas, los CHECK, las FK, los índices, la vista, la máquina de estados, la regla «el
asignado solo cambia `estado`» e I-2 quedan exactamente como en v1.

## Cambios respecto a v1

1. **Encabezado**: nota de v2 que resume el cambio de I-3.
2. **Comentario de `proyectos.created_by`**: describe el DEFAULT y la falta de privilegio.
3. **Bloque 4 (nuevo, al final)**: `alter table public.proyectos alter column created_by set default
   privado.mi_instalador_id();`.
4. **Bloque 5, trigger `privado.reglas_proyectos()`**:
   - se borra `new.created_by := v_mi_id;` del INSERT;
   - se borra el bloque del UPDATE que devolvía `created_by` a su valor anterior;
   - el encabezado y el `comment on function` ya no citan I-3. La variable `v_mi_id` se conserva
     porque la usa la regla T-1.
5. **Bloque 7.2, grants**: SELECT y DELETE de tabla en las cuatro tablas; INSERT y UPDATE por
   columna en `instaladores`, `proyectos` y `materiales`; `proyecto_materiales` y la vista sin cambio.
6. **Sin cambios**: tipos, tablas, restricciones, índices, `set_updated_at()`, funciones auxiliares,
   vista, RLS (enable + force), `revoke all` y las 16 políticas.

Consecuencia esperada: las pruebas 4 y 46 reciben `42501` porque falta el privilegio sobre la
columna, y la 11 encuentra los 9 proyectos de la semilla con su `created_by`. `updated_at` lo sigue
sellando el trigger, aunque `authenticated` no tenga privilegio sobre esa columna: PostgreSQL revisa
el privilegio solo para las columnas que aparecen en la sentencia, no para las que asigna un trigger
`BEFORE`, así que CA-17 no cambia.

## Justificación de cada grant

| Tabla | Grant | Justificación |
|---|---|---|
| `instaladores` | `select` (tabla) | La política deja ver la fila propia o, al coordinador, todas; leer no escribe columnas. |
| `instaladores` | `insert (user_id, nombre, email, especialidad, certificacion, rol, activo)` | El coordinador da de alta personal y su cuenta; `id`, `created_at` y `updated_at` los pone la base. |
| `instaladores` | `update (user_id, nombre, email, especialidad, certificacion, rol, activo)` | El coordinador edita datos, rol y baja lógica; las columnas de sistema no se reescriben desde el cliente. |
| `instaladores` | `delete` (tabla) | Solo el coordinador (política); la FK RESTRICT protege a quien tiene proyectos. |
| `proyectos` | `select` (tabla) | La política limita al asignado activo o al coordinador. |
| `proyectos` | `insert (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio, fecha_fin, estado, instalador_id)` | I-3: todo lo editable menos `id`, `created_by`, `created_at` y `updated_at`; `created_by` sale del DEFAULT. |
| `proyectos` | `update` (mismas 10 columnas) | I-3: nadie con sesión reescribe `created_by`, ni el coordinador; que el asignado solo cambie `estado` lo sigue imponiendo el trigger. |
| `proyectos` | `delete` (tabla) | Solo el coordinador (política); el CASCADE limpia `proyecto_materiales`. |
| `materiales` | `select` (tabla) | Cualquier autenticado ve el catálogo (política `using (true)`). |
| `materiales` | `insert (nombre, tipo, unidad, costo_unitario, stock)` | El coordinador da de alta materiales; las columnas de sistema las pone la base. |
| `materiales` | `update (nombre, tipo, unidad, costo_unitario, stock)` | El coordinador mantiene catálogo y stock, sin tocar columnas de sistema. |
| `materiales` | `delete` (tabla) | Solo el coordinador (política); la FK RESTRICT impide borrar un material en uso. |
| `proyecto_materiales` | `select, insert, update, delete` (tabla) | No tiene columnas de sistema: sus tres columnas son datos que escribe el coordinador y las filas las filtra la política. |
| `resumen_proyectos_por_estado` | `select` | Solo lectura; aplica la RLS de quien consulta (`security_invoker`). |
| `anon` | ninguno | S-2: herramienta interna; `revoke all` y no se le concede nada. |

## Un punto que dejo señalado sin cambiarlo

En `instaladores`, la especificación no dice si el coordinador puede cambiar `user_id` de una fila
existente, es decir, reasignar una persona a otra cuenta. Lo dejé con UPDATE para no tocar nada que
ya pasaba. La opción más restrictiva sería quitar `user_id` del `grant update`, porque la relación
1:1 con la cuenta se fija al dar de alta a la persona. Si la quieres, es un cambio de una línea y
conviene anotarlo antes en la especificación.
