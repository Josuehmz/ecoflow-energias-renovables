# Respuesta al prompt 04 — frontend por features

Código completo en [src/](src/) (43 archivos, rutas relativas a `src/`). Resumen de las decisiones:

## Capas

| Capa | Archivos | Puede importar |
|---|---|---|
| Cliente | `lib/supabase.ts` | supabase-js, `types/` |
| Servicios | `services/*.ts` | `lib/supabase`, `types/`, `services/errores` |
| Hooks | `hooks/useConsulta.ts`, `features/*/hooks/*` | `services/`, `types/` |
| Páginas (contenedores) | `features/auth/LoginPage`, `AreaPrivada`, `features/dashboard/DashboardPage`, `features/proyectos/NuevoProyectoPanel` | hooks y componentes |
| Presentación | `components/`, `features/*/components/*` | `components/ui`, `types/` (solo props) |

- `useConsulta(cargar, version)` es el único lugar con la lógica de carga (cargando → listo/error,
  `reintentar`, descarte de respuestas tardías con la bandera `activo`). `useProyectos`, `useResumen`,
  `useInstaladores` y `usePerfil` lo componen. La función `cargar` es estable (función del servicio o
  `useCallback`) para no recargar en cada render.
- `EstadoCarga<T>` es una unión discriminada: no existe «cargando y con error a la vez».
- Tras crear o cambiar un estado, `DashboardPage` sube `version` y el tablero y el conteo recargan.

## Sesión

`useSesion` se suscribe a `onAuthStateChange`; ese evento emite `INITIAL_SESSION` con la sesión que
supabase-js recupera de `localStorage`, así que no se llama a `getSession()` aparte (lo que pedía el
prompt se cumple con el evento inicial y evita una carrera entre las dos fuentes). Arranca en
`cargando`, por eso el login no parpadea al recargar con sesión.

## Formulario

`useForm<ProyectoFormulario, unknown, ProyectoValidado>` con `zodResolver(proyectoSchema)`: el
formulario trabaja con texto y `handleSubmit` entrega los valores ya convertidos (números, `null`).
Cada campo tiene su mensaje con `role="alert"`, `aria-invalid` y `aria-describedby`. El error del
servidor se muestra arriba del botón.

## Cambio de estado

`CambioEstado` ofrece los otros dos estados y envía. La regla §4 no está en React: si la base la
rechaza, `useCambiarEstado` guarda su mensaje (`Transición no permitida: …`) en `errores[id]` y la
tarjeta lo muestra. Así la interfaz no puede contradecir a la base.

## Seguridad en el cliente

`lib/supabase.ts` se niega a crear el cliente si `VITE_SUPABASE_ANON_KEY` es una clave
`service_role` (prefijo `sb_secret_` o JWT con `role: service_role`) y la app explica qué falta en
vez de romperse.

## Pruebas (8 archivos)

`proyectoSchema`, `FormularioProyecto`, `useProyectos`, `useCrearProyecto`, `useCambiarEstado`,
`useSesion`, `errores` y `TableroProyectos`. Los servicios se reemplazan con `vi.mock`; los datos de
prueba están en `test/fixtures.ts` y están tipados con los tipos de dominio (si el esquema cambia,
las pruebas dejan de compilar).

## No verificado al escribir

No ejecuté tsc, oxlint, Vitest ni el build: los resultados están en `verificacion.txt`.
