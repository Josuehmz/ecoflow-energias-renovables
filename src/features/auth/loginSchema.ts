import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo.').pipe(z.email('El correo no es válido.')),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
})

export type DatosLogin = z.infer<typeof loginSchema>
