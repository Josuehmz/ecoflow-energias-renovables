import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { proyecto } from '@/test/fixtures'
import { TableroProyectos } from './TableroProyectos'

const base = { onReintentar: vi.fn(), puedeCambiarEstado: true, enCurso: null, errores: {}, onCambiarEstado: vi.fn() }

describe('TableroProyectos', () => {
  it('muestra el vacío global cuando la RLS no devuelve proyectos', () => {
    render(<TableroProyectos {...base} estado={{ tipo: 'listo', datos: [] }} />)
    expect(screen.getByText('No hay proyectos visibles para tu cuenta.')).toBeTruthy()
  })

  it('reparte los proyectos en tres columnas y marca la columna vacía', () => {
    render(
      <TableroProyectos
        {...base}
        estado={{ tipo: 'listo', datos: [proyecto({ id: 'p1', nombre: 'Uno', estado: 'pendiente' }), proyecto({ id: 'p2', nombre: 'Dos', estado: 'completado' })] }}
      />,
    )
    expect(within(screen.getByRole('region', { name: 'Columna Pendiente' })).getByText('Uno')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Columna En progreso' })).getByText('Sin proyectos en este estado.')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Columna Completado' })).getByText('Dos')).toBeTruthy()
  })

  it('muestra el error con Reintentar', async () => {
    const onReintentar = vi.fn()
    render(<TableroProyectos {...base} onReintentar={onReintentar} estado={{ tipo: 'error', mensaje: 'Sin conexión' }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })

  it('muestra el rechazo de la base en la tarjeta del proyecto', () => {
    render(
      <TableroProyectos
        {...base}
        errores={{ p1: 'Transición no permitida: de «en_progreso» a «pendiente».' }}
        estado={{ tipo: 'listo', datos: [proyecto({ id: 'p1', estado: 'en_progreso' })] }}
      />,
    )
    expect(screen.getByText('Transición no permitida: de «en_progreso» a «pendiente».')).toBeTruthy()
  })
})
