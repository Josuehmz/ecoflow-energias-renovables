# Prompt 01 — Esquema, RLS y reglas de negocio en SQL

**Objetivo del paso:** que la IA traduzca la especificación (§2, §3, §4) a una sola migración SQL
de Supabase. La especificación va completa como contexto; el prompt no repite las reglas, las cita.
Las 64 pruebas de aceptación (`supabase/tests/database/ecoflow_aceptacion.test.sql`) ya existían y
**no** se le mostraron a la IA en esta vuelta: son el examen, no la guía.

## Prompt literal

```text
[Contexto adjunto: docs/ESPECIFICACION-TECNICA.md, completo]

Actúa con el rol de la sección 0 de la especificación adjunta.

Tarea: escribe la migración SQL inicial de Supabase (PostgreSQL 17) que implementa las secciones
2, 3 y 4 de la especificación, para el archivo supabase/migrations/<timestamp>_esquema_ecoflow.sql.

Debe incluir, en este orden y con un comentario de cabecera por bloque:
1. Tipos enumerados (§2.1).
2. Tablas instaladores, proyectos, materiales y proyecto_materiales con TODAS las restricciones
   de §2 en la base (NOT NULL, CHECK, UNIQUE, FK con el ON DELETE indicado) e índices de §2.6.
3. Trigger genérico de updated_at.
4. Esquema `privado` con las funciones auxiliares de §3 (S-3).
5. Trigger de reglas de proyectos: asignación (I-2), created_by (I-3), máquina de estados (§4,
   T-1 a T-5) y la restricción «el asignado solo cambia estado». Usa los SQLSTATE y los prefijos de
   mensaje de la tabla de §4.
6. Vista resumen_proyectos_por_estado (§2.7).
7. RLS: enable + force en las cuatro tablas, revoke/grant (S-2) y una política por operación y
   tabla según la matriz de §3. Nada para anon.

Restricciones:
- Nada que no esté en la especificación (ni tablas, ni columnas, ni roles nuevos).
- En las políticas, envuelve auth.uid() y las funciones auxiliares en (select ...) para que
  PostgreSQL las evalúe una vez por consulta.
- La migración debe poder aplicarse con `supabase db reset` sobre una base vacía.
- Archivo completo, sin fragmentos ni «...». Después del SQL, una lista breve de las decisiones que
  tomaste donde la especificación no era explícita.
```

## Respuesta y verificación

- Respuesta literal: [v1-esquema/respuesta.md](v1-esquema/respuesta.md)
- SQL propuesto sin editar: [v1-esquema/migracion.sql](v1-esquema/migracion.sql)
- Resultado de las 64 pruebas contra esa versión: [v1-esquema/verificacion.txt](v1-esquema/verificacion.txt)
