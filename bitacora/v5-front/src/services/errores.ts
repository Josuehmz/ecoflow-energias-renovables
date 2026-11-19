// Traduce los errores de Supabase (PostgrestError, AuthError, red) a un mensaje en español.
// Los mensajes que escribe la propia base (trigger de reglas) ya están en español y se muestran
// tal cual: así la regla de negocio tiene una sola fuente.

export class ErrorDeServicio extends Error {
  readonly codigo: string | null

  constructor(mensaje: string, codigo: string | null) {
    super(mensaje)
    this.name = 'ErrorDeServicio'
    this.codigo = codigo
  }
}

const PREFIJOS_DE_LA_BASE = ['Transición no permitida', 'Asignación no válida', 'Solo un coordinador']

function leerCampo(error: object, campo: 'message' | 'code'): string | null {
  const valor: unknown = Reflect.get(error, campo)
  return typeof valor === 'string' ? valor : null
}

export function traducirError(error: unknown): ErrorDeServicio {
  if (error instanceof ErrorDeServicio) return error
  if (typeof error !== 'object' || error === null) {
    return new ErrorDeServicio('Ocurrió un error inesperado.', null)
  }
  const mensaje = leerCampo(error, 'message') ?? 'Ocurrió un error inesperado.'
  const codigo = leerCampo(error, 'code')

  if (PREFIJOS_DE_LA_BASE.some((prefijo) => mensaje.startsWith(prefijo))) {
    return new ErrorDeServicio(mensaje, codigo)
  }
  if (codigo === '23514' && mensaje.includes('proyectos_estado_requiere_instalador')) {
    return new ErrorDeServicio('Asigna un instalador antes de pasar el proyecto a En progreso o Completado.', codigo)
  }
  switch (codigo) {
    case '42501':
      return new ErrorDeServicio('No tienes permiso para esta acción.', codigo)
    case '23514':
      return new ErrorDeServicio('Algún dato no cumple las reglas del proyecto: la base de datos lo rechazó.', codigo)
    case '23503':
      return new ErrorDeServicio('El registro está relacionado con otros datos y no se puede cambiar así.', codigo)
    case '23505':
      return new ErrorDeServicio('Ya existe un registro con esos datos.', codigo)
    case 'PGRST116':
      return new ErrorDeServicio('El proyecto no existe o ya no tienes acceso a él.', codigo)
    case 'invalid_credentials':
      return new ErrorDeServicio('Correo o contraseña incorrectos.', codigo)
    default:
      break
  }
  if (mensaje === 'Invalid login credentials') {
    return new ErrorDeServicio('Correo o contraseña incorrectos.', codigo)
  }
  if (mensaje.includes('Failed to fetch') || mensaje.includes('NetworkError')) {
    return new ErrorDeServicio('No se pudo conectar con Supabase. ¿Está corriendo `supabase start`?', codigo)
  }
  return new ErrorDeServicio(mensaje, codigo)
}

export function mensajeDeError(error: unknown): string {
  return traducirError(error).message
}
