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

- Crear, consultar y editar objetos, archivarlos y registrar eventos con nombre y descripción.
- Añadir, cambiar o quitar la foto de portada de un objeto desde la cámara o la galería. Se guarda una copia local de hasta 5 MB; se admiten JPEG, PNG, WebP, HEIC y HEIF cuando el dispositivo los soporta.
- Registrar eventos de tipo nota, incidencia o mantenimiento, eligiendo su fecha; la historia se ordena por fecha del evento. Los eventos anteriores se conservan como notas con su fecha de creación.
- Editar el título, descripción, tipo y fecha de eventos, y cambiar o quitar su foto y documento.
- Añadir una foto opcional a un evento desde la cámara o la galería. Se conserva una copia local de hasta 5 MB y se muestra en la historia. Las fotos del objeto y de los eventos pueden abrirse a pantalla completa.
- Adjuntar un documento PDF, XLS o XLSX por evento, de hasta 5 MB. Se guarda una copia local y se puede abrir con una aplicación compatible (en iOS se utiliza el menú del sistema para abrir o compartir).
- Mostrar un QR de prueba y leerlo con la cámara o desde una imagen de la galería para abrir un objeto activo guardado en el mismo dispositivo. El QR contiene únicamente el identificador local, no la historia.
- Guardar objetos y eventos en SQLite en el dispositivo, sin cuenta ni conexión; los identificadores se generan localmente.
- Los objetos archivados y sus eventos permanecen en el dispositivo y dejan de mostrarse en la lista principal. Desde «Objetos archivados» se pueden restaurar con su historia y archivos.

Los datos locales se pierden si se eliminan los datos de la aplicación o se pierde el dispositivo. La persistencia todavía debe comprobarse en un dispositivo o emulador.

## Pendiente

Múltiples documentos por evento, NFC, cuentas, backend, publicación y sincronización. Los QR actuales usan un formato local provisional: no son enlaces web públicos ni están pensados para etiquetas permanentes. La nueva app aún no sustituye todas las funciones del prototipo.
