import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { escucharSesion, estadoConfiguracion, type SesionUsuario } from '@/services/authService'
import { useSesion } from './useSesion'

vi.mock('@/services/authService', () => ({ escucharSesion: vi.fn(), estadoConfiguracion: vi.fn() }))

describe('useSesion', () => {
  it('arranca en cargando y sigue a onAuthStateChange; cancela al desmontar', () => {
    vi.mocked(estadoConfiguracion).mockReturnValue({ lista: true })
    let emitir: (usuario: SesionUsuario | null) => void = () => undefined
    const cancelar = vi.fn()
    vi.mocked(escucharSesion).mockImplementation((alCambiar) => {
      emitir = alCambiar
      return cancelar
    })

    const { result, unmount } = renderHook(() => useSesion())
    expect(result.current).toEqual({ tipo: 'cargando' })

    act(() => emitir(null))
    expect(result.current).toEqual({ tipo: 'sin-sesion' })

    const usuario = { userId: 'a2222222-2222-4222-8222-222222222222', email: 'andres.instalador@ecoflow.test' }
    act(() => emitir(usuario))
    expect(result.current).toEqual({ tipo: 'con-sesion', usuario })

    unmount()
    expect(cancelar).toHaveBeenCalledTimes(1)
  })

  it('sin variables de entorno no se suscribe y explica qué falta', () => {
    vi.mocked(escucharSesion).mockClear()
    vi.mocked(estadoConfiguracion).mockReturnValue({ lista: false, mensaje: 'Faltan variables' })
    const { result } = renderHook(() => useSesion())
    expect(result.current).toEqual({ tipo: 'sin-configurar', mensaje: 'Faltan variables' })
    expect(escucharSesion).not.toHaveBeenCalled()
  })
})
