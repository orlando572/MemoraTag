# MemoraTag

MemoraTag es una aplicación en desarrollo para conservar la memoria digital de objetos físicos. Su objetivo es facilitar la consulta y el registro de acontecimientos mediante una línea de tiempo accesible desde el objeto mediante QR y NFC.

El proyecto apoya un artículo de investigación centrado en el diseño y la evaluación de una interfaz móvil orientada a eventos para usuarios cotidianos.

## Alcance previsto

- Crear objetos y registrar notas, incidencias, mantenimientos, fotografías y archivos de hasta 5 MB.
- Identificar objetos mediante QR y leer y escribir etiquetas NFC.
- Usar la app móvil sin conexión y sin cuenta, con sincronización posterior al vincular una cuenta.
- Mantener los objetos privados por defecto o publicarlos para consulta desde un navegador.
- Gestionar objetos y eventos desde una plataforma web sencilla.

La gestión empresarial avanzada queda fuera de la primera versión. Consulta [visión y alcance](docs/vision-y-alcance.md) para más detalles.

## Estado actual: prototipo

Actualmente solo existe un prototipo frontend móvil con datos en memoria. Las funcionalidades anteriores son objetivos del proyecto, no capacidades ya implementadas. En el prototipo se puede:

- Crear, editar y eliminar objetos.
- Registrar acontecimientos en la historia de cada objeto.
- Añadir imágenes desde la cámara o la galería.
- Generar un código QR y escanearlo para abrir la memoria correspondiente.
- Recorrer el flujo con objetos y eventos de demostración.

## Tecnologías del prototipo

- Expo y React Native para la aplicación móvil.
- React y TypeScript para la interfaz y los modelos de datos.
- Expo Router para la navegación basada en archivos.
- React Context y estado en memoria para gestionar los datos del prototipo.
- Expo Camera, Expo Image Picker y react-native-qrcode-svg para cámara, imágenes y códigos QR.
- pnpm y ESLint para la gestión de dependencias y el análisis de código.

La arquitectura prevista incorpora un monorepositorio con app móvil Expo, web Next.js con shadcn/ui y backend NestJS como monolito modular hexagonal, además de SQLite local y Supabase para PostgreSQL, autenticación y archivos. Estos componentes aún no están integrados; ver [arquitectura](docs/arquitectura.md).

## Requisitos

- Node.js y pnpm instalados.
- Expo Go en un dispositivo Android o un emulador Android para seguir el flujo de prueba documentado.

## Instalación y ejecución

```bash
pnpm install
pnpm start
```

Abre el proyecto con Expo Go o inicia un emulador Android desde la terminal de Expo. También están disponibles los comandos `pnpm android`, `pnpm ios` y `pnpm web`; el flujo de prueba documentado se centra en Android.

Para ejecutar el análisis estático:

```bash
pnpm lint
```

## Flujo de prueba

1. En la pantalla de acceso, pulsa **Continuar**. No se requieren credenciales reales.
2. Abre **Bicicleta** para recorrer su historia.
3. Registra un evento y comprueba que aparece en la historia.
4. Crea un objeto para ver su QR.
5. En **Escanear QR**, concede acceso a la cámara y escanea un QR creado por la aplicación. También puedes usar el código de demostración.

## Estructura

El prototipo existente permanece intacto en la raíz. El desarrollo nuevo se realizará en carpetas separadas, sin trasladar ni sobrescribir el prototipo:

```text
app/                 Pantallas y rutas de Expo Router
components/          Componentes visuales compartidos
features/memories/   Modelos y estado de objetos y eventos
proyecto/            Workspace separado para las nuevas apps y el backend
docs/                Documentación del proyecto
```

El workspace en `proyecto/` contiene carpetas reservadas para móvil, web y backend; las aplicaciones nuevas aún no están inicializadas. Mantiene su configuración separada del `package.json` y la ejecución del prototipo.

## Estado y limitaciones

- Los datos se almacenan únicamente en memoria y se pierden al reiniciar la aplicación.
- La pantalla de acceso es una maqueta: no autentica usuarios.
- Los QR se buscan entre los objetos disponibles en el estado local; no se sincronizan entre dispositivos o sesiones.
- El botón de impresión muestra una confirmación simulada y no imprime el código.
- Todavía no hay backend, base local persistente ni servicios de Supabase conectados. El NFC, los archivos adjuntos, la sincronización y la plataforma web prevista aún no están implementados.

## Documentación

- [Visión y alcance](docs/vision-y-alcance.md)
- [Arquitectura y tecnologías](docs/arquitectura.md)
- [Datos y sincronización](docs/datos-y-sincronizacion.md)
- [Privacidad y acceso](docs/privacidad.md)
- [Evaluación](docs/evaluacion.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
