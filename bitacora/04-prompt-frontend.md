# Prompt 04 — Frontend React por features (datos, hooks, formulario y tablero)

**Objetivo del paso:** construir el frontend completo dentro del contrato de la especificación (§5)
y de la base ya verificada (67 de 67 pruebas). El prompt fija la arquitectura y los estados que la
interfaz debe mostrar; no deja a la IA elegir librerías ni estructura.

**Quién respondió:** el asistente de la sesión principal (límite de subagentes agotado, ver
[03-prompt-tipos.md](03-prompt-tipos.md)). La respuesta se guardó en `v4-front/` y se registró en
git antes de copiarla a `src/` y verificarla con `herramientas/verificar-front.sh`.

## Prompt literal

```text
[Contexto adjunto: docs/ESPECIFICACION-TECNICA.md (1.4); src/types/database.types.ts (CLI);
 src/types/dominio.ts y src/features/proyectos/proyectoSchema.ts (v3, ya verificados);
 los componentes shadcn/ui instalados en src/components/ui (button, card, input, label, badge,
 alert, skeleton, native-select, separator); .oxlintrc.json con las reglas de capas]

Actúa con el rol de la sección 0 de la especificación.

Escribe el frontend de EcoFlow (Vite 8 + React 19 + TypeScript 7 estricto + Tailwind 4 + shadcn/ui,
@supabase/supabase-js 2.119, react-hook-form 7 + zod 4 con @hookform/resolvers 7).

Arquitectura obligatoria (la hace cumplir oxlint):
- src/lib/supabase.ts: único createClient<Database>. Si faltan VITE_SUPABASE_URL o
  VITE_SUPABASE_ANON_KEY, la app muestra cómo configurarlas en vez de romperse. Si la clave es una
  service_role (JWT con role service_role o prefijo sb_secret_), se niega a crear el cliente.
- src/services/: authService, perfilService, proyectosService, instaladoresService y errores.ts
  (traduce PostgrestError/AuthError a un mensaje en español; los mensajes P0001 y «Solo un
  coordinador…» del trigger se muestran tal cual). Nadie más importa src/lib/supabase.
- src/features/auth: useSesion (getSession + onAuthStateChange, sin parpadeo), useIniciarSesion,
  usePerfil; LoginPage con formulario validado.
- src/features/proyectos: useProyectos, useCrearProyecto, useCambiarEstado, useInstaladores;
  FormularioProyecto (zodResolver con proyectoSchema, un mensaje bajo cada campo, botón
  deshabilitado mientras envía, error de Supabase visible arriba del botón); TarjetaProyecto;
  CambioEstado (elige el estado destino; la regla de §4 NO se duplica en React: se envía y, si la
  base la rechaza, se muestra su mensaje en la tarjeta).
- src/features/dashboard: useResumen (vista resumen_proyectos_por_estado), DashboardPage,
  ResumenEstados (conteo por estado) y TableroProyectos (tres columnas Pendiente / En progreso /
  Completado).
- Los componentes de presentación reciben datos por props; solo las páginas usan hooks.
- Estados visibles: carga (skeleton), vacío (por columna y global), error con «Reintentar».
- Solo el coordinador ve «Nuevo proyecto». El embed del instalador nombra la FK
  (instaladores!proyectos_instalador_id_fkey), porque proyectos tiene dos FK a instaladores.
- Tras crear un proyecto o cambiar un estado, el tablero y el conteo se recargan.

Pruebas (Vitest 5 + Testing Library, happy-dom, sin globals; los servicios se mockean con vi.mock):
proyectoSchema, FormularioProyecto (no envía si es inválido, muestra mensajes por campo, envía los
valores convertidos, muestra el error del servidor), los hooks useProyectos, useCrearProyecto,
useCambiarEstado y useSesion (carga → datos, error, recargar), errores.ts y el tablero vacío.

Sin `any`, sin `as` para tapar errores de tipo, sin comentarios de relleno. Archivos completos con
su ruta.
```

## Respuesta y verificación

- Respuesta literal: [v4-front/respuesta.md](v4-front/respuesta.md)
- Código propuesto sin editar: [v4-front/src/](v4-front/src/)
- Verificación (tsc, oxlint, Vitest, build): [v4-front/verificacion.txt](v4-front/verificacion.txt)
