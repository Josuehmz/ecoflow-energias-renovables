// Pruebas de RLS por la API REAL (PostgREST + GoTrue) con sesiones reales de la semilla.
// Complementa las 67 pruebas pgTAP: aquí el JWT lo emite Auth y la consulta pasa por PostgREST,
// igual que desde el navegador.
//   bash herramientas/con-supabase-local.sh node herramientas/probar-rls-api.mjs
// Lee SUPABASE_URL y SUPABASE_ANON_KEY del entorno (no los imprime). Pensado para correr justo
// después de `supabase db reset` (modifica datos: crea un proyecto y cambia dos estados).
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
if (!URL || !ANON) {
  console.error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY (usa herramientas/con-supabase-local.sh).')
  process.exit(2)
}
const CLAVE_SEMILLA = 'EcoFlow-Local-2026' // contraseña de los usuarios de supabase/seed.sql (solo local)
const P = (n) => `c0000000-0000-4000-8000-00000000000${n}`

let fallos = 0
let total = 0
function comprobar(condicion, descripcion, detalle = '') {
  total += 1
  if (!condicion) fallos += 1
  console.log(`${condicion ? 'ok' : 'FALLA'} ${total} - ${descripcion}${detalle ? `  [${detalle}]` : ''}`)
}

const nuevo = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
async function sesion(email) {
  const c = nuevo()
  const { data, error } = await c.auth.signInWithPassword({ email, password: CLAVE_SEMILLA })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  console.log(`# sesión real de ${email} (user ${data.user.id})`)
  return c
}
async function resumen(c) {
  const { data } = await c.from('resumen_proyectos_por_estado').select('estado, total')
  return Object.fromEntries((data ?? []).map((f) => [f.estado, f.total]))
}

// anon
const anon = nuevo()
{
  const { data, error } = await anon.from('proyectos').select('id')
  comprobar(error?.code === '42501' && data === null, 'anon no lee proyectos', error?.code ?? 'sin error')
  const r = await anon.from('materiales').select('id')
  comprobar(r.error?.code === '42501', 'anon no lee materiales', r.error?.code ?? 'sin error')
}

// Instalador A
const a = await sesion('andres.instalador@ecoflow.test')
{
  const { data } = await a.from('proyectos').select('id, nombre')
  comprobar(data?.length === 3, 'A ve exactamente 3 proyectos', (data ?? []).map((p) => p.nombre).join(' | '))
  const ajeno = await a.from('proyectos').select('id').eq('id', P(4))
  comprobar(ajeno.data?.length === 0, 'A no ve el proyecto 4 de B (lista vacía, sin error)')
  const upd = await a.from('proyectos').update({ estado: 'completado' }).eq('id', P(4)).select()
  comprobar(upd.data?.length === 0 && !upd.error, 'A no modifica el proyecto de B (0 filas)')
  const ins = await a.from('proyectos').insert({ nombre: 'Intruso', cliente: 'X', direccion: 'Calle 1 # 1-1', ciudad: 'Bogotá', capacidad_kwp: 5, numero_paneles: 10, fecha_inicio: '2027-01-01' })
  comprobar(ins.error?.code === '42501', 'A no crea proyectos', ins.error?.message ?? 'sin error')
  const avance = await a.from('proyectos').update({ estado: 'en_progreso' }).eq('id', P(3)).select('estado').single()
  comprobar(avance.data?.estado === 'en_progreso', 'A avanza su proyecto 3 a en_progreso', avance.error?.message ?? '')
  const atras = await a.from('proyectos').update({ estado: 'pendiente' }).eq('id', P(2)).select()
  comprobar(atras.error?.code === 'P0001', 'A no retrocede en_progreso → pendiente', atras.error?.message ?? 'sin error')
  const otraColumna = await a.from('proyectos').update({ cliente: 'Otro' }).eq('id', P(2)).select()
  comprobar(otraColumna.error?.code === '42501', 'A no cambia el cliente', otraColumna.error?.message ?? 'sin error')
  const r = await resumen(a)
  comprobar(r.pendiente === 0 && r.en_progreso === 2 && r.completado === 1, 'resumen de A solo con lo suyo', JSON.stringify(r))
}

// Instalador B
const b = await sesion('beatriz.instaladora@ecoflow.test')
{
  const { data } = await b.from('proyectos').select('id')
  comprobar(data?.length === 4, 'B ve exactamente 4 proyectos')
  const salto = await b.from('proyectos').update({ estado: 'completado' }).eq('id', P(5)).select()
  comprobar(salto.error?.code === 'P0001', 'B no salta pendiente → completado', salto.error?.message ?? 'sin error')
  const pm = await b.from('proyecto_materiales').select('proyecto_id')
  comprobar(pm.data?.length === 5, 'B ve solo los 5 consumos de sus proyectos')
}

// Coordinadora
const c = await sesion('laura.coordinadora@ecoflow.test')
{
  const { data } = await c.from('proyectos').select('id')
  comprobar(data?.length === 9, 'la coordinadora ve los 9 proyectos')
  const creado = await c
    .from('proyectos')
    .insert({ nombre: 'Prueba API', cliente: 'Cliente API', direccion: 'Calle 2 # 3-4', ciudad: 'Bogotá', capacidad_kwp: 7.5, numero_paneles: 16, fecha_inicio: '2027-05-01', instalador_id: 'b3333333-3333-4333-8333-333333333333' })
    .select('estado, created_by')
    .single()
  comprobar(
    creado.data?.estado === 'pendiente' && creado.data?.created_by === 'b1111111-1111-4111-8111-111111111111',
    'la coordinadora crea; nace pendiente y created_by lo pone la base',
    JSON.stringify(creado.data ?? creado.error),
  )
  const conEstado = await c.from('proyectos').insert({ nombre: 'Nace completado', cliente: 'X', direccion: 'Calle 1 # 1-1', ciudad: 'Bogotá', capacidad_kwp: 5, numero_paneles: 10, fecha_inicio: '2027-01-01', estado: 'completado' })
  comprobar(conEstado.error?.code === '42501', 'ni la coordinadora crea un proyecto ya completado (T-6)', conEstado.error?.message ?? 'sin error')
  const reabrir = await c.from('proyectos').update({ estado: 'en_progreso' }).eq('id', P(1)).select('estado').single()
  comprobar(reabrir.data?.estado === 'en_progreso', 'la coordinadora reabre un completado (retroceso)')
  const invalido = await c.from('proyectos').insert({ nombre: 'Cero', cliente: 'X', direccion: 'Calle 1 # 1-1', ciudad: 'Bogotá', capacidad_kwp: 0, numero_paneles: 10, fecha_inicio: '2027-01-01' })
  comprobar(invalido.error?.code === '23514', 'CHECK: capacidad 0 rechazada por la base', invalido.error?.message ?? 'sin error')
}

// Inactivo
const i = await sesion('carlos.inactivo@ecoflow.test')
{
  const { data } = await i.from('proyectos').select('id')
  comprobar(data?.length === 0, 'el instalador inactivo no ve proyectos (ni su historia)')
}

console.log(`\n${total - fallos} de ${total} comprobaciones correctas`)
process.exit(fallos === 0 ? 0 : 1)
