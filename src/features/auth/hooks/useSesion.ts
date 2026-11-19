import { useEffect, useState } from 'react'
import { escucharSesion, estadoConfiguracion, type SesionUsuario } from '@/services/authService'

export type EstadoSesion =
  | { tipo: 'sin-configurar'; mensaje: string }
  | { tipo: 'cargando' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'con-sesion'; usuario: SesionUsuario }

function estadoInicial(): EstadoSesion {
  const configuracion = estadoConfiguracion()
  return configuracion.lista ? { tipo: 'cargando' } : { tipo: 'sin-configurar', mensaje: configuracion.mensaje }
}

/** Sesión actual. Arranca en «cargando» hasta el INITIAL_SESSION: así no parpadea el login. */
export function useSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>(estadoInicial)

  useEffect(() => {
    if (!estadoConfiguracion().lista) return undefined
    return escucharSesion((usuario) => {
      setEstado(usuario ? { tipo: 'con-sesion', usuario } : { tipo: 'sin-sesion' })
    })
  }, [])

  return estado
}
