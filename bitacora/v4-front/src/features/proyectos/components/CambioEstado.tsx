import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ESTADOS_PROYECTO, ETIQUETA_ESTADO, type EstadoProyecto } from '@/types/dominio'

type Props = {
  idProyecto: string
  nombreProyecto: string
  estadoActual: EstadoProyecto
  enCurso: boolean
  onAplicar: (estado: EstadoProyecto) => void
}

function esEstado(valor: string): valor is EstadoProyecto {
  return ESTADOS_PROYECTO.some((estado) => estado === valor)
}

export function CambioEstado({ idProyecto, nombreProyecto, estadoActual, enCurso, onAplicar }: Props) {
  const opciones = ESTADOS_PROYECTO.filter((estado) => estado !== estadoActual)
  const [destino, setDestino] = useState<EstadoProyecto | undefined>(opciones[0])
  const idSelect = `estado-${idProyecto}`

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={idSelect} className="sr-only">
        Nuevo estado de {nombreProyecto}
      </label>
      <NativeSelect
        id={idSelect}
        size="sm"
        value={destino}
        disabled={enCurso}
        onChange={(evento) => {
          if (esEstado(evento.target.value)) setDestino(evento.target.value)
        }}
      >
        {opciones.map((estado) => (
          <NativeSelectOption key={estado} value={estado}>
            {ETIQUETA_ESTADO[estado]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button
        size="sm"
        variant="secondary"
        disabled={enCurso || destino === undefined}
        onClick={() => {
          if (destino !== undefined) onAplicar(destino)
        }}
      >
        {enCurso ? 'Guardando…' : 'Cambiar estado'}
      </Button>
    </div>
  )
}
