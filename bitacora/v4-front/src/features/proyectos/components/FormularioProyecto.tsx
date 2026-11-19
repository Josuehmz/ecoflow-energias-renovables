import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { proyectoSchema, type ProyectoFormulario, type ProyectoValidado } from '../proyectoSchema'

export type OpcionInstalador = { id: string; nombre: string; especialidad: string | null }

type Props = {
  instaladores: OpcionInstalador[]
  onCrear: (valores: ProyectoValidado) => Promise<boolean>
  enviando: boolean
  errorServidor: string | null
}

const VACIO: ProyectoFormulario = {
  nombre: '',
  cliente: '',
  direccion: '',
  ciudad: '',
  capacidad_kwp: '',
  numero_paneles: '',
  fecha_inicio: '',
  fecha_fin: '',
  instalador_id: '',
}

type Campo = keyof ProyectoFormulario

function MensajeCampo({ campo, mensaje }: { campo: Campo; mensaje: string | undefined }) {
  if (!mensaje) return null
  return (
    <p id={`${campo}-error`} role="alert" className="text-sm text-destructive">
      {mensaje}
    </p>
  )
}

export function FormularioProyecto({ instaladores, onCrear, enviando, errorServidor }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProyectoFormulario, unknown, ProyectoValidado>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: VACIO,
  })

  const enviar = handleSubmit(async (valores) => {
    if (await onCrear(valores)) reset(VACIO)
  })

  const ayuda = (campo: Campo) => ({
    'aria-invalid': errors[campo] ? true : undefined,
    'aria-describedby': `${campo}-error`,
  })

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={enviar} aria-label="Nuevo proyecto">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre del proyecto</Label>
        <Input id="nombre" placeholder="Techo solar Casa López" {...ayuda('nombre')} {...register('nombre')} />
        <MensajeCampo campo="nombre" mensaje={errors.nombre?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cliente">Cliente</Label>
        <Input id="cliente" placeholder="Familia López" {...ayuda('cliente')} {...register('cliente')} />
        <MensajeCampo campo="cliente" mensaje={errors.cliente?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" placeholder="Calle 10 # 5-20" {...ayuda('direccion')} {...register('direccion')} />
        <MensajeCampo campo="direccion" mensaje={errors.direccion?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ciudad">Ciudad</Label>
        <Input id="ciudad" placeholder="Bogotá" {...ayuda('ciudad')} {...register('ciudad')} />
        <MensajeCampo campo="ciudad" mensaje={errors.ciudad?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="capacidad_kwp">Capacidad (kWp)</Label>
        <Input id="capacidad_kwp" inputMode="decimal" placeholder="12,5" {...ayuda('capacidad_kwp')} {...register('capacidad_kwp')} />
        <MensajeCampo campo="capacidad_kwp" mensaje={errors.capacidad_kwp?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="numero_paneles">Número de paneles</Label>
        <Input id="numero_paneles" inputMode="numeric" placeholder="28" {...ayuda('numero_paneles')} {...register('numero_paneles')} />
        <MensajeCampo campo="numero_paneles" mensaje={errors.numero_paneles?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
        <Input id="fecha_inicio" type="date" {...ayuda('fecha_inicio')} {...register('fecha_inicio')} />
        <MensajeCampo campo="fecha_inicio" mensaje={errors.fecha_inicio?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fecha_fin">Fecha de fin (opcional)</Label>
        <Input id="fecha_fin" type="date" {...ayuda('fecha_fin')} {...register('fecha_fin')} />
        <MensajeCampo campo="fecha_fin" mensaje={errors.fecha_fin?.message} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label htmlFor="instalador_id">Instalador asignado (opcional)</Label>
        <NativeSelect id="instalador_id" className="w-full" {...ayuda('instalador_id')} {...register('instalador_id')}>
          <NativeSelectOption value="">Sin asignar por ahora</NativeSelectOption>
          {instaladores.map((instalador) => (
            <NativeSelectOption key={instalador.id} value={instalador.id}>
              {instalador.nombre}
              {instalador.especialidad ? ` · ${instalador.especialidad}` : ''}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <MensajeCampo campo="instalador_id" mensaje={errors.instalador_id?.message} />
      </div>
      {errorServidor && (
        <Alert variant="destructive" className="md:col-span-2">
          <AlertDescription>{errorServidor}</AlertDescription>
        </Alert>
      )}
      <div className="md:col-span-2">
        <Button type="submit" disabled={enviando}>
          <Plus aria-hidden="true" />
          {enviando ? 'Creando…' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  )
}
