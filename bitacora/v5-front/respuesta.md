# Respuesta al prompt 05 — correcciones puntuales sobre v4

Archivos cambiados (completos en [src/](src/)); el resto de v4 queda igual.

| # | Problema citado | Cambio | Archivo |
|---|---|---|---|
| 1 | `prefer-tag-over-role` | `<div role="status">` → `<output>` (mismo rol implícito) | `components/PantallaCarga.tsx` |
| 2 | dos issues en un campo vacío | `{ error, abort: true }` en `min` y `regex`: el primer fallo corta el resto de la cadena del campo; también en `texto()` | `features/proyectos/proyectoSchema.ts` |
| 3 | «Unknown Error» con `mockRejectedValue` | `mockRejectedValueOnce`, como en las demás pruebas | `features/proyectos/hooks/useCrearProyecto.test.tsx` |
| 4 | placeholders confundibles con datos | prefijo «Ej.:» en todos | `features/proyectos/components/FormularioProyecto.tsx` |
| 5 | destino por defecto poco natural | `destinoInicial()`: siguiente del orden, si no el anterior; `key={proyecto.estado}` en la tarjeta para que el selector se reinicie si el estado cambia sin desmontar | `CambioEstado.tsx`, `TarjetaProyecto.tsx`, prueba nueva `CambioEstado.test.tsx` |
| 6 | 23514 genérico al pasar a En progreso sin instalador | si el mensaje nombra `proyectos_estado_requiere_instalador`, «Asigna un instalador antes de pasar el proyecto a En progreso o Completado.» | `services/errores.ts` y su prueba |

Sobre el punto 3: no aislé la causa en Vitest 5 (la función se llama una vez y el rechazo queda
capturado). Se deja anotado como comportamiento observado, no como explicación.

La prueba nueva de `CambioEstado` comprueba que el componente envía `pendiente` desde `en_progreso`
sin bloquearlo: la regla vive en la base y el componente no la duplica.
