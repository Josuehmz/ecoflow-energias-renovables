-- =====================================================================
-- EcoFlow · datos de prueba (semilla) — docs/ESPECIFICACION-TECNICA.md §7
-- Se carga con `supabase db reset` después de las migraciones. Corre como `postgres`.
-- UUID fijos para que las pruebas (supabase/tests) y el video sean reproducibles.
--
-- Usuarios de prueba (SOLO para el Supabase local; contraseña de semilla, no es un secreto):
--   laura.coordinadora@ecoflow.test   coordinador
--   andres.instalador@ecoflow.test    instalador A
--   beatriz.instaladora@ecoflow.test  instalador B
--   carlos.inactivo@ecoflow.test      instalador inactivo (tiene historia, no ve nada)
--   Contraseña de los cuatro: EcoFlow-Local-2026
-- =====================================================================

-- 1. Cuentas de Auth (auth.users + auth.identities), como las crearía GoTrue.
--    Los campos *_token van en '' y no en NULL: GoTrue falla al leer NULL en ellos.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('EcoFlow-Local-2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('a1111111-1111-4111-8111-111111111111'::uuid, 'laura.coordinadora@ecoflow.test'),
  ('a2222222-2222-4222-8222-222222222222'::uuid, 'andres.instalador@ecoflow.test'),
  ('a3333333-3333-4333-8333-333333333333'::uuid, 'beatriz.instaladora@ecoflow.test'),
  ('a4444444-4444-4444-8444-444444444444'::uuid, 'carlos.inactivo@ecoflow.test')
) as u(id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email like '%@ecoflow.test';

-- 2. Personal. El rol se fija aquí (vía administrativa), nunca desde los metadatos del usuario.
insert into public.instaladores (id, user_id, nombre, email, especialidad, certificacion, rol, activo) values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Laura Gómez',   'laura.coordinadora@ecoflow.test',  'Planeación de obras',            'PMP',   'coordinador', true),
  ('b2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'Andrés Ruiz',   'andres.instalador@ecoflow.test',   'Instalación residencial',        'RETIE', 'instalador',  true),
  ('b3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'Beatriz Peña',  'beatriz.instaladora@ecoflow.test', 'Instalación comercial',          'RETIE', 'instalador',  true),
  ('b4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444', 'Carlos Méndez', 'carlos.inactivo@ecoflow.test',     'Sistemas aislados con baterías', null,    'instalador',  true);

-- 3. Catálogo de materiales.
insert into public.materiales (id, nombre, tipo, unidad, costo_unitario, stock) values
  ('d0000000-0000-4000-8000-000000000001', 'Panel monocristalino 450 W',      'panel',      'unidad',  520000.00,  400),
  ('d0000000-0000-4000-8000-000000000002', 'Inversor híbrido 5 kW',           'inversor',   'unidad', 4200000.00,   12),
  ('d0000000-0000-4000-8000-000000000003', 'Estructura coplanar de aluminio', 'estructura', 'kit',     380000.00,   60),
  ('d0000000-0000-4000-8000-000000000004', 'Cable solar 6 mm²',               'cableado',   'metro',     6500.00, 2500),
  ('d0000000-0000-4000-8000-000000000005', 'Protección DC 1000 V',            'proteccion', 'unidad',  210000.00,   80),
  ('d0000000-0000-4000-8000-000000000006', 'Batería de litio 5 kWh',          'bateria',    'unidad', 7800000.00,    6);

-- 4. Proyectos. Se insertan con su estado actual (historia importada); la regla de transición
--    vigila los UPDATE. Carlos aún está activo aquí: se desactiva al final.
insert into public.proyectos (id, nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles,
                              fecha_inicio, fecha_fin, estado, instalador_id, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'Techo solar Casa Rivera',         'Familia Rivera',              'Calle 127 # 15-20',           'Bogotá',           5.40,  12, '2026-09-01', '2026-09-05', 'completado',  'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000002', 'Autoconsumo Panadería La Espiga', 'Panadería La Espiga SAS',     'Carrera 7 # 12-45',           'Chía',            12.30,  28, '2026-11-03', '2026-11-28', 'en_progreso', 'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000003', 'Cubierta Colegio San Mateo',      'Colegio San Mateo',           'Avenida 15 # 3-10',           'Zipaquirá',       45.00, 100, '2026-12-01', '2027-01-20', 'pendiente',   'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000004', 'Bombeo solar Finca El Roble',     'Finca El Roble',              'Vereda La Aguadita km 4',     'Fusagasugá',       8.10,  18, '2026-11-10', '2026-11-30', 'en_progreso', 'b3333333-3333-4333-8333-333333333333', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000005', 'Bodega Logística Norte',          'Logística Norte SAS',         'Parque Industrial Bodega 12', 'Tocancipá',      120.00, 270, '2027-01-15', '2027-03-30', 'pendiente',   'b3333333-3333-4333-8333-333333333333', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000006', 'Clínica Santa Ana',               'Clínica Santa Ana',           'Calle 45 # 22-08',            'Bogotá',          60.00, 135, '2026-08-01', '2026-09-15', 'completado',  'b3333333-3333-4333-8333-333333333333', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000007', 'Supermercado La Cosecha',         'Comercializadora La Cosecha', 'Carrera 10 # 8-30',           'Cajicá',          25.50,  57, '2026-12-10', null,         'pendiente',   'b3333333-3333-4333-8333-333333333333', 'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000008', 'Hotel Mirador',                   'Hotel Mirador del Valle',     'Vía a Arcabuco km 2',         'Villa de Leyva',  30.00,  68, '2027-02-01', null,         'pendiente',   null,                                   'b1111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000009', 'Oficinas Andina',                 'Andina Consultores',          'Calle 93 # 11-26 piso 4',     'Bogotá',          15.00,  34, '2026-06-01', '2026-06-20', 'completado',  'b4444444-4444-4444-8444-444444444444', 'b1111111-1111-4111-8111-111111111111');

-- 5. Materiales usados por proyecto (N:M).
insert into public.proyecto_materiales (proyecto_id, material_id, cantidad) values
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',  12),
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',   1),
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',   3),
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004',  40),
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005',   2),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',  28),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',   3),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004',  90),
  ('c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001',  18),
  ('c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000006',   2),
  ('c0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001', 135),
  ('c0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002',  10),
  ('c0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000005',   8),
  ('c0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000001',  20);

-- 6. Carlos deja la empresa: baja lógica (no se borra porque tiene un proyecto en su historia).
update public.instaladores set activo = false where id = 'b4444444-4444-4444-8444-444444444444';
