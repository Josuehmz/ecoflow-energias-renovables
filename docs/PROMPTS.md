# Prompts clave — de la especificación al producto (v1 → v5)

Este documento cuenta, en orden, cómo se usó la IA y cómo se mantuvo el control del diseño. Cada
prompt está **literal** en `bitacora/`, cada respuesta está **sin editar** en `bitacora/vN-*/`, y cada
una se verificó con una herramienta (pgTAP en el Supabase local, tsc, oxlint, Vitest, build, capturas
reales) antes de escribir el siguiente prompt. El historial de git sigue ese mismo orden: el prompt y
la respuesta se registran **antes** que su verificación.

## Método

1. **Especificación antes que código.** [ESPECIFICACION-TECNICA.md](ESPECIFICACION-TECNICA.md) es el
   prompt maestro: rol de la IA, modelo de datos con contratos, matriz de seguridad, máquina de
   estados, códigos de error y 20 criterios de aceptación. Es el primer commit del repositorio.
2. **Pruebas antes que SQL.** Las pruebas pgTAP de aceptación (64 al principio) se escribieron desde
   la especificación y **no** se le mostraron a la IA: eran el examen, no la guía.
3. **Cada corrección cita evidencia.** Los prompts de corrección pegan la salida literal de las
   herramientas; no dicen «mejóralo».
4. **Si la IA falla por una ambigüedad, se corrige la especificación** y queda en su registro de
   cambios (versiones 1.1 a 1.4).

**Quién respondió.** v1 y v2 las respondió un asistente aislado (un subagente que solo podía leer el
prompt y la especificación, y solo escribir en su carpeta de la bitácora). Desde el prompt 03 se agotó
el límite de subagentes de la sesión y respondió el asistente de la sesión principal, con la misma
regla: la respuesta se guarda y se registra en git antes de verificarla.

## Resumen

| # | Prompt (literal) | Respuesta | Verificación | Resultado |
|---|---|---|---|---|
| 01 | [Esquema, RLS y reglas](../bitacora/01-prompt-esquema.md) | [v1-esquema](../bitacora/v1-esquema/) | [verificacion.txt](../bitacora/v1-esquema/verificacion.txt) | 62 de 65 pruebas pgTAP |
| 02 | [Corrección del esquema](../bitacora/02-prompt-correccion-esquema.md) | [v2-esquema](../bitacora/v2-esquema/) | [verificacion.txt](../bitacora/v2-esquema/verificacion.txt) | 65 de 65 |
| 03 | [Tipos: generar y auditar](../bitacora/03-prompt-tipos.md) | [v3-tipos](../bitacora/v3-tipos/) | [verificacion.txt](../bitacora/v3-tipos/verificacion.txt) | tsc 0; hallazgo T-6 → 67 de 67 |
| 04 | [Frontend por features](../bitacora/04-prompt-frontend.md) | [v4-front](../bitacora/v4-front/) | [verificacion.txt](../bitacora/v4-front/verificacion.txt) | tsc 0, lint 1 aviso, Vitest 23 de 25, build ok |
| 05 | [Corrección del frontend](../bitacora/05-prompt-correccion-frontend.md) | [v5-front](../bitacora/v5-front/) | [verificacion.txt](../bitacora/v5-front/verificacion.txt) | tsc 0, lint 0, Vitest 28 de 28, build ok |

## Prompt 01

**Qué se pidió.** La migración SQL completa a partir de las secciones 2, 3 y 4 de la especificación,
en siete bloques en orden, con restricciones explícitas: nada fuera de la especificación,
`auth.uid()` envuelto en `(select …)`, aplicable con `supabase db reset`, archivo completo y una
lista de las decisiones donde la especificación no era explícita.

**Qué salió bien.** Tipos, tablas, CHECK, FK con el ON DELETE pedido, índices, `privado` con
funciones `security definer` y `search_path` vacío, trigger de transiciones con los SQLSTATE de la
tabla, vista con `security_invoker`, RLS habilitada y forzada, `revoke` + `grant`. 62 de 65.

**Qué salió mal.** `created_by` se resolvía sobrescribiéndolo en el trigger, con GRANT de tabla
completa. El cliente no recibía error y la semilla quedaba con el autor en `NULL` en los 9 proyectos.
Es el caso completo de [CASO-IA-PROBLEMA-COMPLEJO.md](CASO-IA-PROBLEMA-COMPLEJO.md).

**Errores propios en las pruebas (no de la IA).** Al correr las pruebas contra v1 fallaron cuatro
cosas de **la prueba**: `results_eq` sobre columnas de catálogo (`"char"` y `name`, error de
intercalación), un CTE con UPDATE dentro de una subconsulta (PostgreSQL no lo permite) y un
`ORDER BY estado` que ordenaba por el alias de texto y no por el enum. Se corrigió la prueba, no el
SQL, y el primer intento quedó guardado
([verificacion-intento-1-prueba-defectuosa.txt](../bitacora/v1-esquema/verificacion-intento-1-prueba-defectuosa.txt)).

## Prompt 02

**Antes del prompt se corrigió la especificación** (1.2): I-3 pasó de «no se acepta del cliente» a
«`authenticated` no tiene privilegio sobre la columna; intentarlo da 42501; un rol sin sesión puede
fijarlo». La v1 había leído «no se acepta» como «se ignora».

**Qué se pidió.** Corregir solo lo que fallaba, con la salida literal de pgTAP y un diagnóstico
verificable («compruébalo en tu SQL»), y revisar si el mismo patrón aparecía en otras tablas.

**Resultado.** DEFAULT `privado.mi_instalador_id()` + GRANT por columna en las tres tablas con
columnas de sistema. La IA señaló, sin aplicarlo, que el coordinador aún podía cambiar el `user_id`
de una ficha.

**Qué se ajustó a mano y por qué.**
- La prueba 43 insertaba un `id` fijo, que el propio prompt 02 había mandado prohibir: el primer
  intento dio 62 de 65 por culpa de la prueba
  ([verificacion-intento-1.txt](../bitacora/v2-esquema/verificacion-intento-1.txt)). Se escribió la
  regla I-4 en la especificación (1.3) y se ajustó la prueba.
- Se tomó la advertencia de la IA: `user_id` salió del GRANT de UPDATE (volver a enlazar una ficha
  con otra cuenta le pasaría a esa cuenta la historia ajena). Se escribió la prueba 66, se vio
  **fallar contra v2**
  ([v2-con-prueba-66](evidencia/rls/v2-con-prueba-66/verificacion.txt)) y luego pasar.

## Prompt 03

**Qué se pidió.** Los tipos no se le pidieron «de memoria»: se generaron con
`supabase gen types typescript --local` (`pnpm gen:types`) y se le pidió a la IA **auditarlos**
contra el SQL (una tabla: qué permite el tipo → qué hace la base → consecuencia para el front),
derivar los tipos de dominio sin repetir nada y escribir el esquema zod del formulario con una línea
que no compile si su salida deja de ser asignable al tipo de inserción.

**Resultado.** La auditoría señaló lo que el generador no puede saber: columnas que el tipo `Insert`
deja escribir pero la base rechaza por GRANT, la vista con todo `| null`, y que `proyectos` tiene dos
FK a `instaladores` (el embed debe nombrar la restricción). Y un **hallazgo**: `Insert.estado` era
opcional y la base lo aceptaba, así que se podía crear un proyecto ya completado, saltando la regla
T-2.

**Verificación.** tsc y oxlint en verde con los archivos de v3; una mutación (dejar el número de
paneles como texto) hace fallar la línea de comprobación de tipos, como se esperaba; la prueba T-6
falla contra la migración vigente (66 de 67), se quita `estado` del GRANT de INSERT (especificación
1.4) y pasa 67 de 67. `pnpm gen:types:check` confirma que los GRANT no cambian los tipos generados.

## Prompt 04

**Qué se pidió.** Todo el frontend con la arquitectura fijada de antemano: un único
`createClient<Database>`, servicios como única puerta a Supabase, hooks propios
(`useSesion`, `useProyectos`, `useCrearProyecto`, `useCambiarEstado`, `useResumen`…), componentes de
presentación por props, estados de carga, vacío y error visibles, formulario con zod +
react-hook-form, la regla de estados **no** duplicada en React, y las pruebas a escribir.

**Resultado.** tsc 0 y build correcto a la primera; oxlint 1 aviso de accesibilidad; Vitest 23 de 25.
Además, la app se corrió en el navegador contra el Supabase local con la coordinadora y un instalador
de la semilla ([capturas](../bitacora/v4-front/capturas/)): RLS, creación y rechazo de la transición
ilegal funcionaban, pero se vieron tres problemas que ninguna prueba detectaba.

## Prompt 05

**Qué se pidió.** Corregir solo seis cosas, cada una con su evidencia: el aviso de oxlint, los dos
fallos de Vitest (uno del esquema: dos mensajes en un mismo campo; otro de la herramienta de mocks) y
tres de las capturas (placeholders que parecían datos, el destino por defecto del selector de estado
y un mensaje genérico ante el CHECK «en progreso sin instalador»).

**Resultado.** tsc 0, oxlint 0, Vitest 28 de 28 (9 archivos), build correcto. La prueba nueva de
`CambioEstado` comprueba que el componente envía una transición ilegal sin bloquearla: la regla es de
la base.

## Uso de IA para los tipos TypeScript

| Paso | Herramienta | Por qué |
|---|---|---|
| Forma exacta de tablas, vistas, enums y relaciones | `supabase gen types typescript --local` | Sale del catálogo real; no se equivoca en nulos ni nombres |
| Lo que el generador no sabe (GRANT, triggers, RLS) | IA (prompt 03) | Una auditoría en tabla convierte esas reglas en tipos de dominio (`NuevoProyecto` omite lo que la base rechaza) |
| Que los tipos sigan al esquema | `pnpm gen:types:check` | Falla si `database.types.ts` no coincide con el esquema local |
| Que el formulario no se desalinee | línea de comprobación en `proyectoSchema.ts` | No compila si la salida de zod deja de ser asignable a `NuevoProyecto` |

## Qué demuestra este registro

- La IA escribió casi todo el SQL y el frontend, pero **no decidió el diseño**: la especificación
  fijó tablas, roles, transiciones, capas y errores, y cada respuesta se aceptó o se rechazó por una
  medición.
- Los dos defectos de seguridad más serios (autor falsificable/borrado y proyectos que nacen
  completados) los encontraron **la revisión del SQL y la auditoría de tipos**, y cada uno quedó
  como prueba automática.
- Los errores propios (pruebas mal escritas) están registrados igual que los de la IA.
