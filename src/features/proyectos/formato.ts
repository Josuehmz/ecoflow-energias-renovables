const NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatoKwp(kwp: number): string {
  return `${NUMERO.format(kwp)} kWp`
}

/** Las columnas `date` llegan como 'AAAA-MM-DD': se leen en UTC para no correrse un día. */
export function formatoFecha(fecha: string): string {
  return FECHA.format(new Date(`${fecha}T00:00:00Z`))
}
