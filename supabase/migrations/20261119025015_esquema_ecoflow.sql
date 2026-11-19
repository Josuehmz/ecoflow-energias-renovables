-- =============================================================================
-- supabase/migrations/20261119025015_esquema_ecoflow.sql
-- EcoFlow: esquema inicial, reglas de negocio y RLS (especificación §2, §3 y §4)
-- PostgreSQL 17 (Supabase). Se aplica sobre una base vacía con `supabase db reset`.
--
-- v2 (especificación 1.2, I-3): created_by se protege con privilegios por
-- columna y un DEFAULT, no con un trigger que lo sobrescribe en silencio; las
-- columnas de sistema (id, created_by, created_at, updated_at) dejan de ser
-- escribibles por authenticated en instaladores, proyectos y materiales.
-- =============================================================================


-- =============================================================================
-- 1. Tipos enumerados (§2.1)
--    El orden de declaración es el orden de la máquina de estados (§4).
-- =============================================================================

create type public.estado_proyecto as enum ('pendiente', 'en_progreso', 'completado');

create type public.rol_equipo as enum ('instalador', 'coordinador');

create type public.tipo_material as enum (
  'panel', 'inversor', 'estructura', 'cableado', 'proteccion', 'bateria'
);


-- =============================================================================
-- 2. Tablas, restricciones e índices (§2.2 a §2.6)
--    Todas las reglas de §2 viven en la base: NOT NULL, CHECK, UNIQUE y FK con
--    el ON DELETE indicado. Las reglas que miran otra tabla (I-2) van en el
--    trigger del bloque 5.
-- =============================================================================

-- 2.2 instaladores: personal de la empresa (incluye coordinadores)
create table public.instaladores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null
                   constraint instaladores_user_id_key unique
                   constraint instaladores_user_id_fkey
                     references auth.users (id) on delete cascade,
  nombre         text not null
                   constraint instaladores_nombre_longitud
                     check (char_length(btrim(nombre)) between 2 and 120),
  email          text not null
                   constraint instaladores_email_key unique
                   constraint instaladores_email_minusculas
                     check (email = lower(email))
                   constraint instaladores_email_formato
                     check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  especialidad   text,
  certificacion  text,
  rol            public.rol_equipo not null default 'instalador',
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.instaladores is
  'Personal de EcoFlow (instaladores y coordinadores). Baja lógica con activo = false.';

-- 2.3 proyectos: obras de instalación
create table public.proyectos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null
                    constraint proyectos_nombre_longitud
                      check (char_length(btrim(nombre)) between 3 and 120),
  cliente         text not null
                    constraint proyectos_cliente_longitud
                      check (char_length(btrim(cliente)) between 2 and 120),
  direccion       text not null
                    constraint proyectos_direccion_longitud
                      check (char_length(btrim(direccion)) between 5 and 200),
  ciudad          text not null
                    constraint proyectos_ciudad_longitud
                      check (char_length(btrim(ciudad)) between 2 and 80),
  capacidad_kwp   numeric(8,2) not null
                    constraint proyectos_capacidad_kwp_rango
                      check (capacidad_kwp > 0 and capacidad_kwp <= 10000),
  numero_paneles  integer not null
                    constraint proyectos_numero_paneles_rango
                      check (numero_paneles > 0 and numero_paneles <= 50000),
  fecha_inicio    date not null,
  fecha_fin       date,
  estado          public.estado_proyecto not null default 'pendiente',
  instalador_id   uuid
                    constraint proyectos_instalador_id_fkey
                      references public.instaladores (id) on delete restrict,
  created_by      uuid
                    constraint proyectos_created_by_fkey
                      references public.instaladores (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint proyectos_fechas_orden
    check (fecha_fin is null or fecha_fin >= fecha_inicio),

  -- I-1: un proyecto en en_progreso o completado tiene instalador.
  constraint proyectos_estado_requiere_instalador
    check (estado = 'pendiente' or instalador_id is not null)
);

comment on table public.proyectos is
  'Obras de instalación fotovoltaica. Estado gobernado por la máquina de estados de §4.';
comment on column public.proyectos.created_by is
  'Lo pone la base (I-3): DEFAULT privado.mi_instalador_id(). authenticated no tiene INSERT ni UPDATE sobre la columna (42501); postgres y service_role sí pueden fijarlo.';

-- 2.4 materiales: catálogo
create table public.materiales (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null
                    constraint materiales_nombre_key unique
                    constraint materiales_nombre_longitud
                      check (char_length(btrim(nombre)) between 2 and 120),
  tipo            public.tipo_material not null,
  unidad          text not null
                    constraint materiales_unidad_valida
                      check (unidad in ('unidad', 'metro', 'kit', 'rollo')),
  costo_unitario  numeric(12,2) not null
                    constraint materiales_costo_unitario_no_negativo
                      check (costo_unitario >= 0),
  stock           integer not null default 0
                    constraint materiales_stock_no_negativo
                      check (stock >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.materiales is 'Catálogo de materiales de instalación.';

-- 2.5 proyecto_materiales: relación N:M
create table public.proyecto_materiales (
  proyecto_id  uuid not null
                 constraint proyecto_materiales_proyecto_id_fkey
                   references public.proyectos (id) on delete cascade,
  material_id  uuid not null
                 constraint proyecto_materiales_material_id_fkey
                   references public.materiales (id) on delete restrict,
  cantidad     integer not null
                 constraint proyecto_materiales_cantidad_positiva
                   check (cantidad > 0),

  constraint proyecto_materiales_pkey primary key (proyecto_id, material_id)
);

comment on table public.proyecto_materiales is
  'Consumo de materiales por proyecto. Se borra en cascada con el proyecto.';

-- 2.6 Índices
--   instaladores(user_id): ya lo da el UNIQUE.
--   proyecto_materiales(proyecto_id): ya es prefijo de la PK.
create index proyectos_instalador_id_idx      on public.proyectos (instalador_id);
create index proyectos_created_by_idx         on public.proyectos (created_by);
create index proyectos_estado_idx             on public.proyectos (estado);
create index proyecto_materiales_material_id_idx on public.proyecto_materiales (material_id);


-- =============================================================================
-- 3. Trigger genérico de updated_at
--    clock_timestamp() en vez de now(): now() es fijo dentro de una transacción
--    y updated_at no cambiaría si la fila se crea y se modifica en la misma.
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: actualiza updated_at en cada modificación.';

-- Justificación: es una función de trigger; nadie debe poder invocarla por la API.
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger trg_instaladores_updated_at
  before update on public.instaladores
  for each row execute function public.set_updated_at();

create trigger trg_proyectos_updated_at
  before update on public.proyectos
  for each row execute function public.set_updated_at();

create trigger trg_materiales_updated_at
  before update on public.materiales
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 4. Esquema privado y funciones auxiliares (§3, S-3 y S-4)
--    Justificación: el esquema `privado` no está en los esquemas expuestos por
--    la API, así que estas funciones no son invocables como RPC.
--    security definer + search_path vacío: leen instaladores sin depender de la
--    RLS de quien llama (evita recursión en las políticas de instaladores) y sin
--    que un objeto homónimo en otro esquema pueda suplantar a las tablas.
-- =============================================================================

create schema if not exists privado;

-- Justificación: nadie más que los roles que evalúan políticas necesita el esquema.
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated, service_role;

-- ¿La sesión es de un coordinador ACTIVO? (S-4: un inactivo no es coordinador)
create or replace function privado.es_coordinador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.instaladores i
    where i.user_id = (select auth.uid())
      and i.rol = 'coordinador'::public.rol_equipo
      and i.activo
  );
$$;

comment on function privado.es_coordinador() is
  'true si el usuario de la sesión es coordinador activo (S-3, S-4).';

-- id de instaladores de la sesión; NULL si no tiene fila o está inactivo (S-4)
create or replace function privado.mi_instalador_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id
  from public.instaladores i
  where i.user_id = (select auth.uid())
    and i.activo;
$$;

comment on function privado.mi_instalador_id() is
  'id de instaladores del usuario de la sesión si está activo; NULL en otro caso (S-3, S-4).';

-- Justificación: por defecto PostgreSQL concede EXECUTE a PUBLIC; solo
-- authenticated (políticas) y service_role las necesitan.
revoke all on function privado.es_coordinador()   from public, anon;
revoke all on function privado.mi_instalador_id() from public, anon;
grant execute on function privado.es_coordinador()   to authenticated, service_role;
grant execute on function privado.mi_instalador_id() to authenticated, service_role;

-- I-3: el valor por defecto de created_by es el instalador de la sesión. Se
-- fija aquí y no en el CREATE TABLE porque la función se crea después de la
-- tabla (su cuerpo SQL necesita que public.instaladores ya exista).
-- Un DEFAULT solo se aplica si la sentencia no trae la columna: la semilla
-- (postgres, sin sesión) conserva el valor que escribe, y sin sesión y sin
-- valor queda NULL (auth.uid() es NULL). El cliente no puede traer la columna
-- porque no tiene privilegio sobre ella (bloque 7.2).
alter table public.proyectos
  alter column created_by set default privado.mi_instalador_id();


-- =============================================================================
-- 5. Trigger de reglas de proyectos (I-2, §4 T-1 a T-5 y «el asignado
--    solo cambia estado»)
--    v2: el trigger ya no toca created_by (ni en INSERT ni en UPDATE). I-3 lo
--    resuelven el DEFAULT del bloque 4 y los grants por columna del bloque 7.2.
--    security invoker a propósito: así current_user es el rol real de quien
--    hace el cambio y T-4 puede distinguir una sesión sin usuario (postgres,
--    service_role) de un usuario autenticado. Las consultas que necesitan
--    saltarse la RLS van por las funciones definer del bloque 4.
--
--    Errores (tabla de §4):
--      P0001 «Transición no permitida…»  T-2 y T-3
--      P0001 «Asignación no válida…»     I-2
--      42501 «Solo un coordinador…»      no coordinador cambia algo distinto de estado
-- =============================================================================

create or replace function privado.reglas_proyectos()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_es_coordinador boolean;
  v_mi_id          uuid;
  v_desde          integer;
  v_hasta          integer;
  v_rol            public.rol_equipo;
  v_activo         boolean;
begin
  -- T-4: un cambio sin sesión de usuario (postgres, service_role, Studio,
  -- acciones referenciales) cuenta como coordinador.
  v_es_coordinador := current_user not in ('anon', 'authenticated')
                      or coalesce(privado.es_coordinador(), false);
  v_mi_id := privado.mi_instalador_id();

  if tg_op = 'INSERT' then
    -- Defensa en profundidad: la política de INSERT ya lo impide, pero este
    -- trigger corre antes que la política y así el error es el correcto (42501)
    -- en vez de una validación de asignación.
    if not v_es_coordinador then
      raise exception 'Solo un coordinador puede crear proyectos'
        using errcode = '42501';
    end if;

  else  -- UPDATE
    -- «El asignado solo cambia estado» (§3): cualquier otra columna -> 42501.
    if not v_es_coordinador
       and (to_jsonb(new) - 'estado' - 'updated_at')
           is distinct from
           (to_jsonb(old) - 'estado' - 'updated_at') then
      raise exception 'Solo un coordinador puede modificar datos del proyecto distintos del estado'
        using errcode = '42501',
              hint = 'Como instalador asignado solo puedes cambiar la columna estado.';
    end if;

    -- Máquina de estados (§4).
    if new.estado is distinct from old.estado then
      v_desde := array_position(enum_range(null::public.estado_proyecto), old.estado);
      v_hasta := array_position(enum_range(null::public.estado_proyecto), new.estado);

      if v_hasta - v_desde >= 2 then
        -- T-2: saltar un paso, nadie (tampoco un coordinador ni postgres).
        raise exception 'Transición no permitida: de «%» a «%». Una obra no puede completarse sin haber empezado; primero debe pasar por «en_progreso».',
          old.estado, new.estado
          using errcode = 'P0001';

      elsif v_hasta < v_desde then
        -- T-3: retroceder, solo un coordinador.
        if not v_es_coordinador then
          raise exception 'Transición no permitida: de «%» a «%». Solo un coordinador puede retroceder el estado de un proyecto (reabrir o reprogramar).',
            old.estado, new.estado
            using errcode = 'P0001';
        end if;

      else
        -- T-1: avanzar un paso, el asignado o un coordinador.
        if not v_es_coordinador
           and (old.instalador_id is null or v_mi_id is null
                or old.instalador_id <> v_mi_id) then
          raise exception 'Transición no permitida: de «%» a «%». Solo el instalador asignado o un coordinador puede avanzar este proyecto.',
            old.estado, new.estado
            using errcode = 'P0001';
        end if;
      end if;
    end if;
  end if;

  -- I-2: solo se asigna a personal activo con rol instalador. Se valida al
  -- crear y cuando cambia el asignado (la historia con un instalador que hoy
  -- está inactivo no se invalida). Si el id no existe, decide la FK (23503).
  if new.instalador_id is not null
     and (tg_op = 'INSERT' or new.instalador_id is distinct from old.instalador_id) then
    select i.rol, i.activo
      into v_rol, v_activo
      from public.instaladores i
     where i.id = new.instalador_id;

    if found then
      if v_rol <> 'instalador'::public.rol_equipo then
        raise exception 'Asignación no válida: un proyecto solo se asigna a personal con rol instalador, no a un coordinador.'
          using errcode = 'P0001';
      elsif not v_activo then
        raise exception 'Asignación no válida: el instalador está inactivo y no puede recibir proyectos.'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function privado.reglas_proyectos() is
  'Trigger BEFORE INSERT/UPDATE de proyectos: I-2, máquina de estados (§4) y restricción de columnas del asignado. No toca created_by (I-3 va por DEFAULT y grants por columna).';

-- Justificación: función de trigger; no debe invocarse directamente.
revoke all on function privado.reglas_proyectos() from public, anon, authenticated;

-- El nombre «trg_proyectos_reglas» ordena antes que «trg_proyectos_updated_at»:
-- primero se validan las reglas y después se sella updated_at.
create trigger trg_proyectos_reglas
  before insert or update on public.proyectos
  for each row execute function privado.reglas_proyectos();


-- =============================================================================
-- 6. Vista resumen_proyectos_por_estado (§2.7)
--    Una fila por estado aunque tenga cero proyectos (se parte del enum).
--    security_invoker = true: la vista aplica la RLS de quien consulta, así un
--    instalador cuenta solo sus proyectos (CA-14).
-- =============================================================================

create view public.resumen_proyectos_por_estado
with (security_invoker = true)
as
select
  e.estado,
  count(p.id) as total
from unnest(enum_range(null::public.estado_proyecto)) as e (estado)
left join public.proyectos p
  on p.estado = e.estado
group by e.estado
order by e.estado;

comment on view public.resumen_proyectos_por_estado is
  'Conteo de proyectos por estado visible para quien consulta (respeta RLS); siempre 3 filas.';


-- =============================================================================
-- 7. RLS: enable + force, privilegios y políticas (§3)
-- =============================================================================

-- 7.1 S-1: RLS habilitada y forzada (force: también aplica al dueño de la tabla).
alter table public.instaladores        enable row level security;
alter table public.instaladores        force  row level security;
alter table public.proyectos           enable row level security;
alter table public.proyectos           force  row level security;
alter table public.materiales          enable row level security;
alter table public.materiales          force  row level security;
alter table public.proyecto_materiales enable row level security;
alter table public.proyecto_materiales force  row level security;

-- 7.2 S-2: en Supabase las tablas nacen con todo concedido a anon y
-- authenticated; las políticas no quitan privilegios, así que se revoca todo y
-- se concede solo lo necesario. anon queda sin nada (herramienta interna).
revoke all on table public.instaladores                 from anon, authenticated;
revoke all on table public.proyectos                    from anon, authenticated;
revoke all on table public.materiales                   from anon, authenticated;
revoke all on table public.proyecto_materiales          from anon, authenticated;
revoke all on table public.resumen_proyectos_por_estado from anon, authenticated;

-- v2: SELECT y DELETE siguen siendo de tabla (leer y borrar filas no escribe
-- columnas; la fila exacta la decide la política). INSERT y UPDATE pasan a ser
-- por columna: solo las columnas de negocio. Las columnas de sistema
-- (id, created_by, created_at, updated_at) las pone la base con DEFAULT o
-- trigger, y si el cliente las nombra recibe 42501 por falta de privilegio.
-- Un trigger BEFORE puede asignarlas igual: el privilegio se comprueba sobre
-- las columnas que nombra la sentencia, no sobre lo que escribe el trigger.

-- ---- instaladores --------------------------------------------------------
-- SELECT de tabla: la política deja ver la fila propia o todas al coordinador.
grant select on table public.instaladores to authenticated;
-- INSERT por columna: el coordinador da de alta personal con sus datos y su
-- cuenta (user_id); id, created_at y updated_at los pone la base.
grant insert (user_id, nombre, email, especialidad, certificacion, rol, activo)
  on table public.instaladores to authenticated;
-- UPDATE por columna: el coordinador edita datos, rol y baja lógica; las
-- columnas de sistema no se reescriben desde el cliente.
-- Ajuste del arquitecto sobre v2 (la IA lo señaló sin aplicarlo): user_id tampoco es editable.
-- Volver a enlazar una ficha con OTRA cuenta de Auth le pasaría a esa cuenta la historia y los
-- proyectos asignados; un cambio de cuenta se hace con una ficha nueva y la vieja inactiva.
grant update (nombre, email, especialidad, certificacion, rol, activo)
  on table public.instaladores to authenticated;
-- DELETE de tabla: solo el coordinador (política); la FK RESTRICT protege la historia.
grant delete on table public.instaladores to authenticated;

-- ---- proyectos -----------------------------------------------------------
-- SELECT de tabla: la política limita a lo asignado o todo para el coordinador.
grant select on table public.proyectos to authenticated;
-- INSERT por columna (I-3): todo lo editable menos id, created_by, created_at y
-- updated_at; created_by sale del DEFAULT privado.mi_instalador_id().
grant insert (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles,
              fecha_inicio, fecha_fin, estado, instalador_id)
  on table public.proyectos to authenticated;
-- UPDATE por columna (I-3): las mismas columnas; created_by no es editable por
-- nadie con sesión, ni siquiera el coordinador. Que el asignado solo toque
-- estado lo sigue imponiendo el trigger del bloque 5.
grant update (nombre, cliente, direccion, ciudad, capacidad_kwp, numero_paneles,
              fecha_inicio, fecha_fin, estado, instalador_id)
  on table public.proyectos to authenticated;
-- DELETE de tabla: solo el coordinador (política).
grant delete on table public.proyectos to authenticated;

-- ---- materiales ----------------------------------------------------------
-- SELECT de tabla: cualquier autenticado ve el catálogo (política using true).
grant select on table public.materiales to authenticated;
-- INSERT por columna: el coordinador da de alta materiales; id, created_at y
-- updated_at los pone la base.
grant insert (nombre, tipo, unidad, costo_unitario, stock)
  on table public.materiales to authenticated;
-- UPDATE por columna: el coordinador edita el catálogo y el stock, no las
-- columnas de sistema.
grant update (nombre, tipo, unidad, costo_unitario, stock)
  on table public.materiales to authenticated;
-- DELETE de tabla: solo el coordinador (política); la FK RESTRICT impide borrar un material en uso.
grant delete on table public.materiales to authenticated;

-- ---- proyecto_materiales -------------------------------------------------
-- Se mantiene de tabla: no tiene columnas de sistema; sus tres columnas
-- (proyecto_id, material_id, cantidad) son datos de negocio que el
-- coordinador escribe, y las filas las filtra la política.
grant select, insert, update, delete on table public.proyecto_materiales to authenticated;

-- ---- vista ---------------------------------------------------------------
-- Solo lectura; la RLS de proyectos se aplica por security_invoker.
grant select on table public.resumen_proyectos_por_estado to authenticated;

-- 7.3 Políticas: una por operación y tabla, solo para authenticated.
-- auth.uid() y las auxiliares van envueltas en (select ...) para que se
-- evalúen una vez por consulta y no una vez por fila.

-- ---- instaladores --------------------------------------------------------
-- SELECT: su propia fila (también si está inactivo, para que la app muestre su
-- perfil); el coordinador ve todas.
create policy instaladores_select
  on public.instaladores
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select privado.es_coordinador())
  );

create policy instaladores_insert
  on public.instaladores
  for insert
  to authenticated
  with check ((select privado.es_coordinador()));

-- Solo el coordinador modifica personal, incluido el rol (nadie se asigna un rol).
create policy instaladores_update
  on public.instaladores
  for update
  to authenticated
  using ((select privado.es_coordinador()))
  with check ((select privado.es_coordinador()));

create policy instaladores_delete
  on public.instaladores
  for delete
  to authenticated
  using ((select privado.es_coordinador()));

-- ---- proyectos -----------------------------------------------------------
-- SELECT: el asignado (activo, S-4) o un coordinador.
create policy proyectos_select
  on public.proyectos
  for select
  to authenticated
  using (
    (select privado.es_coordinador())
    or instalador_id = (select privado.mi_instalador_id())
  );

create policy proyectos_insert
  on public.proyectos
  for insert
  to authenticated
  with check ((select privado.es_coordinador()));

-- UPDATE: coordinador, o el asignado. Que el asignado solo toque `estado` y
-- respete la máquina de estados lo impone el trigger del bloque 5.
-- WITH CHECK impide que la fila resultante quede fuera de su alcance.
create policy proyectos_update
  on public.proyectos
  for update
  to authenticated
  using (
    (select privado.es_coordinador())
    or instalador_id = (select privado.mi_instalador_id())
  )
  with check (
    (select privado.es_coordinador())
    or instalador_id = (select privado.mi_instalador_id())
  );

create policy proyectos_delete
  on public.proyectos
  for delete
  to authenticated
  using ((select privado.es_coordinador()));

-- ---- materiales ----------------------------------------------------------
-- SELECT: cualquier autenticado (el catálogo no es sensible dentro de la empresa).
create policy materiales_select
  on public.materiales
  for select
  to authenticated
  using (true);

create policy materiales_insert
  on public.materiales
  for insert
  to authenticated
  with check ((select privado.es_coordinador()));

create policy materiales_update
  on public.materiales
  for update
  to authenticated
  using ((select privado.es_coordinador()))
  with check ((select privado.es_coordinador()));

create policy materiales_delete
  on public.materiales
  for delete
  to authenticated
  using ((select privado.es_coordinador()));

-- ---- proyecto_materiales -------------------------------------------------
-- SELECT: si el proyecto es visible para quien consulta. La subconsulta sobre
-- proyectos pasa por la RLS de proyectos, así la regla tiene una sola fuente.
create policy proyecto_materiales_select
  on public.proyecto_materiales
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.proyectos p
      where p.id = proyecto_materiales.proyecto_id
    )
  );

create policy proyecto_materiales_insert
  on public.proyecto_materiales
  for insert
  to authenticated
  with check ((select privado.es_coordinador()));

create policy proyecto_materiales_update
  on public.proyecto_materiales
  for update
  to authenticated
  using ((select privado.es_coordinador()))
  with check ((select privado.es_coordinador()));

create policy proyecto_materiales_delete
  on public.proyecto_materiales
  for delete
  to authenticated
  using ((select privado.es_coordinador()));

-- Fin de la migración.
