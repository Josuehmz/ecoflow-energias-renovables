# EcoFlow · Gestión de proyectos de energía solar

Aplicación interna para que una startup de tecnología limpia gestione sus obras de instalación de
paneles solares: el **coordinador** planea y asigna proyectos; cada **instalador** ve solo los suyos
y avanza su estado. Proyecto Final Integrador «El Arquitecto IA» (desarrollo asistido por IA,
módulo 6), construido con **especificación primero**: React + TypeScript + Supabase.

**Documento de Arquitectura:** [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) · [PDF](docs/ARQUITECTURA.pdf)
· **Video demo:** se entrega aparte (`EcoFlow-demo.mp4`, 1920×1080); el script que lo graba está en
[demo/grabar-demo.ts](demo/grabar-demo.ts).

Todo lo que aquí se afirma se **ejecutó** contra un Supabase **local** (CLI 2.122.0 + Docker); no hay
proyecto en la nube.

## Entregables → archivo

| Entregable del enunciado | Dónde está |
|---|---|
| Esquema en Supabase: `proyectos`, `instaladores`, `materiales` (+ N:M) | [supabase/migrations/20261119025015_esquema_ecoflow.sql](supabase/migrations/20261119025015_esquema_ecoflow.sql) |
| Políticas RLS: cada instalador solo ve sus proyectos | misma migración, bloque 7 · justificación en [ARQUITECTURA §6](docs/ARQUITECTURA.md#6-seguridad-privilegios-y-rls) |
| Documento de Especificación Técnica (prompt maestro) | [docs/ESPECIFICACION-TECNICA.md](docs/ESPECIFICACION-TECNICA.md) (primer commit del repo) |
| Dashboard con estados Pendiente / En progreso / Completado | [src/features/dashboard/](src/features/dashboard/) |
| Formulario de creación validado antes de enviar | [src/features/proyectos/components/FormularioProyecto.tsx](src/features/proyectos/components/FormularioProyecto.tsx) + [proyectoSchema.ts](src/features/proyectos/proyectoSchema.ts) |
| Biblioteca de componentes (shadcn/ui + Tailwind) | [src/components/ui/](src/components/ui/) · [components.json](components.json) |
| Tipos TypeScript generados desde el esquema con ayuda de IA | [src/types/database.types.ts](src/types/database.types.ts) (`pnpm gen:types`) · [src/types/dominio.ts](src/types/dominio.ts) · [PROMPTS §03](docs/PROMPTS.md#prompt-03) |
| Cómo la IA resolvió un problema técnico complejo | [docs/CASO-IA-PROBLEMA-COMPLEJO.md](docs/CASO-IA-PROBLEMA-COMPLEJO.md) |
| Documento de Arquitectura (diagrama de BD, prompts clave, estructura) | [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) · [docs/ARQUITECTURA.pdf](docs/ARQUITECTURA.pdf) |
| Prompts clave en orden, v1 → v5 | [docs/PROMPTS.md](docs/PROMPTS.md) · literales en [bitacora/](bitacora/) |
| Video demo (3–5 min) | entregado aparte · [demo/grabar-demo.ts](demo/grabar-demo.ts) |

## Criterio de la rúbrica → dónde se demuestra

| Criterio | Evidencia |
|---|---|
| **Precisión en la arquitectura:** esquema, FK, RLS justificadas | [ARQUITECTURA §4.2 (FK y ON DELETE)](docs/ARQUITECTURA.md#42-claves-foráneas-y-on-delete), [§6.3 (cada política)](docs/ARQUITECTURA.md#63-políticas) · **67 de 67** pruebas pgTAP: [verificacion-final.txt](docs/evidencia/rls/verificacion-final.txt) · **19 de 19** por la API con sesiones reales: [api-sesiones-reales.txt](docs/evidencia/rls/api-sesiones-reales.txt) |
| **Calidad React:** modular, hooks, carga/error, TypeScript íntegro | capas en [ARQUITECTURA §3.1](docs/ARQUITECTURA.md#31-capas-del-frontend), regla de capas en oxlint y su [prueba negativa](docs/evidencia/front/regla-capas-negativa.txt) · tsc, oxlint, **Vitest 28 de 28** y build: [verificacion-final.txt](docs/evidencia/front/verificacion-final.txt) · sin `any` (regla `no-explicit-any`) |
| **Uso estratégico de IA:** especificaciones que guían, sin copia ciega | [docs/PROMPTS.md](docs/PROMPTS.md): cada respuesta medida y corregida con evidencia · [registro de cambios de la especificación](docs/ESPECIFICACION-TECNICA.md#9-registro-de-cambios) · [caso](docs/CASO-IA-PROBLEMA-COMPLEJO.md) |

## Cómo levantarlo

Requisitos: Docker Desktop encendido, [Supabase CLI](https://supabase.com/docs/guides/cli) 2.x,
Node 24 y pnpm.

```bash
# 1. Supabase local (Studio incluido en http://127.0.0.1:54323)
supabase start -x realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit
supabase db reset            # aplica la migración y carga supabase/seed.sql
supabase test db             # 67 pruebas pgTAP

# 2. Frontend
pnpm install
pnpm gen:types               # regenera src/types/database.types.ts (pnpm gen:types:check lo compara)
cp .env.example .env.local   # pega API_URL y ANON_KEY de `supabase status -o env`
pnpm dev                     # http://127.0.0.1:5173

# 3. Verificación
pnpm typecheck && pnpm lint && pnpm test && pnpm build
bash herramientas/con-supabase-local.sh node herramientas/probar-rls-api.mjs   # tras un db reset
```

Si la CLI no está en el `PATH`, los scripts aceptan la variable `SUPABASE_CLI` con su ruta.

### Usuarios de prueba (solo Supabase local)

Los crea [supabase/seed.sql](supabase/seed.sql). Contraseña de los cuatro: `EcoFlow-Local-2026`
(es una contraseña de semilla local, no un secreto).

| Correo | Rol | Qué ve |
|---|---|---|
| `laura.coordinadora@ecoflow.test` | coordinador | los 9 proyectos; crea proyectos |
| `andres.instalador@ecoflow.test` | instalador A | sus 3 proyectos (uno por estado) |
| `beatriz.instaladora@ecoflow.test` | instalador B | sus 4 proyectos |
| `carlos.inactivo@ecoflow.test` | instalador inactivo | nada (tiene un proyecto en su historia) |

## Mapa de carpetas

```text
├── docs/
│   ├── ESPECIFICACION-TECNICA.md     ← prompt maestro (v1.0 → 1.4, con registro de cambios)
│   ├── ARQUITECTURA.md / .pdf        ← diagrama ER, estructura, FK, RLS, flujo de datos, decisiones
│   ├── PROMPTS.md                    ← 5 prompts, qué falló y cómo se corrigió
│   ├── CASO-IA-PROBLEMA-COMPLEJO.md  ← created_by: la v1 de la IA, la prueba que la tumbó y la solución
│   ├── img/                          ← diagramas renderizados desde los bloques Mermaid
│   └── evidencia/                    ← cli/ (logs de la CLI), rls/ (pgTAP y API), front/ (tsc, lint, Vitest, build)
├── supabase/
│   ├── config.toml                   ← registro público desactivado, contraseña mínima 10
│   ├── migrations/                   ← una migración: tipos, tablas, triggers, vista, GRANT y RLS
│   ├── seed.sql                      ← usuarios de Auth, personal, 9 proyectos, 6 materiales
│   └── tests/database/               ← 67 pruebas pgTAP de aceptación
├── src/
│   ├── lib/supabase.ts               ← único createClient<Database>; rechaza claves service_role
│   ├── services/                     ← acceso a datos y traducción de errores
│   ├── hooks/useConsulta.ts          ← carga / listo / error / reintentar
│   ├── features/auth|proyectos|dashboard/   ← hooks, páginas y componentes por funcionalidad
│   ├── components/ui/                ← shadcn/ui
│   └── types/                        ← database.types.ts (generado) y dominio.ts (derivado)
├── bitacora/                         ← prompts literales, respuestas sin editar, verificación por versión
├── herramientas/                     ← verificar SQL y front, tipos, RLS por API, diagramas y PDF
└── demo/grabar-demo.ts               ← Playwright: graba el video contra la app y el Studio locales
```

## Ejecutado y no ejecutado

| Qué | Estado |
|---|---|
| Migración, semilla y 67 pruebas pgTAP en Supabase local | ejecutado ([log de la CLI](docs/evidencia/cli/)) |
| RLS por PostgREST con sesiones reales de los 4 usuarios | ejecutado (19 de 19) |
| tsc, oxlint, Vitest (28) y build | ejecutado |
| App en el navegador contra el Supabase local y el Studio | ejecutado (capturas en `bitacora/v4-front/capturas/` y el video) |
| Despliegue en la nube (`supabase link`, `db push`, Vercel) | **no ejecutado**: fuera del alcance; no hay credenciales |

## Seguridad

- Ninguna clave `service_role` en el front ni en el repositorio; `lib/supabase.ts` se niega a crear
  el cliente si la clave del `.env.local` es de servicio. Solo se versiona `.env.example`.
- Las claves que imprime `supabase status` (aunque sean las locales por defecto) están redactadas en
  los logs de `docs/evidencia/`.
