import { cliente } from '@/lib/supabase'
import {
  aResumenEstado,
  ESTADOS_PROYECTO,
  type EstadoProyecto,
  type NuevoProyecto,
  type Proyecto,
  type ProyectoConInstalador,
  type ResumenEstado,
} from '@/types/dominio'
import { traducirError } from './errores'

// proyectos tiene DOS FK a instaladores (instalador_id y created_by): el embed debe nombrar cuál.
const CON_INSTALADOR = '*, instalador:instaladores!proyectos_instalador_id_fkey(nombre)'

export async function listarProyectos(): Promise<ProyectoConInstalador[]> {
  const { data, error } = await cliente()
    .from('proyectos')
    .select(CON_INSTALADOR)
    .order('fecha_inicio', { ascending: true })
  if (error) throw traducirError(error)
  return data
}

export async function crearProyecto(nuevo: NuevoProyecto): Promise<Proyecto> {
  const { data, error } = await cliente().from('proyectos').insert(nuevo).select().single()
  if (error) throw traducirError(error)
  return data
}

export async function cambiarEstado(id: string, estado: EstadoProyecto): Promise<ProyectoConInstalador> {
  const { data, error } = await cliente()
    .from('proyectos')
    .update({ estado })
    .eq('id', id)
    .select(CON_INSTALADOR)
    .single()
  if (error) throw traducirError(error)
  return data
}

/** Conteo por estado desde la vista (respeta la RLS); siempre devuelve los tres estados en orden. */
export async function obtenerResumen(): Promise<ResumenEstado[]> {
  const { data, error } = await cliente().from('resumen_proyectos_por_estado').select('estado, total')
  if (error) throw traducirError(error)
  const filas = data.map(aResumenEstado).filter((fila): fila is ResumenEstado => fila !== null)
  return ESTADOS_PROYECTO.map((estado) => ({
    estado,
    total: filas.find((fila) => fila.estado === estado)?.total ?? 0,
  }))
}
