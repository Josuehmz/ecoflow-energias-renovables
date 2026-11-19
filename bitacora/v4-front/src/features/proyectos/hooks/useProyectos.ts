import { useConsulta } from '@/hooks/useConsulta'
import { listarProyectos } from '@/services/proyectosService'

/** Proyectos visibles para la sesión (la RLS decide cuáles). `version` fuerza la recarga. */
export function useProyectos(version: number) {
  return useConsulta(listarProyectos, version)
}
