# Paquetes compartidos

- `contracts` (`@memoratag/contracts`): esquemas Zod y tipos compartidos entre backend y apps (roles, organizaciones, miembros, objetos de inventario, eventos, filtros y resumen). Implementado. Se compila con `pnpm --filter @memoratag/contracts build` (salida en `dist/`). El tipo de evento usa los valores reales de la app móvil (`issue`, no `incident`).
