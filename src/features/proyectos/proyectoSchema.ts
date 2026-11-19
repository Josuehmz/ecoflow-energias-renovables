// Esquema zod del formulario «Nuevo proyecto». Reproduce los CHECK de la tabla proyectos
// (supabase/migrations/…_esquema_ecoflow.sql) para que el error se vea en el campo ANTES de enviar;
// la base los vuelve a comprobar de todos modos (fuente de verdad).
import { z } from 'zod'
import type { NuevoProyecto } from '@/types/dominio'

/** Texto obligatorio con la misma regla que el CHECK: char_length(btrim(x)) between min and max. */
function texto(campo: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, { error: `${campo} debe tener al menos ${min} caracteres.`, abort: true })
    .max(max, `${campo} no puede pasar de ${max} caracteres.`)
}

/** Texto de un <input> que puede venir vacío → null. */
const opcional = z
  .string()
  .trim()
  .transform((valor) => (valor === '' ? null : valor))

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export const proyectoSchema = z
  .object({
    nombre: texto('El nombre', 3, 120),
    cliente: texto('El cliente', 2, 120),
    direccion: texto('La dirección', 5, 200),
    ciudad: texto('La ciudad', 2, 80),
    capacidad_kwp: z
      .string()
      .trim()
      // abort: el primer fallo corta las demás comprobaciones del campo (un mensaje por campo).
      .min(1, { error: 'Escribe la capacidad en kWp.', abort: true })
      .regex(/^\d+([.,]\d{1,2})?$/, { error: 'La capacidad es un número con máximo 2 decimales.', abort: true })
      .transform((valor) => Number(valor.replace(',', '.')))
      .pipe(
        z
          .number()
          .gt(0, 'La capacidad debe ser mayor que 0 kWp.')
          .lte(10000, 'La capacidad no puede pasar de 10 000 kWp.'),
      ),
    numero_paneles: z
      .string()
      .trim()
      .min(1, { error: 'Escribe el número de paneles.', abort: true })
      .regex(/^\d+$/, { error: 'El número de paneles es un entero.', abort: true })
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .gt(0, 'Debe haber al menos 1 panel.')
          .lte(50000, 'No puede haber más de 50 000 paneles.'),
      ),
    fecha_inicio: z.string().regex(FECHA, 'Elige la fecha de inicio.'),
    fecha_fin: opcional.pipe(z.string().regex(FECHA, 'Fecha de fin inválida.').nullable()),
    instalador_id: opcional.pipe(z.guid('Instalador inválido.').nullable()),
  })
  .refine((p) => p.fecha_fin === null || p.fecha_fin >= p.fecha_inicio, {
    path: ['fecha_fin'],
    message: 'La fecha de fin no puede ser anterior a la de inicio.',
  })

/** Lo que escribe el usuario (todo texto, como llega de los <input>). */
export type ProyectoFormulario = z.input<typeof proyectoSchema>
/** Lo que sale de la validación, listo para enviarse a Supabase. */
export type ProyectoValidado = z.output<typeof proyectoSchema>

// Comprobación en tiempo de compilación: si la salida del esquema deja de ser asignable a
// NuevoProyecto (p. ej. si cambia la tabla y se regeneran los tipos), esta línea no compila.
export const salidaEsNuevoProyecto = (p: ProyectoValidado): NuevoProyecto => p
