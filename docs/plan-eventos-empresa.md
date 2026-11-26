# Plan: resolver y editar eventos de empresa, y pulido del modo empresa móvil

> **Estado: previsto, no implementado.** Este documento describe la siguiente mejora acordada. Su implementación quedó a medias y no forma parte de esta entrega.

## Contexto

En el modo personal, cada evento se puede editar y cada incidencia tiene «Marcar resuelta / Reabrir». En el modo empresa (móvil y web) los eventos solo se crean, y resolver una incidencia consiste en crear un evento «Resuelto» que no queda vinculado a la incidencia. Por eso el contador de «incidencias abiertas» es aproximado.

La auditoría del móvil en un teléfono real, recorrido como `admin`, encontró además 7 puntos de pulido en el modo empresa. El modo personal no tuvo hallazgos.

## Decisiones

| Acción | `member` (trabajador) | `admin` |
|---|---|---|
| Marcar resuelta / Reabrir una incidencia | Sí | Sí |
| Editar un evento | Solo los suyos | Cualquiera |
| Eliminar un evento | No | Sí, con confirmación (borrado lógico) |
| Ver la marca «Editado» | Sí | Sí |

- Al resolver se guarda quién y cuándo («Resuelta por … · 14:32»).
- El contador de incidencias abiertas pasa a ser exacto.
- El tipo «Resuelto» desaparece del formulario de creación. Los eventos antiguos de ese tipo se siguen mostrando como «Incidencia resuelta».
- Móvil y web siguen el mismo patrón que el modo personal.

## Contrato del backend

- Migración `0004_eventos_resolver_editar.sql`. Añade a `events` las columnas `resolved_at`, `resolved_by`, `edited_at`, `edited_by` y `deleted_by`. Se aplica con `migration up`.
- `ObjectEvent` incorpora los campos opcionales `resolved_at`, `resolved_by_email` y `edited_at`.
- Endpoints:
  - `POST /events/:id/resolve` y `POST /events/:id/reopen`: `admin` y `member`; solo para incidencias (otro tipo devuelve 400); objeto archivado, 409.
  - `PATCH /events/:id` con `{ title?, description?, event_date? }`: lo puede usar el autor o un `admin`; el resto recibe 403.
  - `DELETE /events/:id`: solo `admin`; borrado lógico; responde 204.
- `open_incidents` = incidencias no borradas con `resolved_at` nulo, en objetos activos.
- Crear un evento de tipo `resolved` devuelve 400.

## Pulido del modo empresa móvil

1. Contadores de estado del inicio en dos filas, sin scroll horizontal oculto.
2. «De baja» con un icono distinto del de archivar (`ban-outline`).
3. La ficha de empresa sigue el patrón de la ficha personal:
   - botón fijo «Registrar evento»;
   - píldoras «Código QR» y «Etiqueta NFC»;
   - resumen de incidencias.
4. La historia muestra la hora y el autor.
5. En Ajustes → «Acerca de», con sesión de empresa, no se dice que los datos están «solo en este teléfono».
6. En la lista de empresa, el icono NFC solo aparece cuando la etiqueta está vinculada.
7. Texto unificado «Incidencia resuelta».

## Web

En la ficha del objeto:
- «Marcar resuelta / Reabrir» y «Resuelta por …»;
- editar eventos propios (o cualquiera, si es `admin`);
- eliminar, solo `admin`, con confirmación;
- marca «Editado»;
- el tipo «Resuelto» sale del formulario.

## Verificación prevista

- Backend: tests unitarios y e2e de permisos (resolver, editar lo propio y lo ajeno, eliminar solo `admin`) y del contador exacto, más una prueba contra Supabase local.
- Web: recorrido con Playwright.
- Móvil: recorrido en un teléfono real con capturas antes y después de los 7 puntos.
