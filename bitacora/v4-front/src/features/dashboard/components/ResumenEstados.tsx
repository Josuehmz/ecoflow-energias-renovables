import { CircleCheck, Clock, Hammer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorConReintento } from '@/components/ErrorConReintento'
import { ETIQUETA_ESTADO, type EstadoProyecto, type ResumenEstado } from '@/types/dominio'
import type { EstadoCarga } from '@/types/estadoCarga'

const ICONO: Record<EstadoProyecto, typeof Clock> = { pendiente: Clock, en_progreso: Hammer, completado: CircleCheck }
const COLOR: Record<EstadoProyecto, string> = {
  pendiente: 'text-amber-600 bg-amber-50',
  en_progreso: 'text-sky-600 bg-sky-50',
  completado: 'text-emerald-600 bg-emerald-50',
}

type Props = {
  estado: EstadoCarga<ResumenEstado[]>
  onReintentar: () => void
}

export function ResumenEstados({ estado, onReintentar }: Props) {
  if (estado.tipo === 'error') {
    return <ErrorConReintento titulo="No se pudo cargar el resumen" mensaje={estado.mensaje} onReintentar={onReintentar} />
  }
  return (
    <section aria-label="Resumen por estado" className="grid gap-4 sm:grid-cols-3">
      {estado.tipo === 'cargando'
        ? [0, 1, 2].map((n) => <Skeleton key={n} className="h-24 rounded-xl" />)
        : estado.datos.map(({ estado: clave, total }) => {
            const Icono = ICONO[clave]
            return (
              <Card key={clave} data-estado={clave}>
                <CardContent className="flex items-center gap-4">
                  <span className={`rounded-full p-3 ${COLOR[clave]}`}>
                    <Icono className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{ETIQUETA_ESTADO[clave]}</p>
                    <p className="text-3xl font-semibold" aria-label={`${ETIQUETA_ESTADO[clave]}: ${total}`}>
                      {total}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
    </section>
  )
}
