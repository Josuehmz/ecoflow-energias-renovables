import { cliente } from '@/lib/supabase'
import type { Instalador } from '@/types/dominio'
import { traducirError } from './errores'

export type InstaladorAsignable = Pick<Instalador, 'id' | 'nombre' | 'especialidad'>

/** Personal al que se puede asignar un proyecto (I-2: activo y con rol instalador). */
export async function listarInstaladoresAsignables(): Promise<InstaladorAsignable[]> {
  const { data, error } = await cliente()
    .from('instaladores')
    .select('id, nombre, especialidad')
    .eq('rol', 'instalador')
    .eq('activo', true)
    .order('nombre')
  if (error) throw traducirError(error)
  return data
}
