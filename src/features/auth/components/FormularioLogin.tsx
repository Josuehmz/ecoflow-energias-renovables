import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, Sun } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type DatosLogin } from '../loginSchema'

type Props = {
  onIniciar: (datos: DatosLogin) => Promise<boolean>
  enviando: boolean
  error: string | null
}

export function FormularioLogin({ onIniciar, enviando, error }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosLogin>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', contrasena: '' } })

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 text-emerald-700">
          <Sun className="size-6" aria-hidden="true" />
          <span className="text-lg font-semibold">EcoFlow</span>
        </div>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Gestión interna de proyectos de energía solar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit(async (datos) => { await onIniciar(datos) })}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="username" aria-invalid={errors.email ? true : undefined} aria-describedby="email-error" {...register('email')} />
            {errors.email && <p id="email-error" role="alert" className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input id="contrasena" type="password" autoComplete="current-password" aria-invalid={errors.contrasena ? true : undefined} aria-describedby="contrasena-error" {...register('contrasena')} />
            {errors.contrasena && <p id="contrasena-error" role="alert" className="text-sm text-destructive">{errors.contrasena.message}</p>}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={enviando}>
            <LogIn aria-hidden="true" />
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
