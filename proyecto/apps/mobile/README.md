# Aplicación móvil

Nueva aplicación Expo y React Native, independiente del prototipo original que permanece en la raíz.

## Ejecutar

Desde `proyecto/`:

```bash
pnpm install
pnpm --filter @memoratag/mobile start
```

Abre la aplicación en un dispositivo o emulador compatible con Expo. Para comprobar los tipos: `pnpm --filter @memoratag/mobile typecheck`.

## Implementado

- Pantalla de bienvenida que guarda el nombre en el dispositivo y lo muestra en el saludo. El nombre no constituye una cuenta ni autentica al usuario.
- Crear, consultar y editar objetos, archivarlos y registrar eventos con nombre y descripción.
- Elegir el color de cada objeto al crearlo o editarlo. Cuando tiene foto, esta ocupa el fondo de su cabecera; sin foto, se muestra el color elegido.
- Añadir, cambiar o quitar la foto de portada de un objeto desde la cámara o la galería. Se guarda una copia local de hasta 5 MB; se admiten JPEG, PNG, WebP, HEIC y HEIF cuando el dispositivo los soporta.
- Registrar eventos de tipo nota, incidencia o mantenimiento, eligiendo su fecha; la historia se ordena por fecha del evento. Los eventos anteriores se conservan como notas con su fecha de creación.
- Editar el título, descripción, tipo y fecha de eventos, y cambiar o quitar su foto y documento.
- Añadir una foto opcional a un evento desde la cámara o la galería. Se conserva una copia local de hasta 5 MB y se muestra en la historia. Las fotos del objeto y de los eventos pueden abrirse a pantalla completa.
- Adjuntar un documento PDF, XLS o XLSX por evento, de hasta 5 MB. Se guarda una copia local y se puede abrir con una aplicación compatible (en iOS se utiliza el menú del sistema para abrir o compartir).
- Mostrar un QR de prueba y leerlo con la cámara o desde una imagen de la galería para abrir un objeto activo guardado en el mismo dispositivo. El QR contiene únicamente el identificador local, no la historia.
- Lectura y escritura NFC NDEF implementadas para Android mediante una compilación de desarrollo. Antes de escribir se advierte que se reemplazará el contenido; se comprueba capacidad y escritura y se relee la etiqueta. La lectura abre únicamente objetos activos guardados en el dispositivo. **Pendiente de prueba con dispositivo físico y etiquetas NTAG215.**
- Guardar objetos y eventos en SQLite en el dispositivo, sin cuenta ni conexión; los identificadores se generan localmente.
- Los objetos archivados y sus eventos permanecen en el dispositivo y dejan de mostrarse en la lista principal. Desde «Objetos archivados» se pueden restaurar con su historia y archivos.

Los datos locales se pierden si se eliminan los datos de la aplicación o se pierde el dispositivo. La persistencia todavía debe comprobarse en un dispositivo o emulador.

## Pendiente

Múltiples documentos por evento, validación NFC con hardware, inicio de sesión y creación de cuentas, backend, publicación y sincronización. Las opciones de cuenta son informativas y todavía no autentican ni crean usuarios. QR y NFC usan un formato local provisional: no son enlaces web públicos ni están pensados para etiquetas permanentes. La nueva app aún no sustituye todas las funciones del prototipo.

## NFC en Android

Expo Go no incorpora el módulo nativo de NFC; el resto de la app puede seguir ejecutándose con `pnpm --filter @memoratag/mobile start`. Para probar NFC se necesita un teléfono Android compatible, Android SDK y Java configurados, y una compilación de desarrollo:

```bash
cd proyecto/apps/mobile
pnpm exec expo run:android --device
pnpm start:dev
```

`expo run:android` genera archivos nativos dentro de la nueva app y puede instalar la compilación en el dispositivo conectado. En la pantalla de escaneo se puede elegir «Leer etiqueta NFC»; desde un objeto se puede escribir su etiqueta. Antes de escribir se reemplaza el contenido existente; no se bloquea la etiqueta permanentemente. Si la verificación falla, el contenido podría haber cambiado y debe leerse antes de reintentar. Solo se admiten etiquetas ya formateadas como NDEF; no se formatean automáticamente.

Las pruebas sin hardware se ejecutan con Node.js 22.6 o posterior: `pnpm --filter @memoratag/mobile test:nfc`. No sustituyen la validación física, que sigue pendiente. Para acceso remoto, el servidor de desarrollo debe anunciar una dirección accesible desde el teléfono; la compilación y la app deben corresponder a la misma instalación.
