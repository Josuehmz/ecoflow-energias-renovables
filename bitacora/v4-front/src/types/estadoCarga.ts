/** Estado de una consulta: una sola variable, sin combinaciones imposibles (cargando y error a la vez). */
export type EstadoCarga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; datos: T }
