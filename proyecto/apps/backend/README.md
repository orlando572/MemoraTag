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
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio para Storage (solo backend; nunca en web ni móvil). Obligatoria con `PERSISTENCE=postgres`. |
| `PORT` | Puerto HTTP (3100; la web usa 3000). |
| `CORS_ORIGIN` | Orígenes permitidos, separados por comas. |

## Base de datos

### Desarrollo local (Supabase CLI + Docker)

`supabase/config.toml` usa el rango de puertos **553xx** para convivir con otros proyectos Supabase locales (API 55321, Postgres 55322, Studio 55323, correo de pruebas 55324).

```bash
cd proyecto/apps/backend
npx supabase@2 start -x realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor
npx supabase@2 db reset    # reaplica las migraciones desde cero
npx supabase@2 stop        # detiene los contenedores
```

`.env` local: `SUPABASE_URL=http://127.0.0.1:55321`, `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres`, `PERSISTENCE=postgres`, `PORT=3100`.

### Proyecto Supabase remoto

Aplicar `supabase/migrations/0001_empresas_inventario.sql` y `0002_event_files.sql` (tabla `event_files` y bucket privado `event-files`; en local `npx supabase@2 migration up`) en el proyecto Supabase (SQL editor o CLI). Crea `profiles` (rellenada por trigger desde `auth.users`), `organizations`, `organization_members`, `objects` y `events`, con RLS activado y sin políticas: el acceso es solo mediante el backend con una conexión privilegiada.

## Implementado

- `identity`: guard Bearer con puerto `TokenVerifier` (adaptador `jose` + JWKS de Supabase) y directorio de usuarios.
- `organizations`: crear/listar organizaciones, listar/añadir (por email de usuario registrado)/cambiar rol/quitar miembros. Solo admin gestiona miembros; el último admin está protegido.
- `objects`: CRUD de objetos con filtros (`q`, `status`, `location`, `category`, `archived=true` para listar solo archivados), archivado lógico, restauración (`POST /objects/:id/restore`, solo admin, idempotente), autor de los eventos (`created_by_email`, en eventos y resumen), cambio de estado, eventos, resumen y exportación CSV.
- `files`: adjuntos de eventos (fotos JPEG/PNG/WEBP y documentos PDF/XLS/XLSX, máx. 5 MB). `POST /events/:eventId/files` (multipart, campo `file`; admin y member; valida MIME y firma de bytes; 409 si el objeto está archivado; 404 a no miembros), `GET /files/:fileId/url` (URL firmada, 300 s, solo miembros) y `DELETE /files/:fileId` (solo admin, eliminación lógica y borrado en Storage). `GET /objects/:id/events` incluye `files`. Almacenamiento en el bucket privado `event-files` de Supabase Storage (ruta `org/<org>/object/<obj>/event/<evento>/<fichero>`), con adaptador en memoria para tests.

Permisos: admin crea/edita/archiva objetos; member consulta, cambia estado y registra eventos. Un no miembro recibe 403 en rutas de organización y 404 en rutas de objeto.

Endpoints: `GET/POST /organizations`, `GET/POST /organizations/:orgId/members`, `PATCH/DELETE /organizations/:orgId/members/:userId`, `GET/POST /organizations/:orgId/objects`, `GET /organizations/:orgId/objects.csv`, `GET /organizations/:orgId/summary`, `GET/PATCH /objects/:id`, `POST /objects/:id/archive`, `PATCH /objects/:id/status`, `GET/POST /objects/:id/events`.

Verificado manualmente contra Supabase local (Auth real + Postgres): permisos por rol, filtros, resumen, CSV, último admin y archivado. Los tests automáticos usan adaptadores en memoria.

## Previsto / no implementado

- Invitaciones a usuarios no registrados, auditoría y paginación.
- La comprobación del último admin no es transaccional (posible carrera entre dos admins).
- En modo `memory`, un usuario solo es localizable por email tras su primera petición autenticada.
