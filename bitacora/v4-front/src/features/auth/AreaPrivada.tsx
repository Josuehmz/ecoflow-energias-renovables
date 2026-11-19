import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ErrorConReintento } from '@/components/ErrorConReintento'
import { PantallaCarga } from '@/components/PantallaCarga'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import type { SesionUsuario } from '@/services/authService'
import { useCerrarSesion } from './hooks/useCerrarSesion'
import { usePerfil } from './hooks/usePerfil'

export function AreaPrivada({ usuario }: { usuario: SesionUsuario }) {
  const { estado, reintentar } = usePerfil(usuario.userId)
  const { salir } = useCerrarSesion()

  if (estado.tipo === 'cargando') return <PantallaCarga texto="Cargando tu perfil…" />
  if (estado.tipo === 'error') {
    return (
      <main className="mx-auto max-w-xl p-6">
        <ErrorConReintento titulo="No se pudo cargar tu perfil" mensaje={estado.mensaje} onReintentar={reintentar} />
      </main>
    )
  }
  if (estado.datos === null) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-6">
        <Alert>
          <AlertTitle>Tu cuenta no tiene ficha de personal</AlertTitle>
          <AlertDescription>{usuario.email} no está registrado en EcoFlow. Pide a un coordinador que te dé de alta.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void salir()}>Salir</Button>
      </main>
    )
  }
  return <DashboardPage perfil={estado.datos} onCerrarSesion={() => void salir()} />
}
