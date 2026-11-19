import { cliente } from '@/lib/supabase'
import type { Instalador } from '@/types/dominio'
import { traducirError } from './errores'

/** Ficha de personal del usuario de la sesión (la RLS deja ver la propia aunque esté inactiva). */
export async function obtenerPerfil(userId: string): Promise<Instalador | null> {
  const { data, error } = await cliente().from('instaladores').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw traducirError(error)
  return data
}
