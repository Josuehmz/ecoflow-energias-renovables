// Graba el video demo de EcoFlow (3–5 min) navegando la app REAL contra el Supabase LOCAL y el
// Studio local. Reproducible:
//
//   supabase db reset            # deja la semilla limpia (la demo crea «Biblioteca Municipal Solar»)
//   pnpm dev                     # la app en http://127.0.0.1:5173 con .env.local del Supabase local
//   pnpm demo:grabar [carpeta]   # escribe <carpeta>/EcoFlow-demo.webm (por defecto demo/salida/)
//
// Luego se convierte a MP4 H.264 1920×1080 con ffmpeg (ver demo/README.md).
// Los rótulos en español y el cursor visible se inyectan en cada página con addInitScript.
// La contraseña es la de la semilla local (supabase/seed.sql): no es un secreto.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Locator, type Page } from 'playwright'

const APP = process.env.DEMO_APP_URL ?? 'http://127.0.0.1:5173'
const STUDIO = process.env.DEMO_STUDIO_URL ?? 'http://127.0.0.1:54323'
const CLAVE_SEMILLA = 'EcoFlow-Local-2026'
const SALIDA = process.argv[2] ?? join('demo', 'salida')
const ANCHO = 1920
const ALTO = 1080
const inicio = Date.now()

mkdirSync(SALIDA, { recursive: true })

// ---------------------------------------------------------------------------------------------
// Cursor visible y rótulos: se instalan en cada documento que abre la página.
// ---------------------------------------------------------------------------------------------
const ESCENA = `
(() => {
  const instalar = () => {
    if (document.getElementById('demo-cursor')) return
    const estilo = document.createElement('style')
    estilo.textContent = \`
      #demo-cursor { position: fixed; z-index: 2147483647; width: 26px; height: 26px; margin: -13px 0 0 -13px;
        border-radius: 50%; border: 3px solid #e11d48; background: rgba(225,29,72,.18); pointer-events: none;
        transition: transform .12s ease; left: -50px; top: -50px; }
      #demo-cursor.pulsando { transform: scale(.6); background: rgba(225,29,72,.5); }
      #demo-rotulo { position: fixed; z-index: 2147483646; left: 50%; bottom: 36px; transform: translateX(-50%);
        max-width: 1500px; padding: 18px 30px; border-radius: 16px; background: rgba(15,23,42,.88); color: #fff;
        font: 500 28px/1.35 system-ui, 'Segoe UI', sans-serif; text-align: center; pointer-events: none;
        box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      #demo-rotulo:empty { display: none; }
      #demo-paso { position: fixed; z-index: 2147483646; right: 28px; top: 20px; padding: 8px 16px; border-radius: 999px;
        background: #047857; color: #fff; font: 600 20px system-ui, 'Segoe UI', sans-serif; pointer-events: none; }
      #demo-paso:empty { display: none; }
      .demo-resalte { outline: 4px solid #f59e0b !important; outline-offset: 4px; border-radius: 12px; }
    \`
    document.head.appendChild(estilo)
    const cursor = document.createElement('div'); cursor.id = 'demo-cursor'
    const rotulo = document.createElement('div'); rotulo.id = 'demo-rotulo'
    const paso = document.createElement('div'); paso.id = 'demo-paso'
    document.body.append(cursor, rotulo, paso)
    document.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px' }, true)
    document.addEventListener('mousedown', () => cursor.classList.add('pulsando'), true)
    document.addEventListener('mouseup', () => cursor.classList.remove('pulsando'), true)
  }
  if (document.body) instalar(); else document.addEventListener('DOMContentLoaded', instalar)
})()
`

let rotuloActual = ''
let pasoActual = ''

async function aplicarRotulos(pagina: Page): Promise<void> {
  await pagina.evaluate(
    ([texto, paso]) => {
      const r = document.getElementById('demo-rotulo')
      const p = document.getElementById('demo-paso')
      if (r) r.textContent = texto ?? ''
      if (p) p.textContent = paso ?? ''
    },
    [rotuloActual, pasoActual],
  )
}

async function rotulo(pagina: Page, texto: string, ms = 0): Promise<void> {
  rotuloActual = texto
  await aplicarRotulos(pagina)
  if (ms > 0) await pagina.waitForTimeout(ms)
}

async function paso(pagina: Page, texto: string): Promise<void> {
  pasoActual = texto
  await aplicarRotulos(pagina)
}

async function ir(pagina: Page, url: string): Promise<void> {
  await pagina.goto(url)
  await pagina.waitForLoadState('domcontentloaded')
  await aplicarRotulos(pagina)
}

/** Mueve el cursor visible hasta el elemento, espera un instante y hace clic. */
async function clic(pagina: Page, objetivo: Locator): Promise<void> {
  await objetivo.scrollIntoViewIfNeeded()
  const caja = await objetivo.boundingBox()
  if (caja) {
    await pagina.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2, { steps: 28 })
    await pagina.waitForTimeout(350)
  }
  await objetivo.click()
}

async function escribir(pagina: Page, campo: Locator, texto: string): Promise<void> {
  await clic(pagina, campo)
  await campo.pressSequentially(texto, { delay: 55 })
}

async function resaltar(objetivo: Locator, ms: number): Promise<void> {
  await objetivo.evaluate((el) => el.classList.add('demo-resalte'))
  await objetivo.page().waitForTimeout(ms)
  await objetivo.evaluate((el) => el.classList.remove('demo-resalte'))
}

async function entrar(pagina: Page, email: string): Promise<void> {
  await escribir(pagina, pagina.getByLabel('Correo'), email)
  await clic(pagina, pagina.getByLabel('Contraseña'))
  await pagina.getByLabel('Contraseña').pressSequentially(CLAVE_SEMILLA, { delay: 40 })
  await clic(pagina, pagina.getByRole('button', { name: 'Entrar' }))
  await pagina.getByRole('heading', { name: 'Tablero de proyectos' }).waitFor()
  await pagina.getByRole('region', { name: 'Columna Pendiente' }).locator('[data-proyecto]').first().waitFor()
  await aplicarRotulos(pagina)
}

async function salir(pagina: Page): Promise<void> {
  await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await pagina.waitForTimeout(600)
  await clic(pagina, pagina.getByRole('button', { name: 'Salir' }))
  await pagina.getByRole('button', { name: 'Entrar' }).waitFor()
  await aplicarRotulos(pagina)
}

function tarjeta(pagina: Page, nombre: string): Locator {
  return pagina.locator(`[data-proyecto="${nombre}"]`)
}

// ---------------------------------------------------------------------------------------------
// Pantallas de título y cierre (HTML generado; el cierre lee el repositorio y la evidencia).
// ---------------------------------------------------------------------------------------------
function pantalla(titulo: string, cuerpo: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 0 140px;
      background: linear-gradient(135deg, #064e3b, #0f172a); color: #f8fafc; font-family: system-ui, 'Segoe UI', sans-serif; }
    h1 { font-size: 64px; margin: 0 0 16px; } h2 { font-size: 30px; font-weight: 500; color: #a7f3d0; margin: 0 0 40px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    pre { font: 21px/1.45 Consolas, monospace; background: rgba(255,255,255,.06); padding: 24px; border-radius: 16px; margin: 0; white-space: pre; }
    li { font-size: 26px; margin: 10px 0; } .ok { color: #6ee7b7; font-weight: 600; }
  </style></head><body><h1>${titulo}</h1>${cuerpo}</body></html>`
}

function evidencia(): string[] {
  const leer = (ruta: string): string => {
    try {
      return readFileSync(ruta, 'utf8')
    } catch {
      return ''
    }
  }
  const pgtap = /Files=1, Tests=(\d+)[\s\S]*?Result: PASS/.exec(leer('docs/evidencia/rls/verificacion-final.txt'))
  const api = /(\d+) de (\d+) comprobaciones correctas/.exec(leer('docs/evidencia/rls/api-sesiones-reales.txt'))
  const vitest = /Tests\s+(\d+) passed \((\d+)\)/.exec(leer('docs/evidencia/front/verificacion-final.txt'))
  return [
    pgtap ? `<span class="ok">pgTAP ${pgtap[1]} de ${pgtap[1]}</span> · RLS, CHECK, FK y transiciones (supabase test db)` : 'pgTAP: sin evidencia',
    api ? `<span class="ok">API ${api[1]} de ${api[2]}</span> · sesiones reales de la semilla por PostgREST` : 'API: sin evidencia',
    vitest ? `<span class="ok">Vitest ${vitest[1]} de ${vitest[2]}</span> · formulario, hooks y errores` : 'Vitest: sin evidencia',
    '<span class="ok">tsc -b, oxlint y build en verde</span> · tipos generados sin diferencias',
  ]
}

function arbol(): string {
  const archivos = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const carpetas = new Map<string, number>()
  for (const archivo of archivos) {
    const partes = archivo.split('/')
    const clave = partes.length > 2 ? `${partes[0]}/${partes[1]}/` : partes.length === 2 ? `${partes[0]}/` : archivo
    carpetas.set(clave, (carpetas.get(clave) ?? 0) + 1)
  }
  const interesantes = [
    'docs/', 'supabase/migrations/', 'supabase/tests/', 'supabase/seed.sql', 'src/features/', 'src/services/',
    'src/hooks/', 'src/types/', 'src/components/', 'bitacora/', 'herramientas/', 'demo/', 'README.md',
  ]
  return interesantes
    .map((clave) => {
      const n = [...carpetas.entries()].filter(([c]) => c === clave || c.startsWith(clave)).reduce((s, [, v]) => s + v, 0)
      return `${clave.padEnd(24)} ${n === 1 ? '1 archivo' : `${n} archivos`}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------------------------
// Guion
// ---------------------------------------------------------------------------------------------
const navegador = await chromium.launch({ channel: process.env.DEMO_CHANNEL ?? 'chrome' })

// Calentamiento sin grabar: Vite compila los módulos y el Studio carga sus recursos, para que el
// video no muestre pantallas en blanco mientras tanto.
{
  const previo = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO } })
  const pagina = await previo.newPage()
  await pagina.goto(APP)
  await pagina.getByRole('button', { name: 'Entrar' }).waitFor({ timeout: 60000 })
  for (const ruta of ['editor', 'database/schemas?schema=public', 'database/policies?schema=public']) {
    await pagina.goto(`${STUDIO}/project/default/${ruta}`)
    await pagina.waitForLoadState('networkidle').catch(() => undefined)
  }
  await previo.close()
}

const contexto = await navegador.newContext({
  viewport: { width: ANCHO, height: ALTO },
  recordVideo: { dir: SALIDA, size: { width: ANCHO, height: ALTO } },
  locale: 'es-CO',
})
await contexto.addInitScript(ESCENA)
const p = await contexto.newPage()

try {
  // 0. Título --------------------------------------------------------------------------------
  await p.setContent(
    pantalla(
      'EcoFlow · Gestión de proyectos solares',
      `<h2>Proyecto Final Integrador «El Arquitecto IA» · React + TypeScript + Supabase (local)</h2>
       <ul><li>Especificación técnica escrita antes del código</li><li>Esquema con FK, CHECK y RLS forzada</li>
       <li>Regla de transición de estados en la base</li><li>Tipos TypeScript generados del esquema</li></ul>`,
    ),
  )
  await p.waitForTimeout(9000)

  // 1. Login de la coordinadora ---------------------------------------------------------------
  await ir(p, APP)
  await paso(p, '1 · Coordinadora')
  await rotulo(p, 'Inicio de sesión con Supabase Auth: la coordinadora de la semilla local.', 1500)
  await entrar(p, 'laura.coordinadora@ecoflow.test')
  await rotulo(p, 'El tablero muestra los proyectos por estado: Pendiente, En progreso y Completado.', 4500)
  await resaltar(p.getByRole('region', { name: 'Resumen por estado' }), 4500)
  await rotulo(p, 'Los conteos salen de una vista SQL con security_invoker: respetan la RLS de quien consulta.', 5500)
  await p.mouse.wheel(0, 500)
  await rotulo(p, 'La coordinadora ve los 9 proyectos de la empresa, de todos los instaladores.', 5000)
  await p.mouse.wheel(0, -500)
  await p.waitForTimeout(800)

  // 2. Formulario con errores --------------------------------------------------------------------
  await paso(p, '2 · Nuevo proyecto')
  await clic(p, p.getByRole('button', { name: 'Nuevo proyecto' }))
  await rotulo(p, 'Solo el coordinador ve «Nuevo proyecto». El formulario valida con zod antes de enviar.', 3500)
  await clic(p, p.getByRole('button', { name: 'Crear proyecto' }))
  await rotulo(p, 'Enviado vacío: cada campo muestra su mensaje y no se hace ninguna petición a Supabase.', 6000)
  await escribir(p, p.getByLabel('Nombre del proyecto'), 'Biblioteca Municipal Solar')
  await escribir(p, p.getByLabel('Cliente'), 'Alcaldía de Cajicá')
  await escribir(p, p.getByLabel('Dirección'), 'Carrera 4 # 2-15')
  await escribir(p, p.getByLabel('Ciudad'), 'Cajicá')
  await escribir(p, p.getByLabel('Capacidad (kWp)'), '0')
  await escribir(p, p.getByLabel('Número de paneles'), '42')
  await clic(p, p.getByLabel('Fecha de inicio'))
  await p.getByLabel('Fecha de inicio').fill('2027-02-01')
  await clic(p, p.getByLabel('Fecha de fin (opcional)'))
  await p.getByLabel('Fecha de fin (opcional)').fill('2027-01-15')
  await clic(p, p.getByRole('button', { name: 'Crear proyecto' }))
  await rotulo(p, 'Capacidad 0 kWp y fecha de fin anterior al inicio: las mismas reglas que los CHECK de la base.', 6500)

  // 3. Creación correcta ------------------------------------------------------------------------
  await p.getByLabel('Capacidad (kWp)').fill('')
  await escribir(p, p.getByLabel('Capacidad (kWp)'), '18,5')
  await clic(p, p.getByLabel('Fecha de fin (opcional)'))
  await p.getByLabel('Fecha de fin (opcional)').fill('2027-03-15')
  await clic(p, p.getByLabel('Instalador asignado (opcional)'))
  await p.getByLabel('Instalador asignado (opcional)').selectOption({ label: 'Andrés Ruiz · Instalación residencial' })
  await rotulo(p, 'Datos corregidos y proyecto asignado a Andrés (instalador activo).', 3000)
  await clic(p, p.getByRole('button', { name: 'Crear proyecto' }))
  await p.getByText('Proyecto «Biblioteca Municipal Solar» creado como Pendiente.').waitFor()
  await rotulo(p, 'Creado: nace «Pendiente» y created_by lo pone la base. El conteo de Pendiente sube de 4 a 5.', 5500)
  const nueva = tarjeta(p, 'Biblioteca Municipal Solar')
  await nueva.scrollIntoViewIfNeeded()
  await rotulo(p, 'El proyecto nuevo aparece en la columna Pendiente.', 0)
  await resaltar(nueva, 5000)
  await salir(p)

  // 4. Instalador: solo lo suyo ------------------------------------------------------------------
  await paso(p, '3 · Instalador')
  await rotulo(p, 'Ahora entra Andrés, instalador. La misma consulta, otra sesión: la RLS filtra en la base.', 2000)
  await entrar(p, 'andres.instalador@ecoflow.test')
  await rotulo(p, 'Andrés ve solo sus 4 proyectos asignados (incluido el que acaba de crear la coordinadora).', 6500)
  await rotulo(p, 'Ningún filtro en React: la política proyectos_select solo devuelve filas con su instalador_id.', 5500)

  const biblioteca = tarjeta(p, 'Biblioteca Municipal Solar')
  await biblioteca.scrollIntoViewIfNeeded()
  await rotulo(p, 'Cambio de estado permitido: Pendiente → En progreso (avance de un paso del asignado).', 2500)
  await clic(p, biblioteca.getByRole('button', { name: 'Cambiar estado' }))
  await p.getByRole('region', { name: 'Columna En progreso' }).locator('[data-proyecto="Biblioteca Municipal Solar"]').waitFor()
  await p.waitForTimeout(800)
  await resaltar(tarjeta(p, 'Biblioteca Municipal Solar'), 4000)

  // 5. Transición ilegal --------------------------------------------------------------------------
  await paso(p, '4 · Regla de estados')
  const espiga = tarjeta(p, 'Autoconsumo Panadería La Espiga')
  await espiga.scrollIntoViewIfNeeded()
  await rotulo(p, 'Intento ilegal: devolver «Panadería La Espiga» de En progreso a Pendiente.', 2000)
  await clic(p, espiga.getByLabel(/Nuevo estado de/))
  await espiga.getByLabel(/Nuevo estado de/).selectOption('pendiente')
  await p.waitForTimeout(800)
  await clic(p, espiga.getByRole('button', { name: 'Cambiar estado' }))
  await espiga.getByText(/Transición no permitida/).waitFor()
  await rotulo(p, 'Rechazado por el trigger de PostgreSQL (P0001): solo un coordinador puede retroceder. React solo muestra el mensaje.', 8000)
  await resaltar(espiga, 3000)
  await salir(p)

  // 6. Studio: tabla y registro nuevo ---------------------------------------------------------
  await paso(p, '5 · Supabase Studio')
  await ir(p, `${STUDIO}/project/default/editor`)
  await rotulo(p, 'Consola de Supabase (Studio local): editor de tablas del esquema public.', 0)
  await p.getByText('proyectos', { exact: true }).first().waitFor({ timeout: 30000 })
  await p.waitForTimeout(2500)
  await clic(p, p.getByText('proyectos', { exact: true }).first())
  await p.getByText('Biblioteca Municipal Solar').first().waitFor({ timeout: 30000 })
  const banner = p.getByRole('button', { name: 'Close banner' })
  if (await banner.isVisible().catch(() => false)) await clic(p, banner)
  await rotulo(p, 'Tabla proyectos: el registro «Biblioteca Municipal Solar» quedó guardado en PostgreSQL (Alcaldía de Cajicá, 18,5 kWp, 42 paneles).', 0)
  await resaltar(p.getByText('Biblioteca Municipal Solar').first(), 6000)

  // 7. Studio: relaciones ------------------------------------------------------------------------
  rotuloActual = 'Diagrama del esquema public en el Studio (Schema Visualizer).'
  await ir(p, `${STUDIO}/project/default/database/schemas?schema=public`)
  await p.getByText('proyecto_materiales').first().waitFor({ timeout: 30000 })
  await p.waitForTimeout(1500)
  const autoLayout = p.getByRole('button', { name: 'Auto layout' })
  if (await autoLayout.isVisible()) {
    await clic(p, autoLayout)
    const aplicar = p.getByRole('button', { name: 'Apply' })
    if (await aplicar.isVisible().catch(() => false)) await clic(p, aplicar)
    await p.waitForTimeout(1500)
  }
  await rotulo(p, 'Relaciones: proyectos → instaladores (RESTRICT y SET NULL), N:M con materiales por proyecto_materiales.', 9000)

  // 8. Studio: políticas RLS ----------------------------------------------------------------------
  rotuloActual = 'Políticas RLS: una por operación y tabla, solo para authenticated. anon no tiene ningún privilegio.'
  await ir(p, `${STUDIO}/project/default/database/policies?schema=public`)
  await p.getByText('proyectos_select').first().waitFor({ timeout: 30000 })
  await aplicarRotulos(p)
  await p.waitForTimeout(6000)
  await p.getByText('proyectos_select').first().scrollIntoViewIfNeeded()
  await p.waitForTimeout(800)
  await rotulo(p, 'proyectos: el asignado ve y avanza lo suyo; el coordinador hace CRUD completo (funciones security definer).', 7000)

  // 9. Cierre ---------------------------------------------------------------------------------
  rotuloActual = ''
  pasoActual = ''
  await p.setContent(
    pantalla(
      'Repositorio y documentos',
      `<div class="cols"><pre>${arbol()}</pre><div><ul>${evidencia().map((l) => `<li>${l}</li>`).join('')}</ul>
       <ul><li>docs/ESPECIFICACION-TECNICA.md · prompt maestro</li><li>docs/ARQUITECTURA.md (+ PDF) · diagrama ER</li>
       <li>docs/PROMPTS.md · 5 prompts, v1 → v5</li><li>docs/CASO-IA-PROBLEMA-COMPLEJO.md</li></ul></div></div>`,
    ),
  )
  await p.waitForTimeout(14000)
} finally {
  const video = p.video()
  await contexto.close()
  await navegador.close()
  if (video) {
    const destino = join(SALIDA, 'EcoFlow-demo.webm')
    renameSync(await video.path(), destino)
    console.log(`Video: ${destino} (${Math.round((Date.now() - inicio) / 1000)} s de guion)`)
  }
}
