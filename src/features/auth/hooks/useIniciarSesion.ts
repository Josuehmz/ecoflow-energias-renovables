import { useCallback, useState } from 'react'
import { iniciarSesion } from '@/services/authService'
import { mensajeDeError } from '@/services/errores'

export function useIniciarSesion() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const iniciar = useCallback(async (email: string, contrasena: string): Promise<boolean> => {
    setEnviando(true)
    setError(null)
    try {
      await iniciarSesion(email, contrasena)
      return true
    } catch (e) {
      setError(mensajeDeError(e))
      return false
    } finally {
      setEnviando(false)
    }
  }, [])

  return { iniciar, enviando, error }
}
