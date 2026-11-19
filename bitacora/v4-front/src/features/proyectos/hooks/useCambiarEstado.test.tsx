import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cambiarEstado } from '@/services/proyectosService'
import { proyecto } from '@/test/fixtures'
import { useCambiarEstado } from './useCambiarEstado'

vi.mock('@/services/proyectosService', () => ({ cambiarEstado: vi.fn() }))

const RECHAZO = 'Transición no permitida: de «en_progreso» a «pendiente». Solo un coordinador puede retroceder el estado de un proyecto (reabrir o reprogramar).'

describe('useCambiarEstado', () => {
  beforeEach(() => vi.mocked(cambiarEstado).mockReset())

  it('muestra el mensaje de la base en el proyecto rechazado y lo limpia al reintentar con éxito', async () => {
    vi.mocked(cambiarEstado).mockRejectedValueOnce({ message: RECHAZO, code: 'P0001' })
    const alCambiar = vi.fn()
    const { result } = renderHook(() => useCambiarEstado(alCambiar))

    await act(async () => {
      await result.current.cambiar('p2', 'pendiente')
    })
    expect(result.current.errores).toEqual({ p2: RECHAZO })
    expect(alCambiar).not.toHaveBeenCalled()

    vi.mocked(cambiarEstado).mockResolvedValueOnce(proyecto({ estado: 'completado' }))
    await act(async () => {
      await result.current.cambiar('p2', 'completado')
    })
    expect(result.current.errores).toEqual({})
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(result.current.enCurso).toBeNull()
  })
})
