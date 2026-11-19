import { useState } from 'react'
import { CircleCheck, Plus, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorConReintento } from '@/components/ErrorConReintento'
import { Skeleton } from '@/components/ui/skeleton'
import { FormularioProyecto } from './components/FormularioProyecto'
import { useCrearProyecto } from './hooks/useCrearProyecto'
import { useInstaladores } from './hooks/useInstaladores'
import type { ProyectoValidado } from './proyectoSchema'

/** Panel del coordinador: solo se monta si la sesión es de un coordinador (DashboardPage). */
export function NuevoProyectoPanel({ alCrear }: { alCrear: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const instaladores = useInstaladores()
  const { crear, enviando, error } = useCrearProyecto(alCrear)

  async function onCrear(valores: ProyectoValidado): Promise<boolean> {
    const creado = await crear(valores)
    if (creado) {
      setAbierto(false)
      setAviso(`Proyecto «${valores.nombre}» creado como Pendiente.`)
    }
    return creado
  }

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            setAviso(null)
            setAbierto(true)
          }}
        >
          <Plus aria-hidden="true" />
          Nuevo proyecto
        </Button>
        {aviso && (
          <Alert className="w-auto border-emerald-300 bg-emerald-50 py-2 text-emerald-900">
            <CircleCheck aria-hidden="true" />
            <AlertDescription className="text-emerald-900">{aviso}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Nuevo proyecto</CardTitle>
          <CardDescription>Se valida antes de enviarse; la base de datos vuelve a comprobar cada regla.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar formulario" onClick={() => setAbierto(false)}>
          <X aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        {instaladores.estado.tipo === 'cargando' && <Skeleton className="h-40 w-full" />}
        {instaladores.estado.tipo === 'error' && (
          <ErrorConReintento titulo="No se pudo cargar el personal" mensaje={instaladores.estado.mensaje} onReintentar={instaladores.reintentar} />
        )}
        {instaladores.estado.tipo === 'listo' && (
          <FormularioProyecto instaladores={instaladores.estado.datos} onCrear={onCrear} enviando={enviando} errorServidor={error} />
        )}
      </CardContent>
    </Card>
  )
}
