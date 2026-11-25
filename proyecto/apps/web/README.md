# Web de empresas (`@memoratag/web`)

Centro de gestión de una empresa (organización): inventario, miembros y resumen. Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + componentes estilo shadcn/ui (Radix, lucide-react). Tipografías Fraunces (títulos) y DM Sans (texto) con `next/font/google`.

## Arranque

```bash
cd proyecto
pnpm install
pnpm --filter @memoratag/contracts build          # la web consume el paquete compilado
cp apps/web/.env.example apps/web/.env.local      # y rellena la anon key
pnpm --filter @memoratag/web dev                  # http://localhost:3000
```

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`. Necesita el backend (`apps/backend`, puerto 3100) y un proyecto Supabase (local: `npx supabase@2 status -o env` en `apps/backend` para obtener la anon key).

## Variables (`.env.example`)

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon). Nunca claves de servicio. |
| `NEXT_PUBLIC_API_URL` | URL base del backend. |

## Estructura

- `src/app/`: rutas. `login` (pública) y el grupo `(app)` con `resumen`, `inventario`, `miembros` (solo admin) y `ajustes`.
- `src/proxy.ts`: protege las rutas privadas y refresca la sesión (en Next 16 `middleware` se llama `proxy`).
- `src/features/`: `auth`, `organization`, `shell`, `theme`, y metadatos de `events` e `inventory`.
- `src/components/ui/`: botón, campos, tarjeta, badge, sheet, estado vacío, cabecera de página.
- `src/lib/api.ts`: cliente tipado del backend (Bearer con el `access_token` de Supabase, respuestas validadas con `@memoratag/contracts`, mensajes en español para 401/403/404/409). `api-server.ts` y `api-client.ts` aportan el token desde servidor o navegador.
- `src/app/globals.css`: tokens `light`/`dark` copiados de `apps/mobile/src/ui/tokens.ts` y mapeados a las variables de shadcn. `primary` es el único color de acción; danger/success/warning solo indican estado (siempre con icono y texto).

## Implementado

- Inicio de sesión y creación de cuenta (email + contraseña), cierre de sesión, rutas protegidas.
- Pantalla «Crea tu empresa» si el usuario no tiene organización; si tiene, se usa la primera (sin selector multi-empresa).
- Armazón: barra lateral con nombre de empresa y rol, menú en sheet en móvil, «Miembros» solo para admin.
- Ajustes: tema Sistema/Claro/Oscuro (localStorage), datos de la cuenta, cerrar sesión.
- Inventario: tabla con búsqueda, filtros por estado, ubicación y categoría (en la URL), orden por columna, exportación CSV, alta y edición (admin), ficha del objeto con cambio de estado, archivado (admin), QR compatible con la app y etiqueta imprimible.
- Eventos: línea de tiempo y formulario con los 6 tipos.
- Adjuntos de eventos: fotos (JPG, PNG, WEBP) y documentos (PDF, Excel) de hasta 5 MB. Subida múltiple con validación en cliente, estado por archivo y reintento; miniaturas con visor y URL firmada renovable; documentos con botón «Abrir»; «Quitar archivo» solo para admin.
- Miembros (admin): alta por correo, cambio de rol y baja, con protección del último admin.
- Resumen: indicadores, incidencias abiertas y actividad reciente.

## Previsto (no implementado)

- Previsualización de PDF dentro de la página y progreso de subida por bytes.
- Selector de varias empresas, recuperación de contraseña, invitaciones a personas sin cuenta.
