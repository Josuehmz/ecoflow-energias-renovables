import { useConsulta } from '@/hooks/useConsulta'
import { listarInstaladoresAsignables } from '@/services/instaladoresService'

export function useInstaladores() {
  return useConsulta(listarInstaladoresAsignables, 0)
}
