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
- Ajustes para cambiar el nombre, consultar el espacio de fotos y documentos, el estado NFC y la versión de la aplicación. El flujo de respaldo está implementado, pero aún no se ha validado la recuperación en otra instalación.
- Retroalimentación multimodal: avisos breves y diálogos acompañados de vibración (éxito, advertencia y error) al guardar, archivar, escanear, leer o escribir NFC y al validar campos. La pantalla NFC muestra una animación de «acerca la etiqueta», indica dónde colocarla y confirma el resultado. Las animaciones respetan la opción del sistema «reducir movimiento».
- Crear, consultar y editar objetos, archivarlos y registrar eventos con nombre y descripción.
- Elegir el color de cada objeto al crearlo o editarlo. Cuando tiene foto, esta ocupa el fondo de su cabecera; sin foto, se muestra el color elegido.
- Añadir, cambiar o quitar la foto de portada de un objeto desde la cámara o la galería. Se guarda una copia local de hasta 5 MB; se admiten JPEG, PNG, WebP, HEIC y HEIF cuando el dispositivo los soporta.
- Registrar eventos de tipo nota, incidencia o mantenimiento, eligiendo su fecha; la historia se ordena por fecha del evento. Los eventos anteriores se conservan como notas con su fecha de creación.
- Editar el título, descripción, tipo y fecha de eventos, y cambiar o quitar su foto y documento.
- Eliminar eventos tras una confirmación. El borrado es definitivo en el dispositivo (no se archiva ni se puede deshacer) y elimina su foto y documento locales cuando ningún otro registro los utiliza. Cómo se reflejará este borrado al sincronizar con la eliminación lógica de la base central todavía está pendiente de definir.
- Añadir una foto opcional a un evento desde la cámara o la galería. Se conserva una copia local de hasta 5 MB y se muestra en la historia. Las fotos del objeto y de los eventos pueden abrirse a pantalla completa.
- Adjuntar un documento PDF, XLS o XLSX por evento, de hasta 5 MB. Se guarda una copia local y se puede abrir con una aplicación compatible (en iOS se utiliza el menú del sistema para abrir o compartir).
- Cada objeto tiene un QR con el enlace `memoratag://objeto/<id>`. Se puede leer desde «Escanear» (cámara o imagen de la galería) o con la cámara del sistema en Android, que abre la app directamente. La pantalla del QR permite compartirlo o imprimirlo como imagen PNG. El QR solo contiene el identificador, no la historia, y únicamente abre objetos guardados en el mismo dispositivo. Los QR del formato anterior (`memoratag-local:v1:`) se siguen aceptando.
- Lectura y escritura NFC NDEF para Android mediante una compilación de desarrollo. La etiqueta guarda un registro URI estándar con el mismo enlace del QR, y la app registra `NDEF_DISCOVERED` (plugin `plugins/with-nfc-intent.js`): al acercar la etiqueta se abre el objeto aunque la app esté cerrada. Antes de escribir se advierte que se reemplazará el contenido, se comprueba la capacidad y la escritura y se relee la etiqueta. El objeto muestra si tiene una etiqueta vinculada y desde cuándo; el dato se conserva en los respaldos. También se leen las etiquetas de texto de la versión anterior. **Pendiente de prueba con dispositivo físico y etiquetas NTAG215.**
- Guardar objetos y eventos en SQLite en el dispositivo, sin cuenta ni conexión; los identificadores se generan localmente.
- Los objetos archivados y sus eventos permanecen en el dispositivo y dejan de mostrarse en la lista principal. Desde «Objetos archivados» se pueden restaurar con su historia y archivos.
- Si un QR o una etiqueta corresponde a un objeto archivado, se ofrece ir a «Objetos archivados». Si no existe en el dispositivo, se explica que pudo crearse en otro teléfono.
- Accesibilidad: contraste de texto WCAG AA (4.5:1), áreas táctiles de al menos 48 dp, encabezados y etiquetas descriptivas para TalkBack, anuncios de los estados NFC y alturas mínimas en lugar de fijas para la letra grande del sistema. **Pendiente de revisar con TalkBack y letra grande en un dispositivo físico.**
- Tutorial de tres pasos, que se puede saltar, tras introducir el nombre (qué es MemoraTag, cómo usar QR/NFC y dónde se guardan los datos). Se puede volver a ver desde Ajustes, que incluye además una sección de ayuda. El inicio vacío ofrece crear el primer objeto.

Los datos locales se pierden si se eliminan los datos de la aplicación o se pierde el dispositivo. La persistencia todavía debe comprobarse en un dispositivo o emulador.

## Pendiente

Validación de recuperación de respaldos en otro dispositivo, tema oscuro, múltiples documentos por evento, validación NFC con hardware, inicio de sesión y creación de cuentas, backend, publicación y sincronización. Las opciones de cuenta son informativas y todavía no autentican ni crean usuarios. QR y NFC usan el enlace de la app `memoratag://objeto/<id>`, no un enlace web público: sin la app y sin los datos en el teléfono no muestran nada. Cuando exista la consulta pública, el formato tendrá que pasar a una URL web. La nueva app aún no sustituye todas las funciones del prototipo.

Los respaldos se comparten como JSON sin cifrar y contienen información privada. Cada archivo está limitado a 5 MiB, el total de archivos a 20 MiB y el documento a 32 MiB. La importación valida referencias e integridad, ofrece una decisión global para los conflictos y aplica los cambios en una transacción; no elimina los archivos originales al reemplazar registros. La preparación de la importación también necesita que los datos actuales estén dentro de los límites y que sus archivos estén disponibles. El menú de compartir no informa si la copia se guardó o se canceló, por lo que no se registra una fecha de exportación confirmada. **Todavía falta validar la exportación y la recuperación completa en instalaciones reales; no uses esta función como única copia de datos importantes.**

## NFC en Android

Expo Go no incorpora el módulo nativo de NFC; el resto de la app puede seguir ejecutándose con `pnpm --filter @memoratag/mobile start`. Para probar NFC se necesita un teléfono Android compatible, Android SDK y Java configurados, y una compilación de desarrollo:

```bash
cd proyecto/apps/mobile
pnpm exec expo run:android --device
pnpm start:dev
```

`expo run:android` genera archivos nativos dentro de la nueva app y puede instalar la compilación en el dispositivo conectado. En la pantalla de escaneo se puede elegir «Leer etiqueta NFC»; desde un objeto se puede escribir su etiqueta. Antes de escribir se reemplaza el contenido existente; no se bloquea la etiqueta permanentemente. Si la verificación falla, el contenido podría haber cambiado y debe leerse antes de reintentar. Solo se admiten etiquetas ya formateadas como NDEF; no se formatean automáticamente.

Las pruebas sin hardware se ejecutan con Node.js 22.6 o posterior: `pnpm --filter @memoratag/mobile test:nfc`. No sustituyen la validación física, que sigue pendiente. Para acceso remoto, el servidor de desarrollo debe anunciar una dirección accesible desde el teléfono; la compilación y la app deben corresponder a la misma instalación.

### Lista de validación en dispositivo

Con la compilación de desarrollo instalada en un Android con NFC y etiquetas NTAG215:

1. Crear un objeto, abrir «Vincular NFC» y escribir la etiqueta: debe vibrar, mostrar el check y el objeto debe indicar «NFC vinculada».
2. Desde «Escanear», tocar «Leer etiqueta NFC» y acercarla: abre el objeto.
3. Cerrar la app por completo y acercar la etiqueta con el teléfono desbloqueado: la app se abre en el objeto.
4. Compartir el QR, abrir la imagen en otro dispositivo y escanearla con la cámara del sistema del teléfono: abre el objeto.
5. Archivar el objeto y repetir 2 y 4: debe ofrecer «Ver objetos archivados».
6. Leer una etiqueta escrita con la versión anterior (formato de texto): debe seguir abriendo el objeto.
7. Recorrer los pasos anteriores con TalkBack activado y con el tamaño de letra del sistema al máximo.
