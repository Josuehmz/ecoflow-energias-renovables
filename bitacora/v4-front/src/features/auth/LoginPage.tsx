import { FormularioLogin } from './components/FormularioLogin'
import { useIniciarSesion } from './hooks/useIniciarSesion'

export function LoginPage() {
  const { iniciar, enviando, error } = useIniciarSesion()
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-100 p-6">
      <FormularioLogin onIniciar={(datos) => iniciar(datos.email, datos.contrasena)} enviando={enviando} error={error} />
    </main>
  )
}
