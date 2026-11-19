import { describe, expect, it } from 'vitest'
import { proyectoSchema, type ProyectoFormulario } from './proyectoSchema'

const valido: ProyectoFormulario = {
  nombre: 'Techo solar Casa López',
  cliente: 'Familia López',
  direccion: 'Calle 10 # 5-20',
  ciudad: 'Bogotá',
  capacidad_kwp: '12,5',
  numero_paneles: '28',
  fecha_inicio: '2027-01-10',
  fecha_fin: '',
  instalador_id: '',
}

function mensajes(datos: ProyectoFormulario): Record<string, string | undefined> {
  const resultado = proyectoSchema.safeParse(datos)
  if (resultado.success) return {}
  return Object.fromEntries(resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

describe('proyectoSchema', () => {
  it('convierte los textos del formulario a los tipos de la base', () => {
    const resultado = proyectoSchema.parse({ ...valido, nombre: '  Techo solar Casa López  ' })
    expect(resultado).toEqual({
      nombre: 'Techo solar Casa López',
      cliente: 'Familia López',
      direccion: 'Calle 10 # 5-20',
      ciudad: 'Bogotá',
      capacidad_kwp: 12.5,
      numero_paneles: 28,
      fecha_inicio: '2027-01-10',
      fecha_fin: null,
      instalador_id: null,
    })
  })

  it('rechaza capacidad 0, con 3 decimales o vacía (CHECK capacidad_kwp > 0, numeric(8,2))', () => {
    expect(mensajes({ ...valido, capacidad_kwp: '0' }).capacidad_kwp).toBe('La capacidad debe ser mayor que 0 kWp.')
    expect(mensajes({ ...valido, capacidad_kwp: '1.234' }).capacidad_kwp).toBe('La capacidad es un número con máximo 2 decimales.')
    expect(mensajes({ ...valido, capacidad_kwp: '' }).capacidad_kwp).toBe('Escribe la capacidad en kWp.')
    expect(mensajes({ ...valido, capacidad_kwp: '10000.01' }).capacidad_kwp).toBe('La capacidad no puede pasar de 10 000 kWp.')
  })

  it('rechaza paneles decimales o en 0', () => {
    expect(mensajes({ ...valido, numero_paneles: '1.5' }).numero_paneles).toBe('El número de paneles es un entero.')
    expect(mensajes({ ...valido, numero_paneles: '0' }).numero_paneles).toBe('Debe haber al menos 1 panel.')
  })

  it('cuenta las longitudes sin los espacios de los extremos (CHECK btrim)', () => {
    expect(mensajes({ ...valido, nombre: '  ab  ' }).nombre).toBe('El nombre debe tener al menos 3 caracteres.')
  })

  it('rechaza una fecha de fin anterior a la de inicio, en el campo fecha_fin', () => {
    expect(mensajes({ ...valido, fecha_fin: '2027-01-09' }).fecha_fin).toBe('La fecha de fin no puede ser anterior a la de inicio.')
    expect(mensajes({ ...valido, fecha_fin: '2027-01-10' }).fecha_fin).toBeUndefined()
  })

  it('exige la fecha de inicio', () => {
    expect(mensajes({ ...valido, fecha_inicio: '' }).fecha_inicio).toBe('Elige la fecha de inicio.')
  })
})
