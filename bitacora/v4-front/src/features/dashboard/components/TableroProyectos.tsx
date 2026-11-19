import { Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorConReintento } from '@/components/ErrorConReintento'
import { TarjetaProyecto } from '@/features/proyectos/components/TarjetaProyecto'
import { ESTADOS_PROYECTO, ETIQUETA_ESTADO, type EstadoProyecto, type ProyectoConInstalador } from '@/types/dominio'
import type { EstadoCarga } from '@/types/estadoCarga'

const BORDE: Record<EstadoProyecto, string> = {
  pendiente: 'border-t-amber-400',
  en_progreso: 'border-t-sky-400',
  completado: 'border-t-emerald-400',
}

type Props = {
  estado: EstadoCarga<ProyectoConInstalador[]>
  onReintentar: () => void
  puedeCambiarEstado: boolean
  enCurso: string | null
  errores: Record<string, string>
  onCambiarEstado: (id: string, estado: EstadoProyecto) => void
}

export function TableroProyectos({ estado, onReintentar, puedeCambiarEstado, enCurso, errores, onCambiarEstado }: Props) {
  if (estado.tipo === 'error') {
    return <ErrorConReintento titulo="No se pudieron cargar los proyectos" mensaje={estado.mensaje} onReintentar={onReintentar} />
  }
  if (estado.tipo === 'listo' && estado.datos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Inbox className="size-8" aria-hidden="true" />
          <p>No hay proyectos visibles para tu cuenta.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <section aria-label="Tablero de proyectos" className="grid gap-4 lg:grid-cols-3">
      {ESTADOS_PROYECTO.map((columna) => {
        const proyectos = estado.tipo === 'listo' ? estado.datos.filter((p) => p.estado === columna) : []
        return (
          <section
            key={columna}
            aria-label={`Columna ${ETIQUETA_ESTADO[columna]}`}
            className={`space-y-3 rounded-xl border border-t-4 bg-white/70 p-3 ${BORDE[columna]}`}
          >
            <h2 className="flex items-center justify-between font-semibold">
              {ETIQUETA_ESTADO[columna]}
              {estado.tipo === 'listo' && <span className="text-sm font-normal text-muted-foreground">{proyectos.length}</span>}
            </h2>
            {estado.tipo === 'cargando' && [0, 1].map((n) => <Skeleton key={n} className="h-36 rounded-xl" />)}
            {estado.tipo === 'listo' && proyectos.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Sin proyectos en este estado.</p>
            )}
            {proyectos.map((proyecto) => (
              <TarjetaProyecto
                key={proyecto.id}
                proyecto={proyecto}
                puedeCambiarEstado={puedeCambiarEstado}
                enCurso={enCurso === proyecto.id}
                error={errores[proyecto.id]}
                onCambiarEstado={(nuevo) => onCambiarEstado(proyecto.id, nuevo)}
              />
            ))}
          </section>
        )
      })}
    </section>
  )
}
