import { useCallback, useState } from 'react'
import { cerrarSesion } from '@/services/authService'
import { mensajeDeError } from '@/services/errores'

export function useCerrarSesion() {
  const [error, setError] = useState<string | null>(null)
  const salir = useCallback(async () => {
    try {
      await cerrarSesion()
    } catch (e) {
      setError(mensajeDeError(e))
    }
  }, [])
  return { salir, error }
}
