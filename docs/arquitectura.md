# Arquitectura de MemoraTag

## Enfoque

El backend será un **monolito modular con arquitectura hexagonal**: una sola aplicación desplegable, dividida en módulos de negocio con responsabilidades y contratos definidos. No se utilizarán microservicios.

La arquitectura busca limitar el impacto de los cambios y mantener las reglas de negocio independientes de los proveedores y frameworks. La aplicación móvil y la web se organizarán por funcionalidades, sin necesidad de replicar todas las capas del backend.

## Componentes

```text
Aplicación móvil                         Plataforma web
├── Interfaz                             └── Interfaz de gestión
├── Base de datos y archivos locales               │
├── Lectura y escritura QR/NFC                     │
└── Sincronización                                 │
              │                                    │
              └──────────────┬─────────────────────┘
                             ▼
                  Backend monolítico modular
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
       PostgreSQL en Supabase    Supabase Storage
```

La aplicación móvil permite trabajar localmente sin cuenta ni conexión. La web gestiona los datos sincronizados de una cuenta y ofrece vistas públicas de objetos sin exigir cuenta ni instalar la aplicación. Supabase Auth proporciona autenticación; el backend aplica las reglas de negocio y autorización.

## Módulos del backend

- **Identidad y acceso:** cuentas, autenticación y autorización.
- **Memoria de objetos:** objetos, eventos, visibilidad e identificadores QR/NFC.
- **Archivos:** metadatos y acceso al almacenamiento de fotografías y documentos.

La sincronización coordinará las operaciones entre el móvil y el backend. Su ubicación definitiva se definirá al diseñar el flujo offline, sin crear un módulo independiente si no aporta valor.

Cada módulo separa dominio, casos de uso y puertos, adaptadores de entrada —como controladores de API— y adaptadores de salida —como persistencia o almacenamiento—. Las reglas de negocio no dependen directamente de frameworks o proveedores; los módulos colaboran mediante interfaces públicas y evitan acceder a detalles internos de otros módulos.

## Funcionamiento local y sincronización

- La app móvil funciona sin cuenta y sin conexión, con datos y archivos guardados en el dispositivo.
- Al crear una cuenta, el usuario puede asociar y sincronizar sus datos locales.
- La app indica qué cambios y archivos están pendientes de sincronización.
- El identificador utilizado por QR o NFC debe seguir asociado al mismo objeto tras sincronizarlo.
- Los reintentos, conflictos, recuperación y protección de datos locales se detallarán en el diseño de sincronización.

## Seguridad y privacidad

- QR y NFC identifican el objeto; no contienen su historial privado.
- Los objetos son privados por defecto. Los marcados como públicos se publican automáticamente al sincronizarse con una cuenta; el acceso público permite consultar, no editar.
- Los objetos privados requieren autenticación y autorización para su acceso remoto.
- El backend aplica las reglas de acceso; la interfaz no constituye una barrera de seguridad suficiente.
- Las credenciales administrativas de Supabase nunca se incluyen en el móvil ni en la web.
- Los objetos se archivan y los registros de la base central utilizan eliminación lógica; las consultas habituales excluyen los registros eliminados.

## Tecnologías

| Área | Tecnología |
|---|---|
| Repositorio y paquetes | Monorepositorio con pnpm workspaces |
| Lenguaje | TypeScript |
| Móvil y navegación | Expo, React Native y Expo Router |
| Datos locales | SQLite mediante expo-sqlite |
| Archivos locales y selección | expo-file-system y expo-document-picker |
| QR y cámara | expo-camera y react-native-qrcode-svg |
| NFC | react-native-nfc-manager para lectura y escritura |
| Web | Next.js, React, Tailwind CSS y shadcn/ui |
| Backend | NestJS con arquitectura hexagonal |
| Base de datos central | PostgreSQL en Supabase |
| Autenticación | Supabase Auth |
| Archivos remotos | Supabase Storage |
| Validación | Zod |

La integración NFC utiliza código nativo y requiere una compilación de desarrollo compatible; no se asume que funcione en Expo Go. La elección de estas tecnologías no implica que todas estén integradas todavía.

## Organización del repositorio

```text
proyecto/                  # Workspace independiente del prototipo
├── apps/
│   ├── mobile/            # Nueva aplicación Expo
│   ├── web/               # Plataforma Next.js
│   └── backend/           # Backend NestJS
├── packages/              # Compartidos cuando sean necesarios
├── package.json
└── pnpm-workspace.yaml
```

El workspace y las carpetas están preparados, pero las aplicaciones aún no están inicializadas. El prototipo existente permanece intacto en la raíz y conserva su propio `package.json` y lockfile. El móvil y la web se organizarán por funcionalidades, separando interfaz, lógica y acceso a datos sin imponerles todas las capas del backend. La implementación debe priorizar el flujo principal y una web sencilla para conservar tiempo para la evaluación del artículo.
