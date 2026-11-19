import { useCallback } from 'react'
import { useConsulta } from '@/hooks/useConsulta'
import { obtenerPerfil } from '@/services/perfilService'

export function usePerfil(userId: string) {
  const cargar = useCallback(() => obtenerPerfil(userId), [userId])
  return useConsulta(cargar, 0)
}
