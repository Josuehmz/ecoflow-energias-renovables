// Único cliente de Supabase de la app. Solo src/services/ importa este archivo (regla de oxlint).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type ClienteEcoFlow = SupabaseClient<Database>

export type Configuracion =
  | { tipo: 'lista'; cliente: ClienteEcoFlow }
  | { tipo: 'faltante'; mensaje: string }

/**
 * ¿La clave es de servicio? Las claves nuevas llevan el prefijo `sb_secret_`; las JWT antiguas
 * declaran `"role": "service_role"` en la carga. Una clave así salta la RLS: nunca va al navegador.
 */
export function esClaveDeServicio(clave: string): boolean {
  if (clave.startsWith('sb_secret_')) return true
  const partes = clave.split('.')
  const carga = partes[1]
  if (partes.length !== 3 || carga === undefined) return false
  try {
    const json: unknown = JSON.parse(atob(carga.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json === 'object' && json !== null && 'role' in json && json.role === 'service_role'
  } catch {
    return false
  }
}

function crearConfiguracion(): Configuracion {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const clave = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !clave) {
    return {
      tipo: 'faltante',
      mensaje: 'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Cópialas de `supabase status -o env` a .env.local.',
    }
  }
  if (esClaveDeServicio(clave)) {
    return {
      tipo: 'faltante',
      mensaje: 'VITE_SUPABASE_ANON_KEY contiene una clave service_role. En el navegador solo va la clave anon/publishable.',
    }
  }
  return { tipo: 'lista', cliente: createClient<Database>(url, clave) }
}

export const configuracion: Configuracion = crearConfiguracion()

export function cliente(): ClienteEcoFlow {
  if (configuracion.tipo === 'faltante') throw new Error(configuracion.mensaje)
  return configuracion.cliente
}
