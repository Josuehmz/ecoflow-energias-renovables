import { cliente, configuracion } from '@/lib/supabase'
import { traducirError } from './errores'

/** Lo que la app necesita saber de la sesión (sin exponer el tipo Session de supabase-js). */
export type SesionUsuario = { userId: string; email: string }

export type EstadoConfiguracion = { lista: true } | { lista: false; mensaje: string }

export function estadoConfiguracion(): EstadoConfiguracion {
  return configuracion.tipo === 'lista' ? { lista: true } : { lista: false, mensaje: configuracion.mensaje }
}

export async function iniciarSesion(email: string, contrasena: string): Promise<SesionUsuario> {
  const { data, error } = await cliente().auth.signInWithPassword({ email, password: contrasena })
  if (error) throw traducirError(error)
  return { userId: data.user.id, email: data.user.email ?? email }
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await cliente().auth.signOut()
  if (error) throw traducirError(error)
}

/**
 * Escucha la sesión. onAuthStateChange emite INITIAL_SESSION al suscribirse (con la sesión que
 * supabase-js recuperó de localStorage), así que no hace falta un getSession() aparte.
 * Devuelve la función para cancelar la suscripción.
 */
export function escucharSesion(alCambiar: (usuario: SesionUsuario | null) => void): () => void {
  const { data } = cliente().auth.onAuthStateChange((_evento, sesion) => {
    alCambiar(sesion ? { userId: sesion.user.id, email: sesion.user.email ?? '' } : null)
  })
  return () => data.subscription.unsubscribe()
}
