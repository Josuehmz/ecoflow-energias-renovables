// Alias de dominio de EcoFlow. Todo sale de Database (src/types/database.types.ts, generado por la
// CLI de Supabase): si el esquema cambia y se regeneran los tipos, estos alias cambian solos.
import { Constants } from './database.types'
import type { Enums, Tables, TablesInsert } from './database.types'

export type EstadoProyecto = Enums<'estado_proyecto'>
export type RolEquipo = Enums<'rol_equipo'>

export type Proyecto = Tables<'proyectos'>
export type Instalador = Tables<'instaladores'>
export type Material = Tables<'materiales'>

/** Fila de la vista tal como la tipa la CLI: en una vista todas las columnas son `| null`. */
export type ResumenEstadoFila = Tables<'resumen_proyectos_por_estado'>

/** La misma fila después de validarla: la vista parte del enum, así que nunca trae nulos. */
export type ResumenEstado = { estado: EstadoProyecto; total: number }

/**
 * Columnas que el cliente NO puede escribir al crear un proyecto. TablesInsert<'proyectos'> las
 * permite porque el generador no conoce los GRANT por columna; la base respondería 42501.
 * `estado` se excluye por el hallazgo de la auditoría (un proyecto nuevo nace pendiente).
 */
type ColumnasQueNoEnviaElCliente = 'id' | 'created_by' | 'created_at' | 'updated_at' | 'estado'

export type NuevoProyecto = Omit<TablesInsert<'proyectos'>, ColumnasQueNoEnviaElCliente>

/** Lo que devuelve `select('*, instalador:instaladores!proyectos_instalador_id_fkey(nombre)')`. */
export type ProyectoConInstalador = Proyecto & {
  instalador: Pick<Instalador, 'nombre'> | null
}

/** Orden de la máquina de estados (§4): el mismo orden del enum en la base. */
export const ESTADOS_PROYECTO = Constants.public.Enums.estado_proyecto

export const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completado: 'Completado',
}

/** Valida una fila de la vista y le quita los null que el tipo generado admite. */
export function aResumenEstado(fila: ResumenEstadoFila): ResumenEstado | null {
  if (fila.estado === null || fila.total === null) return null
  return { estado: fila.estado, total: fila.total }
}
