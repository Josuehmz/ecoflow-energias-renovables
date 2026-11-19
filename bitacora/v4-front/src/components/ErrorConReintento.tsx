import { RotateCw, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type Props = {
  titulo: string
  mensaje: string
  onReintentar: () => void
}

export function ErrorConReintento({ titulo, mensaje, onReintentar }: Props) {
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>
        <p>{mensaje}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onReintentar}>
          <RotateCw aria-hidden="true" />
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  )
}
