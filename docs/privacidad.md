# Privacidad y acceso

## Principios

- Los objetos son privados por defecto y el usuario decide si los hace públicos.
- Un QR o NFC identifica el objeto; no concede permisos de edición.
- Las reglas de acceso se aplican en el backend, no solo en la interfaz.
- La publicación debe advertir que el historial y los archivos pueden contener información personal o sensible.

## Uso sin cuenta

Los objetos, eventos y archivos creados sin cuenta permanecen en el dispositivo. No están disponibles para otros dispositivos mientras no se vincule una cuenta y se sincronicen.

Si se pierden los datos locales antes de sincronizarlos, no se garantiza su recuperación. La primera versión no incluirá un bloqueo adicional mediante PIN o biometría; la protección del dispositivo depende de los mecanismos disponibles en el sistema operativo.

## Objetos públicos

Un objeto marcado como público se publica automáticamente al sincronizar con una cuenta. Cualquier persona con acceso a su identificador puede consultar su información publicada sin poder modificarla. La plataforma web ofrecerá una vista pública accesible desde un navegador, sin cuenta ni instalación de la aplicación.

Los eventos y archivos siguen la visibilidad del objeto en la primera versión. El propietario puede volver a marcarlo como privado.

Hacer privado o archivar un objeto impide nuevos accesos públicos desde el servidor, pero no recupera las copias que otras personas hayan descargado mientras era público.

## Objetos privados

Para consultar un objeto privado desde el servidor es necesario iniciar sesión y contar con autorización. En la primera versión, el acceso privado corresponde al propietario.

Sin conexión, el usuario puede consultar los datos que ya estén guardados en su dispositivo. Los cambios remotos de permisos o visibilidad no se conocen hasta volver a sincronizar.

## QR y NFC

El QR y la etiqueta NFC contienen un identificador del objeto, no su historial ni sus archivos. Cualquier persona con acceso físico puede leer o copiar ese identificador; la privacidad se protege mediante los controles de acceso a los datos.

La lectura de un QR o NFC privado sin autorización no debe revelar su contenido. Los identificadores de objetos públicos deben permitir abrir la vista web pública desde un navegador.

## Archivos

Los archivos heredan la visibilidad del objeto y tienen un límite de 5 MB cada uno. El backend valida permisos, tamaño y formatos admitidos.

El almacenamiento remoto debe impedir el acceso no autorizado a los archivos privados, incluidos sus enlaces de descarga.

## Archivo y eliminación lógica

Los objetos se archivan en lugar de eliminarse inmediatamente. Los registros de la base central utilizan eliminación lógica y dejan de aparecer en las consultas habituales.

Los periodos de retención, la restauración y la eliminación definitiva de archivos quedan pendientes de definición.
