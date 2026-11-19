import { useConsulta } from '@/hooks/useConsulta'
import { obtenerResumen } from '@/services/proyectosService'

export function useResumen(version: number) {
  return useConsulta(obtenerResumen, version)
}
