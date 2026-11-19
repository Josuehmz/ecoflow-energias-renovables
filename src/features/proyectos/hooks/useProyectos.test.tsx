import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listarProyectos } from '@/services/proyectosService'
import { proyecto } from '@/test/fixtures'
import { useProyectos } from './useProyectos'

vi.mock('@/services/proyectosService', () => ({ listarProyectos: vi.fn() }))

describe('useProyectos', () => {
  beforeEach(() => vi.mocked(listarProyectos).mockReset())

  it('pasa de cargando a listo con los proyectos', async () => {
    vi.mocked(listarProyectos).mockResolvedValue([proyecto()])
    const { result } = renderHook(() => useProyectos(0))
    expect(result.current.estado.tipo).toBe('cargando')
    await waitFor(() => expect(result.current.estado.tipo).toBe('listo'))
    expect(result.current.estado).toEqual({ tipo: 'listo', datos: [proyecto()] })
  })

  it('expone el error traducido y reintenta', async () => {
    vi.mocked(listarProyectos).mockRejectedValueOnce({ message: 'permission denied', code: '42501' })
    const { result } = renderHook(() => useProyectos(0))
    await waitFor(() => expect(result.current.estado).toEqual({ tipo: 'error', mensaje: 'No tienes permiso para esta acción.' }))

    vi.mocked(listarProyectos).mockResolvedValueOnce([])
    act(() => result.current.reintentar())
    expect(result.current.estado.tipo).toBe('cargando')
    await waitFor(() => expect(result.current.estado).toEqual({ tipo: 'listo', datos: [] }))
    expect(listarProyectos).toHaveBeenCalledTimes(2)
  })

  it('vuelve a cargar cuando cambia la versión', async () => {
    vi.mocked(listarProyectos).mockResolvedValue([])
    const { rerender } = renderHook(({ version }) => useProyectos(version), { initialProps: { version: 0 } })
    await waitFor(() => expect(listarProyectos).toHaveBeenCalledTimes(1))
    rerender({ version: 1 })
    await waitFor(() => expect(listarProyectos).toHaveBeenCalledTimes(2))
  })
})
