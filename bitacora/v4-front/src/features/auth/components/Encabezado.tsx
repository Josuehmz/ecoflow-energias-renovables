import { LogOut, Sun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Instalador } from '@/types/dominio'

type Props = {
  perfil: Instalador
  onCerrarSesion: () => void
}

export function Encabezado({ perfil, onCerrarSesion }: Props) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <Sun className="size-6" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold leading-tight">EcoFlow</p>
            <p className="text-xs text-muted-foreground">Proyectos de energía solar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{perfil.nombre}</p>
            <p className="text-xs text-muted-foreground">{perfil.email}</p>
          </div>
          <Badge variant={perfil.rol === 'coordinador' ? 'default' : 'secondary'}>
            {perfil.rol === 'coordinador' ? 'Coordinador' : 'Instalador'}
          </Badge>
          <Button variant="outline" size="sm" onClick={onCerrarSesion}>
            <LogOut aria-hidden="true" />
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
