import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CambioEstado, destinoInicial } from './CambioEstado'

describe('CambioEstado', () => {
  it('propone el estado siguiente y, si no hay, el anterior', () => {
    expect(destinoInicial('pendiente')).toBe('en_progreso')
    expect(destinoInicial('en_progreso')).toBe('completado')
    expect(destinoInicial('completado')).toBe('en_progreso')
  })

  it('no ofrece el estado actual y envía el elegido sin validarlo (la regla es de la base)', async () => {
    const onAplicar = vi.fn()
    render(<CambioEstado idProyecto="p1" nombreProyecto="Uno" estadoActual="en_progreso" enCurso={false} onAplicar={onAplicar} />)
    const selector = screen.getByLabelText('Nuevo estado de Uno')
    expect(screen.queryByRole('option', { name: 'En progreso' })).toBeNull()
    await userEvent.selectOptions(selector, 'Pendiente')
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar estado' }))
    expect(onAplicar).toHaveBeenCalledWith('pendiente')
  })
})
