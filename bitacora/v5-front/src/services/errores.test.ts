import { describe, expect, it } from 'vitest'
import { mensajeDeError, traducirError } from './errores'

describe('traducirError', () => {
  it('deja tal cual los mensajes que escribe el trigger de la base', () => {
    const mensaje = 'Transición no permitida: de «pendiente» a «completado». Una obra no puede completarse sin haber empezado.'
    expect(mensajeDeError({ message: mensaje, code: 'P0001' })).toBe(mensaje)
    expect(mensajeDeError({ message: 'Solo un coordinador puede modificar datos del proyecto distintos del estado', code: '42501' })).toBe(
      'Solo un coordinador puede modificar datos del proyecto distintos del estado',
    )
  })

  it('traduce los códigos de PostgreSQL y de Auth', () => {
    expect(mensajeDeError({ message: 'permission denied for table proyectos', code: '42501' })).toBe('No tienes permiso para esta acción.')
    expect(mensajeDeError({ message: 'new row violates check constraint', code: '23514' })).toMatch(/no cumple las reglas/)
    expect(mensajeDeError({ message: 'Invalid login credentials', code: 'invalid_credentials' })).toBe('Correo o contraseña incorrectos.')
    expect(mensajeDeError(new TypeError('Failed to fetch'))).toMatch(/No se pudo conectar/)
  })

  it('explica qué hacer cuando el CHECK de instalador rechaza el cambio de estado', () => {
    const error = {
      message: 'new row for relation "proyectos" violates check constraint "proyectos_estado_requiere_instalador"',
      code: '23514',
    }
    expect(mensajeDeError(error)).toBe('Asigna un instalador antes de pasar el proyecto a En progreso o Completado.')
  })

  it('conserva el código y no se rompe con valores raros', () => {
    expect(traducirError({ message: 'x', code: '23503' }).codigo).toBe('23503')
    expect(mensajeDeError(null)).toBe('Ocurrió un error inesperado.')
    expect(mensajeDeError('texto')).toBe('Ocurrió un error inesperado.')
  })
})
