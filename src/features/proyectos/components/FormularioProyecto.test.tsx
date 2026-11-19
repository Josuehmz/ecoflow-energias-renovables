import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormularioProyecto } from './FormularioProyecto'

const INSTALADORES = [
  { id: 'b2222222-2222-4222-8222-222222222222', nombre: 'Andrés Ruiz', especialidad: 'Residencial' },
  { id: 'b3333333-3333-4333-8333-333333333333', nombre: 'Beatriz Peña', especialidad: null },
]

function renderizar(props: Partial<Parameters<typeof FormularioProyecto>[0]> = {}) {
  const onCrear = vi.fn<(v: unknown) => Promise<boolean>>().mockResolvedValue(true)
  render(<FormularioProyecto instaladores={INSTALADORES} onCrear={onCrear} enviando={false} errorServidor={null} {...props} />)
  return { onCrear }
}

describe('FormularioProyecto', () => {
  it('no envía un formulario vacío y muestra el mensaje de cada campo', async () => {
    const { onCrear } = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    expect(await screen.findByText('El nombre debe tener al menos 3 caracteres.')).toBeTruthy()
    expect(screen.getByText('El cliente debe tener al menos 2 caracteres.')).toBeTruthy()
    expect(screen.getByText('Escribe la capacidad en kWp.')).toBeTruthy()
    expect(screen.getByText('Escribe el número de paneles.')).toBeTruthy()
    expect(screen.getByText('Elige la fecha de inicio.')).toBeTruthy()
    expect(screen.getByLabelText('Nombre del proyecto').getAttribute('aria-invalid')).toBe('true')
    expect(onCrear).not.toHaveBeenCalled()
  })

  it('envía los valores convertidos cuando todo es válido', async () => {
    const { onCrear } = renderizar()
    await userEvent.type(screen.getByLabelText('Nombre del proyecto'), 'Techo solar Casa López')
    await userEvent.type(screen.getByLabelText('Cliente'), 'Familia López')
    await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 10 # 5-20')
    await userEvent.type(screen.getByLabelText('Ciudad'), 'Bogotá')
    await userEvent.type(screen.getByLabelText('Capacidad (kWp)'), '12,5')
    await userEvent.type(screen.getByLabelText('Número de paneles'), '28')
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2027-01-10' } })
    fireEvent.change(screen.getByLabelText('Fecha de fin (opcional)'), { target: { value: '2027-02-01' } })
    await userEvent.selectOptions(screen.getByLabelText('Instalador asignado (opcional)'), 'Beatriz Peña')
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }))
    await waitFor(() => expect(onCrear).toHaveBeenCalledTimes(1))
    expect(onCrear.mock.calls[0]?.[0]).toEqual({
      nombre: 'Techo solar Casa López',
      cliente: 'Familia López',
      direccion: 'Calle 10 # 5-20',
      ciudad: 'Bogotá',
      capacidad_kwp: 12.5,
      numero_paneles: 28,
      fecha_inicio: '2027-01-10',
      fecha_fin: '2027-02-01',
      instalador_id: 'b3333333-3333-4333-8333-333333333333',
    })
  })

  it('muestra el error que devolvió Supabase', () => {
    renderizar({ errorServidor: 'No tienes permiso para esta acción.' })
    expect(screen.getByText('No tienes permiso para esta acción.')).toBeTruthy()
  })

  it('deshabilita el botón mientras envía', () => {
    renderizar({ enviando: true })
    expect(screen.getByRole('button', { name: 'Creando…' })).toHaveProperty('disabled', true)
  })
})
