import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@/services/errores'
import type { EstadoCarga } from '@/types/estadoCarga'

/**
 * Carga datos con una función estable (`cargar` debe ser la misma entre renders: una función del
 * servicio o un useCallback). Vuelve a cargar cuando cambia `version` (tras crear o cambiar algo)
 * o al llamar a `reintentar`. Las respuestas que llegan después de desmontar se descartan.
 */
export function useConsulta<T>(cargar: () => Promise<T>, version: number) {
  const [estado, setEstado] = useState<EstadoCarga<T>>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    cargar().then(
      (datos) => {
        if (activo) setEstado({ tipo: 'listo', datos })
      },
      (error: unknown) => {
        if (activo) setEstado({ tipo: 'error', mensaje: mensajeDeError(error) })
      },
    )
    return () => {
      activo = false
    }
  }, [cargar, version, intento])

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  return { estado, reintentar }
}
