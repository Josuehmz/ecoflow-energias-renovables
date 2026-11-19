-- =====================================================================
-- EcoFlow · pruebas de aceptación de la base (pgTAP)
-- Fuente: docs/ESPECIFICACION-TECNICA.md §6 (CA-01 … CA-17; 67 pruebas). Escritas ANTES que el SQL del esquema:
-- son el criterio con el que se evaluó cada versión que propuso la IA (docs/PROMPTS.md).
-- Correr:  supabase db reset && supabase test db
--
-- Usuarios de la semilla (supabase/seed.sql):
--   C = coordinadora  a1111111-…  (instalador b1111111-…)
--   A = instalador A  a2222222-…  (b2222222-…)  proyectos 1 (completado), 2 (en_progreso), 3 (pendiente)
--   B = instalador B  a3333333-…  (b3333333-…)  proyectos 4 (en_progreso), 5 y 7 (pendiente), 6 (completado)
--   I = inactivo      a4444444-…  (b4444444-…)  proyecto 9 (completado, historia)
--   Proyecto 8: pendiente, sin asignar.
-- Cada usuario se simula con `set local role authenticated` + `request.jwt.claims` (guía oficial de
-- Supabase para probar RLS). Todo corre en una transacción y termina en rollback.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(67);

-- Ayuda: ¿la columna es la primera de algún índice de la tabla?
create function pg_temp.tiene_indice(tabla regclass, columna name) returns boolean
language sql as $$
  select exists (
    select 1 from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = tabla and a.attname = columna
  )
$$;

-- Ayuda: cuántas filas tocó un UPDATE/DELETE. Es security INVOKER, así que la RLS de quien la llama
-- se aplica. (Un CTE con UPDATE dentro de una subconsulta no está permitido en PostgreSQL.)
create schema pruebas;
grant usage on schema pruebas to authenticated;
create function pruebas.filas(sentencia text) returns int
language plpgsql as $$
declare n int;
begin
  execute sentencia;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function pruebas.filas(text) to authenticated;

-- ---------------------------------------------------------------------
-- Estructura (CA-01, CA-02, CA-12, CA-16, índices §2.6)
-- ---------------------------------------------------------------------
select is(
  (select count(*)::int from pg_class
    where oid in ('public.instaladores'::regclass, 'public.proyectos'::regclass,
                  'public.materiales'::regclass, 'public.proyecto_materiales'::regclass)
      and relrowsecurity and relforcerowsecurity),
  4, 'CA-01 RLS habilitada y FORZADA en las 4 tablas');

select ok(
  not (has_table_privilege('anon', 'public.instaladores', 'select,insert,update,delete,truncate,references,trigger')
    or has_table_privilege('anon', 'public.proyectos', 'select,insert,update,delete,truncate,references,trigger')
    or has_table_privilege('anon', 'public.materiales', 'select,insert,update,delete,truncate,references,trigger')
    or has_table_privilege('anon', 'public.proyecto_materiales', 'select,insert,update,delete,truncate,references,trigger')
    or has_table_privilege('anon', 'public.resumen_proyectos_por_estado', 'select')),
  'CA-02 anon no tiene ningún privilegio sobre las tablas ni la vista');

select ok(
  not (has_table_privilege('authenticated', 'public.proyectos', 'truncate')
    or has_table_privilege('authenticated', 'public.instaladores', 'truncate')
    or has_table_privilege('authenticated', 'public.materiales', 'truncate')
    or has_table_privilege('authenticated', 'public.proyecto_materiales', 'truncate')),
  'S-2 authenticated no puede hacer TRUNCATE (RLS no lo filtra)');

select ok(
  not has_column_privilege('authenticated', 'public.proyectos', 'created_by', 'insert'),
  'I-3 el cliente no puede escribir created_by');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'privado' and p.proname in ('es_coordinador', 'mi_instalador_id')
      and p.prosecdef
      and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
  2, 'CA-16 es_coordinador() y mi_instalador_id() son security definer con search_path fijo');

-- (string_agg y no results_eq: results_eq sobre columnas de catálogo falla con
--  «could not determine which collation to use», un defecto de la prueba que se vio en v1.)
select is(
  (select string_agg(format('%s.%s %s', c.conrelid::regclass, a.attname, c.confdeltype), ', '
                     order by c.conrelid::regclass::text, a.attname::text)
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.conrelid in ('public.instaladores'::regclass, 'public.proyectos'::regclass,
                          'public.proyecto_materiales'::regclass)),
  'instaladores.user_id c, proyecto_materiales.material_id r, proyecto_materiales.proyecto_id c, '
  || 'proyectos.created_by n, proyectos.instalador_id r',
  'CA-12 cada FK tiene el ON DELETE de la especificación (c=cascade, r=restrict, n=set null)');

select ok(pg_temp.tiene_indice('public.proyectos', 'instalador_id'), '§2.6 índice en proyectos.instalador_id');
select ok(pg_temp.tiene_indice('public.proyectos', 'created_by'), '§2.6 índice en proyectos.created_by');
select ok(pg_temp.tiene_indice('public.proyectos', 'estado'), '§2.6 índice en proyectos.estado');
select ok(pg_temp.tiene_indice('public.proyecto_materiales', 'material_id'), '§2.6 índice en proyecto_materiales.material_id');

-- Añadida tras revisar v1 a mano (las 64 pruebas originales no lo cubrían): la semilla corre como
-- postgres, sin sesión de usuario; T-4 la trata como coordinador y debe conservar su created_by.
select is(
  (select count(*)::int from public.proyectos where created_by is null), 0,
  'I-3/T-4 los proyectos de la semilla (rol postgres, sin sesión) conservan created_by');

-- ---------------------------------------------------------------------
-- anon (CA-02)
-- ---------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok('select * from public.proyectos', '42501', null, 'CA-02 anon no puede leer proyectos');
select throws_ok('select * from public.resumen_proyectos_por_estado', '42501', null, 'CA-02 anon no puede leer el resumen');
reset role;

-- ---------------------------------------------------------------------
-- Instalador A
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a2222222-2222-4222-8222-222222222222", "role": "authenticated"}';

select set_eq(
  'select id from public.proyectos',
  $$values ('c0000000-0000-4000-8000-000000000001'::uuid), ('c0000000-0000-4000-8000-000000000002'::uuid),
           ('c0000000-0000-4000-8000-000000000003'::uuid)$$,
  'CA-03 A ve exactamente sus 3 proyectos');
select is_empty(
  $$select 1 from public.proyectos where id = 'c0000000-0000-4000-8000-000000000004'$$,
  'CA-03 A no ve el proyecto 4 de B ni pidiéndolo por id');
select is(
  pruebas.filas($$update public.proyectos set estado = 'completado'
                   where id = 'c0000000-0000-4000-8000-000000000004'$$),
  0, 'CA-04 A no modifica el proyecto de B (0 filas)');
select is(
  pruebas.filas($$delete from public.proyectos where id = 'c0000000-0000-4000-8000-000000000004'$$),
  0, 'CA-04 A no borra el proyecto de B (0 filas)');
select is(
  pruebas.filas($$delete from public.proyectos where id = 'c0000000-0000-4000-8000-000000000003'$$),
  0, 'CA-04 A tampoco borra su propio proyecto (borrar es del coordinador)');
select lives_ok(
  $$update public.proyectos set estado = 'en_progreso' where id = 'c0000000-0000-4000-8000-000000000003'$$,
  'CA-05 A avanza su proyecto 3 de pendiente a en_progreso');
select is(
  (select estado::text from public.proyectos where id = 'c0000000-0000-4000-8000-000000000003'),
  'en_progreso', 'CA-05 el proyecto 3 quedó en_progreso');
select ok(
  (select updated_at > created_at from public.proyectos where id = 'c0000000-0000-4000-8000-000000000003'),
  'CA-17 updated_at cambió con el UPDATE');
select throws_ok(
  $$update public.proyectos set cliente = 'Otro cliente' where id = 'c0000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'CA-06 A no cambia el cliente de su proyecto');
select throws_ok(
  $$update public.proyectos set instalador_id = 'b3333333-3333-4333-8333-333333333333'
     where id = 'c0000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'CA-06 A no se quita el proyecto ni se lo pasa a B');
select throws_like(
  $$update public.proyectos set estado = 'pendiente' where id = 'c0000000-0000-4000-8000-000000000002'$$,
  'Transición no permitida%', 'CA-08 A no retrocede en_progreso → pendiente');
select throws_like(
  $$update public.proyectos set estado = 'en_progreso' where id = 'c0000000-0000-4000-8000-000000000001'$$,
  'Transición no permitida%', 'CA-08 A no reabre un proyecto completado');
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio)
    values ('Intento', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, 10, '2027-01-01')$$,
  '42501', null, 'CA-07 A no crea proyectos');
select throws_ok(
  $$insert into public.materiales (nombre, tipo, unidad, costo_unitario, stock)
    values ('Material pirata', 'panel', 'unidad', 1, 1)$$,
  '42501', null, 'CA-07 A no crea materiales');
select is((select count(*)::int from public.materiales), 6, '§3 A lee todo el catálogo de materiales');
select is((select count(*)::int from public.instaladores), 1, '§3 A solo ve su propia fila de instaladores');
select is(
  pruebas.filas($$update public.instaladores set rol = 'coordinador'
                   where id = 'b2222222-2222-4222-8222-222222222222'$$),
  0, '§3 A no puede ascenderse a coordinador (0 filas)');
select is((select count(*)::int from public.proyecto_materiales), 8, 'CA-13 A ve solo los 8 consumos de sus proyectos');
select is_empty(
  $$select 1 from public.proyecto_materiales where proyecto_id = 'c0000000-0000-4000-8000-000000000004'$$,
  'CA-13 A no ve los materiales del proyecto 4 de B');
select results_eq(
  'select r.estado::text, r.total::int from public.resumen_proyectos_por_estado r order by r.estado',
  $$values ('pendiente', 0), ('en_progreso', 2), ('completado', 1)$$,
  'CA-14 el resumen de A cuenta solo lo suyo y trae el estado con 0');
reset role;

-- ---------------------------------------------------------------------
-- Instalador B
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a3333333-3333-4333-8333-333333333333", "role": "authenticated"}';

select is((select count(*)::int from public.proyectos), 4, 'CA-03 B ve exactamente sus 4 proyectos');
select is_empty(
  $$select 1 from public.proyectos where id = 'c0000000-0000-4000-8000-000000000002'$$,
  'CA-03 B no ve el proyecto 2 de A');
select throws_like(
  $$update public.proyectos set estado = 'completado' where id = 'c0000000-0000-4000-8000-000000000005'$$,
  'Transición no permitida%', 'CA-09 B no salta pendiente → completado');
select lives_ok(
  $$update public.proyectos set estado = 'completado' where id = 'c0000000-0000-4000-8000-000000000004'$$,
  'CA-05 B termina su proyecto 4 (en_progreso → completado)');
select results_eq(
  'select r.estado::text, r.total::int from public.resumen_proyectos_por_estado r order by r.estado',
  $$values ('pendiente', 2), ('en_progreso', 0), ('completado', 2)$$,
  'CA-14 el resumen de B cuenta solo lo suyo');
reset role;

-- ---------------------------------------------------------------------
-- Coordinadora
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select is((select count(*)::int from public.proyectos), 9, 'CA-10 la coordinadora ve los 9 proyectos');
select is((select count(*)::int from public.proyecto_materiales), 14, 'CA-13 la coordinadora ve los 14 consumos');
select is((select count(*)::int from public.instaladores), 4, '§3 la coordinadora ve a todo el personal');
select results_eq(
  'select r.estado::text, r.total::int from public.resumen_proyectos_por_estado r order by r.estado',
  $$values ('pendiente', 3), ('en_progreso', 2), ('completado', 4)$$,
  'CA-14 el resumen de la coordinadora cuenta todo');
select lives_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles,
                                  fecha_inicio, fecha_fin, instalador_id)
    values ('Parqueadero Solar Centro', 'Alcaldía de Prueba',
            'Carrera 1 # 1-1', 'Bogotá', 40, 90, '2027-03-01', '2027-04-01',
            'b2222222-2222-4222-8222-222222222222')$$,
  'CA-10 la coordinadora crea un proyecto asignado a A');
select is(
  (select created_by::text from public.proyectos where nombre = 'Parqueadero Solar Centro'),
  'b1111111-1111-4111-8111-111111111111', 'CA-10 created_by lo puso la base (la coordinadora)');
select is(
  (select estado::text from public.proyectos where nombre = 'Parqueadero Solar Centro'),
  'pendiente', '§2.3 un proyecto nuevo nace pendiente');
-- Añadida por el hallazgo de la auditoría de tipos (prompt 03): la máquina de estados solo vigilaba
-- los UPDATE, así que crear un proyecto ya «completado» era un salto pendiente → completado (T-2).
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio, estado, instalador_id)
    values ('Nace completado', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, 10, '2027-01-01', 'completado',
            'b2222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'T-6 ni la coordinadora crea un proyecto en un estado distinto de pendiente');
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio, created_by)
    values ('Falsificado', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, 10, '2027-01-01',
            'b2222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'I-3 ni la coordinadora puede fijar created_by desde el cliente');
select throws_like(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio, instalador_id)
    values ('Para inactivo', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, 10, '2027-01-01',
            'b4444444-4444-4444-8444-444444444444')$$,
  'Asignación no válida%', 'CA-15 no se asigna a personal inactivo');
select throws_like(
  $$update public.proyectos set instalador_id = 'b1111111-1111-4111-8111-111111111111'
     where id = 'c0000000-0000-4000-8000-000000000008'$$,
  'Asignación no válida%', 'CA-15 no se asigna a un coordinador');
select lives_ok(
  $$update public.proyectos set estado = 'en_progreso' where id = 'c0000000-0000-4000-8000-000000000001'$$,
  'CA-08 la coordinadora sí reabre un completado (retroceso)');
select throws_like(
  $$update public.proyectos set estado = 'completado' where id = 'c0000000-0000-4000-8000-000000000007'$$,
  'Transición no permitida%', 'CA-09 tampoco la coordinadora salta pendiente → completado');
select throws_ok(
  $$update public.proyectos set estado = 'en_progreso' where id = 'c0000000-0000-4000-8000-000000000008'$$,
  '23514', null, 'I-1 en_progreso sin instalador viola el CHECK');
select lives_ok(
  $$update public.instaladores set especialidad = 'Instalación residencial y comercial'
     where id = 'b2222222-2222-4222-8222-222222222222'$$,
  '§3 la coordinadora edita al personal');
select throws_ok(
  $$update public.instaladores set user_id = 'a4444444-4444-4444-8444-444444444444'
     where id = 'b2222222-2222-4222-8222-222222222222'$$,
  '42501', null, 'S-2 ni la coordinadora re-enlaza una ficha con otra cuenta (user_id sin UPDATE)');

-- CHECKs (CA-11), como coordinadora para que la RLS no tape el error.
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio)
    values ('Cero kWp', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 0, 10, '2027-01-01')$$,
  '23514', null, 'CA-11 capacidad_kwp = 0 rechazada');
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio)
    values ('Paneles negativos', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, -1, '2027-01-01')$$,
  '23514', null, 'CA-11 numero_paneles negativo rechazado');
select throws_ok(
  $$insert into public.proyectos (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles, fecha_inicio, fecha_fin)
    values ('Fechas al revés', 'Cliente X', 'Calle 1 # 2-3', 'Bogotá', 5, 10, '2027-02-01', '2027-01-01')$$,
  '23514', null, 'CA-11 fecha_fin anterior a fecha_inicio rechazada');
select throws_ok(
  $$insert into public.proyecto_materiales (proyecto_id, material_id, cantidad)
    values ('c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 0)$$,
  '23514', null, 'CA-11 cantidad 0 rechazada');
select throws_ok(
  $$insert into public.materiales (nombre, tipo, unidad, costo_unitario, stock)
    values ('Costo negativo', 'panel', 'unidad', -1, 1)$$,
  '23514', null, 'CA-11 costo_unitario negativo rechazado');
select throws_ok(
  $$insert into public.materiales (nombre, tipo, unidad, costo_unitario, stock)
    values ('Stock negativo', 'panel', 'unidad', 1, -5)$$,
  '23514', null, 'CA-11 stock negativo rechazado');
select lives_ok(
  $$delete from public.proyectos where id = 'c0000000-0000-4000-8000-000000000006'$$,
  'CA-12 la coordinadora borra el proyecto 6');
reset role;

-- ---------------------------------------------------------------------
-- Instalador inactivo (S-4)
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "a4444444-4444-4444-8444-444444444444", "role": "authenticated"}';
select is((select count(*)::int from public.proyectos), 0, 'S-4 el inactivo no ve proyectos, ni su historia');
select results_eq(
  'select r.estado::text, r.total::int from public.resumen_proyectos_por_estado r order by r.estado',
  $$values ('pendiente', 0), ('en_progreso', 0), ('completado', 0)$$,
  'CA-14 el resumen trae los 3 estados aunque todos estén en 0');
reset role;

-- ---------------------------------------------------------------------
-- Integridad referencial (CA-12), como postgres
-- ---------------------------------------------------------------------
select is(
  (select count(*)::int from public.proyecto_materiales where proyecto_id = 'c0000000-0000-4000-8000-000000000006'),
  0, 'CA-12 borrar el proyecto 6 borró sus consumos (CASCADE)');
select throws_ok(
  $$delete from public.instaladores where id = 'b2222222-2222-4222-8222-222222222222'$$,
  '23503', null, 'CA-12 no se borra a un instalador con proyectos (RESTRICT)');
select throws_ok(
  $$delete from auth.users where id = 'a4444444-4444-4444-8444-444444444444'$$,
  '23503', null, 'CA-12 tampoco su cuenta: la cascada a instaladores choca con el RESTRICT');
select throws_ok(
  $$delete from public.materiales where id = 'd0000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'CA-12 no se borra un material en uso (RESTRICT)');

select * from finish();
rollback;
