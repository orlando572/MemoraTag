# Backend (`@memoratag/backend`)

Monolito modular NestJS con arquitectura hexagonal. Cada módulo de `src/modules/` tiene `domain/`, `application/` (casos de uso y puertos), `adapters/in/http/` y `adapters/out/{postgres,memory}/`.

## Arranque

```bash
cd proyecto
pnpm install
pnpm --filter @memoratag/contracts build   # el backend consume el paquete compilado
cp apps/backend/.env.example apps/backend/.env
pnpm --filter @memoratag/backend dev       # o: build && start
```

Scripts: `dev`, `build`, `start`, `test`, `test:e2e`, `typecheck`, `lint` (comprobación estricta de tipos y variables sin usar).

## Variables (`.env.example`)

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | Obligatoria. Se usa `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` para verificar el JWT. |
| `DATABASE_URL` | Cadena Postgres; obligatoria con `PERSISTENCE=postgres`. |
| `PERSISTENCE` | `memory` (por defecto, datos volátiles) o `postgres`. |
| `PORT` | Puerto HTTP (3000). |
| `CORS_ORIGIN` | Orígenes permitidos, separados por comas. |

## Base de datos

Aplicar `supabase/migrations/0001_empresas_inventario.sql` en el proyecto Supabase (SQL editor o CLI). Crea `profiles` (rellenada por trigger desde `auth.users`), `organizations`, `organization_members`, `objects` y `events`, con RLS activado y sin políticas: el acceso es solo mediante el backend con una conexión privilegiada.

## Implementado

- `identity`: guard Bearer con puerto `TokenVerifier` (adaptador `jose` + JWKS de Supabase) y directorio de usuarios.
- `organizations`: crear/listar organizaciones, listar/añadir (por email de usuario registrado)/cambiar rol/quitar miembros. Solo admin gestiona miembros; el último admin está protegido.
- `objects`: CRUD de objetos con filtros (`q`, `status`, `location`, `category`), archivado lógico, cambio de estado, eventos, resumen y exportación CSV.

Permisos: admin crea/edita/archiva objetos; member consulta, cambia estado y registra eventos. Un no miembro recibe 403 en rutas de organización y 404 en rutas de objeto.

Endpoints: `GET/POST /organizations`, `GET/POST /organizations/:orgId/members`, `PATCH/DELETE /organizations/:orgId/members/:userId`, `GET/POST /organizations/:orgId/objects`, `GET /organizations/:orgId/objects.csv`, `GET /organizations/:orgId/summary`, `GET/PATCH /objects/:id`, `POST /objects/:id/archive`, `PATCH /objects/:id/status`, `GET/POST /objects/:id/events`.

## Previsto / no implementado

- Adaptadores Postgres sin probar contra una base real (los tests usan memoria).
- Subida de fotos/documentos de eventos, invitaciones a usuarios no registrados, auditoría y paginación.
- La comprobación del último admin no es transaccional (posible carrera entre dos admins).
- En modo `memory`, un usuario solo es localizable por email tras su primera petición autenticada.
