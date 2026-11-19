import { CalendarDays, MapPin, PanelsTopLeft, User, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { EstadoProyecto, ProyectoConInstalador } from '@/types/dominio'
import { formatoFecha, formatoKwp } from '../formato'
import { CambioEstado } from './CambioEstado'

type Props = {
  proyecto: ProyectoConInstalador
  puedeCambiarEstado: boolean
  enCurso: boolean
  error: string | undefined
  onCambiarEstado: (estado: EstadoProyecto) => void
}

export function TarjetaProyecto({ proyecto, puedeCambiarEstado, enCurso, error, onCambiarEstado }: Props) {
  return (
    <Card size="sm" className="gap-3" data-proyecto={proyecto.nombre}>
      <CardHeader>
        <CardTitle>{proyecto.nombre}</CardTitle>
        <CardDescription>{proyecto.cliente}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <MapPin className="size-4" aria-hidden="true" />
          {proyecto.direccion}, {proyecto.ciudad}
        </p>
        <p className="flex items-center gap-2">
          <Zap className="size-4" aria-hidden="true" />
          {formatoKwp(proyecto.capacidad_kwp)}
          <PanelsTopLeft className="ml-2 size-4" aria-hidden="true" />
          {proyecto.numero_paneles} paneles
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          {formatoFecha(proyecto.fecha_inicio)}
          {proyecto.fecha_fin ? ` → ${formatoFecha(proyecto.fecha_fin)}` : ''}
        </p>
        <p className="flex items-center gap-2">
          <User className="size-4" aria-hidden="true" />
          {proyecto.instalador?.nombre ?? 'Sin asignar'}
        </p>
      </CardContent>
      {(puedeCambiarEstado || error) && (
        <CardFooter className="flex-col items-stretch gap-2">
          {puedeCambiarEstado && (
            <CambioEstado
              key={proyecto.estado}
              idProyecto={proyecto.id}
              nombreProyecto={proyecto.nombre}
              estadoActual={proyecto.estado}
              enCurso={enCurso}
              onAplicar={onCambiarEstado}
            />
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
