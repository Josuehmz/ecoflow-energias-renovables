import type { Instalador, ProyectoConInstalador } from '@/types/dominio'

export function proyecto(parcial: Partial<ProyectoConInstalador> = {}): ProyectoConInstalador {
  return {
    id: 'c0000000-0000-4000-8000-000000000001',
    nombre: 'Techo solar Casa Rivera',
    cliente: 'Familia Rivera',
    direccion: 'Calle 127 # 15-20',
    ciudad: 'Bogotá',
    capacidad_kwp: 5.4,
    numero_paneles: 12,
    fecha_inicio: '2026-09-01',
    fecha_fin: '2026-09-05',
    estado: 'pendiente',
    instalador_id: 'b2222222-2222-4222-8222-222222222222',
    created_by: 'b1111111-1111-4111-8111-111111111111',
    created_at: '2026-11-18T00:00:00Z',
    updated_at: '2026-11-18T00:00:00Z',
    instalador: { nombre: 'Andrés Ruiz' },
    ...parcial,
  }
}

export function instalador(parcial: Partial<Instalador> = {}): Instalador {
  return {
    id: 'b2222222-2222-4222-8222-222222222222',
    user_id: 'a2222222-2222-4222-8222-222222222222',
    nombre: 'Andrés Ruiz',
    email: 'andres.instalador@ecoflow.test',
    especialidad: 'Instalación residencial',
    certificacion: 'RETIE',
    rol: 'instalador',
    activo: true,
    created_at: '2026-11-18T00:00:00Z',
    updated_at: '2026-11-18T00:00:00Z',
    ...parcial,
  }
}
