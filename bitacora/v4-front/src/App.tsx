import { ConfiguracionFaltante } from '@/components/ConfiguracionFaltante'
import { PantallaCarga } from '@/components/PantallaCarga'
import { AreaPrivada } from '@/features/auth/AreaPrivada'
import { LoginPage } from '@/features/auth/LoginPage'
import { useSesion } from '@/features/auth/hooks/useSesion'

export default function App() {
  const sesion = useSesion()
  switch (sesion.tipo) {
    case 'sin-configurar':
      return <ConfiguracionFaltante mensaje={sesion.mensaje} />
    case 'cargando':
      return <PantallaCarga />
    case 'sin-sesion':
      return <LoginPage />
    case 'con-sesion':
      return <AreaPrivada usuario={sesion.usuario} />
  }
}
