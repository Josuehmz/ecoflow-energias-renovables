import { LoaderCircle } from 'lucide-react'

export function PantallaCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  )
}
