import { useCallback, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Encabezado } from '@/features/auth/components/Encabezado'
import { useCambiarEstado } from '@/features/proyectos/hooks/useCambiarEstado'
import { useProyectos } from '@/features/proyectos/hooks/useProyectos'
import { NuevoProyectoPanel } from '@/features/proyectos/NuevoProyectoPanel'
import type { Instalador } from '@/types/dominio'
import { ResumenEstados } from './components/ResumenEstados'
import { TableroProyectos } from './components/TableroProyectos'
import { useResumen } from './hooks/useResumen'

type Props = {
  perfil: Instalador
  onCerrarSesion: () => void
}

export function DashboardPage({ perfil, onCerrarSesion }: Props) {
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  const proyectos = useProyectos(version)
  const resumen = useResumen(version)
  const cambio = useCambiarEstado(recargar)
  const esCoordinador = perfil.rol === 'coordinador'

  return (
    <div className="min-h-screen bg-muted/40">
      <Encabezado perfil={perfil} onCerrarSesion={onCerrarSesion} />
      <main className="mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Tablero de proyectos</h1>
          <p className="text-sm text-muted-foreground">
            {esCoordinador ? 'Ves todos los proyectos de la empresa.' : 'Ves solo los proyectos que tienes asignados.'}
          </p>
        </div>
        {!perfil.activo && (
          <Alert>
            <AlertDescription>Tu ficha está inactiva: no tienes proyectos visibles.</AlertDescription>
          </Alert>
        )}
        <ResumenEstados estado={resumen.estado} onReintentar={resumen.reintentar} />
        {esCoordinador && <NuevoProyectoPanel alCrear={recargar} />}
        <TableroProyectos
          estado={proyectos.estado}
          onReintentar={proyectos.reintentar}
          puedeCambiarEstado={perfil.activo}
          enCurso={cambio.enCurso}
          errores={cambio.errores}
          onCambiarEstado={(id, estado) => void cambio.cambiar(id, estado)}
        />
      </main>
    </div>
  )
}
