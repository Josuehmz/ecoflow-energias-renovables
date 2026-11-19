import { useCallback, useState } from 'react'
import { mensajeDeError } from '@/services/errores'
import { crearProyecto } from '@/services/proyectosService'
import type { ProyectoValidado } from '../proyectoSchema'

/** Crea un proyecto con datos YA validados por proyectoSchema. Devuelve si lo logró. */
export function useCrearProyecto(alCrear: () => void) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const crear = useCallback(
    async (valores: ProyectoValidado): Promise<boolean> => {
      setEnviando(true)
      setError(null)
      try {
        await crearProyecto(valores)
        alCrear()
        return true
      } catch (e) {
        setError(mensajeDeError(e))
        return false
      } finally {
        setEnviando(false)
      }
    },
    [alCrear],
  )

  return { crear, enviando, error }
}
