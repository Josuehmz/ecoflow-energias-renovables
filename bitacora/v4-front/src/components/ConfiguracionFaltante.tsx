import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ConfiguracionFaltante({ mensaje }: { mensaje: string }) {
  return (
    <main className="mx-auto max-w-xl p-6">
      <Alert variant="destructive">
        <AlertTitle>Falta configurar Supabase</AlertTitle>
        <AlertDescription>{mensaje}</AlertDescription>
      </Alert>
    </main>
  )
}
