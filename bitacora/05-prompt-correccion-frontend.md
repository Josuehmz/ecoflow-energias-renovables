# Prompt 05 — Corrección de v4 con la verificación y las capturas

**Objetivo del paso:** corregir v4 solo donde la evidencia dice que falla. v4 compiló (tsc 0) y el
build pasó, pero oxlint dio 1 aviso y Vitest 23 de 25. Además se corrió v4 en el navegador contra el
Supabase local (coordinadora e instalador reales de la semilla) y las capturas mostraron tres
problemas que ninguna prueba veía. El prompt cita las salidas literales.

**Quién respondió:** el asistente de la sesión principal (ver [03-prompt-tipos.md](03-prompt-tipos.md)).

## Prompt literal

```text
[Contexto adjunto: tu respuesta v4 (bitacora/v4-front/src), bitacora/v4-front/verificacion.txt y
 cuatro capturas de v4 corriendo contra el Supabase local]

v4 compila y construye, pero la verificación falla en tres puntos y las capturas muestran otros
tres. Corrige SOLO esto y devuelve completos únicamente los archivos que cambien.

Verificación (salida literal):
1. oxlint:
   src/components/PantallaCarga.tsx:5:96: warning jsx-a11y(prefer-tag-over-role): Prefer `output`
   over `role` attribute `status`.
2. Vitest, proyectoSchema.test.ts:
   expected 'La capacidad es un número con máximo …' to be 'Escribe la capacidad en kWp.'
   Con la capacidad vacía el esquema emite DOS issues (min(1) y regex) en el mismo campo; el
   formulario muestra el primero, pero el esquema no debería producir el segundo. Haz que el
   primer fallo de cada cadena corte las demás comprobaciones de ese campo.
3. Vitest, useCrearProyecto.test.tsx: «Unknown Error: Asignación no válida: …» aunque el hook
   captura el rechazo (crearProyecto se llama 1 vez y settledResults dice rejected). Con
   mockRejectedValueOnce la misma prueba pasa; mockRejectedValue persistente falla en Vitest 5.
   Usa mockRejectedValueOnce como en las otras pruebas.

Capturas:
4. Los placeholders del formulario parecen datos reales («Techo solar Casa López», «12,5»): en la
   captura con errores, el campo vacío muestra un nombre y debajo dice «debe tener al menos 3
   caracteres». Usa placeholders que no se confundan con un valor.
5. En «Cambiar estado» el destino por defecto es el primero de la lista: en un proyecto completado
   sugiere «Pendiente» y en uno en progreso también. Que por defecto proponga el estado siguiente
   del orden (si existe) y si no, el anterior. Esto es solo el valor inicial del selector: la
   regla sigue sin estar en React.
6. «Hotel Mirador» está pendiente y sin instalador; si el coordinador lo pasa a En progreso la base
   responde 23514 (CHECK proyectos_estado_requiere_instalador) y la app muestra el mensaje
   genérico «Algún dato no cumple las reglas…». Traduce ese CHECK concreto a un mensaje que diga
   qué hacer, y agrega la prueba en errores.test.ts.

Mantén todo lo demás igual.
```

## Respuesta y verificación

- Respuesta literal: [v5-front/respuesta.md](v5-front/respuesta.md)
- Archivos cambiados sin editar: [v5-front/src/](v5-front/src/)
- Verificación: [v5-front/verificacion.txt](v5-front/verificacion.txt)
