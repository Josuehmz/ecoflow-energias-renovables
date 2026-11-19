import { useCallback, useState } from 'react'
import { mensajeDeError } from '@/services/errores'
import { cambiarEstado } from '@/services/proyectosService'
import type { EstadoProyecto } from '@/types/dominio'

function sin(errores: Record<string, string>, id: string): Record<string, string> {
  const copia = { ...errores }
  delete copia[id]
  return copia
}

/**
 * Cambia el estado de un proyecto. La regla de transición (§4) NO se repite aquí: la decide la base
 * y, si la rechaza, su mensaje queda en `errores[id]` para mostrarlo en la tarjeta.
 */
export function useCambiarEstado(alCambiar: () => void) {
  const [enCurso, setEnCurso] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const cambiar = useCallback(
    async (id: string, estado: EstadoProyecto): Promise<boolean> => {
      setEnCurso(id)
      setErrores((actuales) => sin(actuales, id))
      try {
        await cambiarEstado(id, estado)
        alCambiar()
        return true
      } catch (e) {
        const mensaje = mensajeDeError(e)
        setErrores((actuales) => ({ ...actuales, [id]: mensaje }))
        return false
      } finally {
        setEnCurso(null)
      }
    },
    [alCambiar],
  )

  return { cambiar, enCurso, errores }
}
