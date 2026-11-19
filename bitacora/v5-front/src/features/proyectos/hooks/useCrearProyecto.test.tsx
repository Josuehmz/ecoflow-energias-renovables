import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearProyecto } from '@/services/proyectosService'
import { proyecto } from '@/test/fixtures'
import { useCrearProyecto } from './useCrearProyecto'

vi.mock('@/services/proyectosService', () => ({ crearProyecto: vi.fn() }))

const VALORES = {
  nombre: 'Techo solar Casa López',
  cliente: 'Familia López',
  direccion: 'Calle 10 # 5-20',
  ciudad: 'Bogotá',
  capacidad_kwp: 12.5,
  numero_paneles: 28,
  fecha_inicio: '2027-01-10',
  fecha_fin: null,
  instalador_id: null,
}

describe('useCrearProyecto', () => {
  beforeEach(() => vi.mocked(crearProyecto).mockReset())

  it('crea, avisa y devuelve true', async () => {
    vi.mocked(crearProyecto).mockResolvedValue(proyecto())
    const alCrear = vi.fn()
    const { result } = renderHook(() => useCrearProyecto(alCrear))
    let creado = false
    await act(async () => {
      creado = await result.current.crear(VALORES)
    })
    expect(creado).toBe(true)
    expect(crearProyecto).toHaveBeenCalledWith(VALORES)
    expect(alCrear).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()
    expect(result.current.enviando).toBe(false)
  })

  it('guarda el mensaje del error de la base y no avisa', async () => {
    vi.mocked(crearProyecto).mockRejectedValueOnce({
      message: 'Asignación no válida: el instalador está inactivo y no puede recibir proyectos.',
      code: 'P0001',
    })
    const alCrear = vi.fn()
    const { result } = renderHook(() => useCrearProyecto(alCrear))
    let creado = true
    await act(async () => {
      creado = await result.current.crear(VALORES)
    })
    expect(creado).toBe(false)
    expect(alCrear).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Asignación no válida: el instalador está inactivo y no puede recibir proyectos.')
  })
})
